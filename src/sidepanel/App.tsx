import { useCallback, useEffect, useState } from 'react';
import './styles.css';
import type { ExecutionRun, Workflow, WorkflowStep } from '../shared/types';

interface RecordingStateResponse {
  success: boolean;
  isRecording: boolean;
  stepCount: number;
}

interface ProgressMessage {
  type?: string;
  current?: number;
  total?: number;
}

function sendMessage<T>(message: Record<string, unknown>): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response as T | undefined);
    });
  });
}

const relativeTime = (timestamp: number): string => {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

/**
 * Human-readable description of a recorded step, used in the detail view
 */
const describeStep = (step: WorkflowStep): string => {
  const target = step.target?.fingerprint;
  const subject = target ? (target.ariaLabel || target.text || target.name || target.tag || 'element') : 'page';
  switch (step.type) {
    case 'click':
      return `Click ${subject}`;
    case 'type':
      return step.input?.isSensitive
        ? 'Type sensitive value (kept empty for safety)'
        : `Type "${step.input?.value ?? ''}" into ${subject}`;
    case 'select':
      return `Select "${step.input?.value ?? ''}"`;
    case 'wait':
      return `Wait ${((step.wait?.timeout ?? 1000) / 1000).toFixed(1)}s`;
    case 'navigate':
      return `Navigate to ${subject}`;
    case 'scroll':
      return `Scroll to ${subject}`;
    default:
      return step.type;
  }
};

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fp-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(62 214 166)" />
          <stop offset="100%" stopColor="rgb(23 141 106)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="26" height="26" rx="9" fill="url(#fp-mark)" />
      <path
        d="M6.5 14h3l2.2-5 3.6 10 2.2-5h4"
        stroke="rgb(9 20 16)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function RecordIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <circle cx="7" cy="7" r="5" fill="currentColor" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <rect x="1.5" y="1.5" width="9" height="9" rx="2.5" fill="currentColor" />
    </svg>
  );
}

function RunIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M3 1.8v8.4c0 .5.55.8.98.53l6.1-4.2a.63.63 0 0 0 0-1.06l-6.1-4.2A.63.63 0 0 0 3 1.8Z" fill="currentColor" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path
        d="M2.5 3.5h9M5.7 3.5V2.4c0-.5.4-.9.9-.9h.8c.5 0 .9.4.9.9v1.1M3.8 3.5l.5 7.6c0 .7.6 1.3 1.3 1.3h2.8c.7 0 1.3-.6 1.3-1.3l.5-7.6M5.8 6v4M8.2 6v4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <path d="m3 1.5 4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d="M7 1.8 13 12H1L7 1.8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
      <path d="M7 5.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="7" cy="10.3" r="0.8" fill="currentColor" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <circle cx="7" cy="7" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="m4.4 7.2 1.8 1.8 3.4-3.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function FailureIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <circle cx="7" cy="7" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="m4.8 4.8 4.4 4.4m0-4.4-4.4 4.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function WorkflowsEmptyIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
      <rect x="3" y="8" width="20" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="13" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M9 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function HistoryEmptyIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
      <circle cx="13" cy="13" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M13 7v6l4 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const App: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executionRuns, setExecutionRuns] = useState<ExecutionRun[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workflows' | 'history'>('workflows');
  const [error, setError] = useState<string | null>(null);
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null);
  const [runProgress, setRunProgress] = useState<{ current: number; total: number } | null>(null);
  const [openWorkflowId, setOpenWorkflowId] = useState<string | null>(null);
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<Record<string, ExecutionRun | undefined>>({});
  const [startUrl, setStartUrl] = useState('');
  const [namingWorkflow, setNamingWorkflow] = useState<Workflow | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  const loadWorkflows = useCallback(async () => {
    const response = await sendMessage<{ success: boolean; workflows: Workflow[] }>({
      type: 'LIST_WORKFLOWS'
    });
    if (response?.success) {
      setWorkflows(response.workflows);
      return true;
    }
    return false;
  }, []);

  const loadExecutionRuns = useCallback(async () => {
    const response = await sendMessage<{ success: boolean; runs: ExecutionRun[] }>({
      type: 'LIST_RUNS'
    });
    if (response?.success) {
      setExecutionRuns(response.runs);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    void Promise.all([loadWorkflows(), loadExecutionRuns()])
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [loadWorkflows, loadExecutionRuns]);

  // Prefill the start-page field with the URL of the active tab
  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;
    void sendMessage<{ success: boolean; url: string }>({ type: 'GET_ACTIVE_TAB' }).then(response => {
      if (!cancelled && response?.success) {
        setStartUrl(response.url ?? '');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoading]);

  // Poll the recording state so the panel stays accurate while users browse
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const state = await sendMessage<RecordingStateResponse>({ type: 'GET_RECORDING_STATE' });
      if (state?.success && !cancelled) {
        setIsRecording(Boolean(state.isRecording));
        setStepCount(Number(state.stepCount ?? 0));
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  // Follow live run progress streamed from the content script
  useEffect(() => {
    const listener = (message: unknown) => {
      const msg = (message ?? {}) as ProgressMessage;
      if (msg.type === 'RUN_PROGRESS' && typeof msg.current === 'number') {
        setRunProgress({ current: msg.current, total: msg.total ?? 0 });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Load run detail (per-step diagnostics) when a history entry expands
  useEffect(() => {
    if (!openRunId) return;
    let cancelled = false;
    void (async () => {
      const response = await sendMessage<{ success: boolean; run: ExecutionRun | null }>({
        type: 'GET_RUN',
        id: openRunId
      });
      if (!cancelled && response?.success && response.run) {
        setRunDetails(prev => ({ ...prev, [openRunId]: response.run! }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openRunId]);

  const handleStartRecording = useCallback(async () => {
    setError(null);
    const response = await sendMessage<{ success: boolean; error?: string; message?: string }>({
      type: 'START_RECORDING',
      url: startUrl
    });
    if (response?.success) {
      setIsRecording(true);
      setStepCount(0);
    } else {
      setIsRecording(false);
      setError(response?.error ?? 'Failed to start recording');
    }
  }, [startUrl]);

  const handleStopRecording = useCallback(async () => {
    setError(null);
    const response = await sendMessage<{ success: boolean; error?: string; workflow?: Workflow }>({
      type: 'STOP_RECORDING'
    });
    if (response?.success) {
      setIsRecording(false);
      await loadWorkflows();
      setActiveTab('workflows');
      if (response.workflow) {
        setNamingWorkflow(response.workflow);
        setNameDraft(response.workflow.name);
      }
    } else {
      setError(response?.error ?? 'Failed to stop recording');
      setIsRecording(false);
    }
  }, [loadWorkflows]);

  const handleSaveWorkflowName = useCallback(async () => {
    if (!namingWorkflow) return;
    setError(null);
    const name = nameDraft.trim();
    if (!name) {
      setError('Give the workflow a name');
      return;
    }
    const response = await sendMessage<{ success: boolean; error?: string }>({
      type: 'SAVE_WORKFLOW',
      workflow: { ...namingWorkflow, name }
    });
    if (response?.success) {
      setNamingWorkflow(null);
      await loadWorkflows();
      setActiveTab('workflows');
    } else {
      setError(response?.error ?? 'Failed to save the workflow');
    }
  }, [namingWorkflow, nameDraft, loadWorkflows]);

  const handleExecuteWorkflow = useCallback(async (workflowId: string) => {
    setError(null);
    setRunningWorkflowId(workflowId);
    setRunProgress({ current: 0, total: 0 });
    try {
      const response = await sendMessage<{ success: boolean; error?: string }>({
        type: 'EXECUTE_WORKFLOW',
        workflowId
      });
      if (response?.success) {
        await Promise.all([loadWorkflows(), loadExecutionRuns()]);
        setActiveTab('history');
      } else {
        setError(response?.error ?? 'Failed to execute workflow');
        setRunProgress(null);
      }
    } finally {
      setRunningWorkflowId(null);
      setRunProgress(null);
    }
  }, [loadWorkflows, loadExecutionRuns]);

  const handleDeleteWorkflow = useCallback(async (workflowId: string) => {
    setError(null);
    const response = await sendMessage<{ success: boolean; error?: string }>({
      type: 'DELETE_WORKFLOW',
      id: workflowId
    });
    if (response?.success) {
      await loadWorkflows();
    } else {
      setError(response?.error ?? 'Failed to delete workflow');
    }
  }, [loadWorkflows]);

  const handleToggleWorkflow = useCallback((workflowId: string) => {
    setError(null);
    setOpenWorkflowId(prev => (prev === workflowId ? null : workflowId));
  }, []);

  const handleToggleRun = useCallback((runId: string) => {
    setError(null);
    setOpenRunId(prev => (prev === runId ? null : runId));
  }, []);

  const handleToggleStep = useCallback(async (workflowId: string, stepId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    const updated: Workflow = {
      ...workflow,
      steps: workflow.steps.map(step =>
        step.id === stepId ? { ...step, enabled: !step.enabled } : step
      )
    };

    // Optimistic update; revert when the background rejects the save
    setWorkflows(prev => prev.map(w => (w.id === workflowId ? updated : w)));
    const response = await sendMessage<{ success: boolean; error?: string }>({
      type: 'SAVE_WORKFLOW',
      workflow: updated
    });
    if (!response?.success) {
      await loadWorkflows();
      setError(response?.error ?? 'Failed to update step');
    }
  }, [workflows, loadWorkflows]);

  if (isLoading) {
    return (
      <div className="panel" aria-busy="true">
        <div className="topbar-skeleton">
          <div className="skeleton skeleton-brand" />
          <div className="skeleton" style={{ width: 64, height: 22 }} />
        </div>
        <div className="transport-skeleton">
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
        <div className="skeleton-list">
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  const progressPercent =
    runningWorkflowId && runProgress && runProgress.total > 0
      ? Math.round((runProgress.current / runProgress.total) * 100)
      : 6;

  return (
    <div className="panel">
      <header className="topbar">
        <div className="brand">
          <LogoMark />
          <div className="brand-copy">
            <span className="brand-name">FlowPilot</span>
            <span className="brand-sub">Workflow recorder</span>
          </div>
        </div>
        <span className={`pill ${isRecording ? 'pill-rec' : 'pill-idle'}`}>
          <span className="pill-dot" aria-hidden="true" />
          {isRecording ? 'Recording' : 'Idle'}
        </span>
      </header>

      <section className={`transport ${isRecording ? 'transport-rec' : ''}`} aria-label="Recording controls">
        {isRecording ? (
          <>
            <span className="rec-indicator" aria-hidden="true">
              <span className="rec-dot" />
              REC
            </span>
            <div className="rec-copy">
              <span className="rec-count">{stepCount} step{stepCount === 1 ? '' : 's'} captured</span>
              <span className="rec-hint">Click, type, and select in the active tab</span>
            </div>
            <button className="btn btn-danger" onClick={() => void handleStopRecording()}>
              <StopIcon />
              Stop
            </button>
          </>
        ) : (
          <>
            <div className="transport-field">
              <label className="field-label" htmlFor="fp-start-url">Start page</label>
              <input
                id="fp-start-url"
                className="url-input"
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://example.com"
                value={startUrl}
                onChange={event => setStartUrl(event.target.value)}
              />
            </div>
            <div className="transport-row">
              <span className="rec-hint">Interactions on this tab become reusable steps</span>
              <button className="btn btn-primary" onClick={() => void handleStartRecording()}>
                <RecordIcon />
                Record
              </button>
            </div>
          </>
        )}
      </section>

      {namingWorkflow ? (
        <section className="naming" aria-label="Name the recorded workflow">
          <div className="naming-head">
            <p className="naming-title">Name this workflow</p>
            <p className="naming-meta">
              {namingWorkflow.steps.length} step{namingWorkflow.steps.length === 1 ? '' : 's'} captured
            </p>
          </div>
          <input
            className="naming-input"
            value={nameDraft}
            placeholder="Workflow name"
            aria-label="Workflow name"
            autoFocus
            onChange={event => setNameDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                void handleSaveWorkflowName();
              }
            }}
          />
          <div className="naming-actions">
            <button className="btn btn-small" onClick={() => setNamingWorkflow(null)}>
              Keep default
            </button>
            <button className="btn btn-primary" onClick={() => void handleSaveWorkflowName()}>
              Save workflow
            </button>
          </div>
        </section>
      ) : null}

      {runningWorkflowId ? (
        <div className="run-progress" role="status">
          <div className="run-progress-track">
            <div className="run-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="run-progress-label">
            {runProgress && runProgress.total > 0
              ? `Running workflow${runProgress.current >= runProgress.total ? ' · finishing' : ` · step ${runProgress.current}/${runProgress.total}`}`
              : 'Starting workflow'}
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="alert" role="alert">
          <WarningIcon />
          <span className="alert-text">{error}</span>
          <button className="alert-close" onClick={() => setError(null)} aria-label="Dismiss error">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
              <path d="m1.5 1.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : null}

      <nav className="tabs" role="tablist" aria-label="Panel sections">
        <button
          className={`tab ${activeTab === 'workflows' ? 'tab-active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'workflows'}
          onClick={() => setActiveTab('workflows')}
        >
          Workflows
          <span className="tab-count">{workflows.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        >
          History
          <span className="tab-count">{executionRuns.length}</span>
        </button>
      </nav>

      {activeTab === 'workflows' ? (
        <section aria-label="Saved workflows">
          {workflows.length === 0 ? (
            <div className="empty">
              <span className="empty-icon"><WorkflowsEmptyIcon /></span>
              <h2 className="empty-title">No workflows yet</h2>
              <p className="empty-copy">Press Record, perform the task once, then stop. The capture becomes a replayable workflow.</p>
            </div>
          ) : (
            <ul className="rows">
              {workflows.map(workflow => (
                <li key={workflow.id} className="row-group">
                  <div className={`row ${openWorkflowId === workflow.id ? 'open-group' : ''}`}>
                    <button
                      className="icon-btn chev-btn"
                      aria-expanded={openWorkflowId === workflow.id}
                      aria-label={`Show steps of ${workflow.name}`}
                      onClick={() => handleToggleWorkflow(workflow.id)}
                    >
                      <span className={`chev ${openWorkflowId === workflow.id ? 'chev-open' : ''}`}>
                        <ChevronIcon />
                      </span>
                    </button>
                    <div className="row-main">
                      <span className="row-name">{workflow.name}</span>
                      <span className="row-meta">
                        {workflow.steps.length} step{workflow.steps.length === 1 ? '' : 's'}
                        {' · '}
                        {relativeTime(workflow.createdAt)}
                      </span>
                    </div>
                    <div className="row-actions">
                      <button
                        className="btn btn-small"
                        disabled={runningWorkflowId === workflow.id}
                        onClick={() => void handleExecuteWorkflow(workflow.id)}
                      >
                        <RunIcon />
                        {runningWorkflowId === workflow.id ? 'Running' : 'Run'}
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`Delete ${workflow.name}`}
                        onClick={() => void handleDeleteWorkflow(workflow.id)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {openWorkflowId === workflow.id ? (
                    <div className="detail">
                      <p className="detail-title">Steps</p>
                      <ul className="steps">
                        {workflow.steps.map((step, index) => (
                          <li key={step.id} className={`step ${step.enabled ? '' : 'step-off'}`}>
                            <span className="step-index">{index + 1}</span>
                            <span className="step-chip">{step.type}</span>
                            <span className="step-desc" title={describeStep(step)}>
                              {step.input?.isSensitive && step.type !== 'select' ? (
                                <span className="step-sensitive">sensitive</span>
                              ) : null}
                              {describeStep(step)}
                            </span>
                            <label className="switch">
                              <input
                                type="checkbox"
                                checked={step.enabled}
                                aria-label={`Include step ${index + 1} (${step.type}) when running`}
                                onChange={() => void handleToggleStep(workflow.id, step.id)}
                              />
                              <span className="switch-track" aria-hidden="true" />
                            </label>
                          </li>
                        ))}
                      </ul>
                      {workflow.steps.length === 0 ? (
                        <p className="detail-empty">This workflow has no recorded steps.</p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section aria-label="Execution history">
          {executionRuns.length === 0 ? (
            <div className="empty">
              <span className="empty-icon"><HistoryEmptyIcon /></span>
              <h2 className="empty-title">No runs yet</h2>
              <p className="empty-copy">Run a workflow and each replay is logged here with its outcome.</p>
            </div>
          ) : (
            <ul className="rows">
              {executionRuns.map(run => (
                <li key={run.id} className="row-group">
                  <div className={`row ${run.status === 'failed' ? 'row-failed' : ''} ${openRunId === run.id ? 'open-group' : ''}`}>
                    <button
                      className="icon-btn chev-btn"
                      aria-expanded={openRunId === run.id}
                      aria-label={run.status === 'failed' ? 'Show failure details' : 'Show run details'}
                      onClick={() => handleToggleRun(run.id)}
                    >
                      <span className={`chev ${openRunId === run.id ? 'chev-open' : ''}`}>
                        <ChevronIcon />
                      </span>
                    </button>
                    <span
                      className={`run-status ${run.status === 'failed' ? 'run-status-failed' : 'run-status-good'}`}
                      aria-hidden="true"
                    >
                      {run.status === 'failed' ? <FailureIcon /> : <SuccessIcon />}
                    </span>
                    <div className="row-main">
                      <span className="row-name">
                        {workflows.find(w => w.id === run.workflowId)?.name ?? 'Workflow'}
                      </span>
                      <span className="row-meta">{relativeTime(run.startTime)}</span>
                    </div>
                  </div>

                  {openRunId === run.id ? (
                    <div className="detail">
                      <p className="detail-title">Step log</p>
                      <ul className="steps">
                        {(runDetails[run.id]?.steps ?? []).map((step, index) => (
                          <li key={step.id} className={`step ${step.status === 'failed' ? 'step-broken' : ''}`}>
                            <span className="step-index">{index + 1}</span>
                            <span className={`step-chip ${step.status === 'failed' ? 'chip-failed' : 'chip-good'}`}>
                              {step.status}
                            </span>
                            <span className="step-desc">
                              {step.stepType ? `${step.stepType} · ` : ''}
                              {step.status === 'failed' ? (step.error ?? 'failed') : step.error ?? 'completed'}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {(runDetails[run.id]?.steps ?? []).length === 0 ? (
                        <p className="detail-empty">
                          {runDetails[run.id] ? 'This run has no step log (recorded before diagnostics existed).' : 'Loading…'}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <footer className="foot">Recordings stay on this device</footer>
    </div>
  );
};

export default App;
