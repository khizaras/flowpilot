import { useCallback, useEffect, useState } from 'react';
import './styles.css';
import type { ExecutionRun, Workflow, WorkflowSchedule, WorkflowStep } from '../shared/types';

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

const hostLabel = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 40);
  }
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

/**
 * Short human summary of a schedule, shown on the workflow row
 */
const describeSchedule = (schedule: WorkflowSchedule | undefined): string | null => {
  if (!schedule?.enabled) return null;
  switch (schedule.frequency) {
    case 'daily':
      return `daily at ${schedule.time}`;
    case 'weekly': {
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = (schedule.weekdays ?? []).map(day => names[day]).join(', ');
      return `weekly on ${days} at ${schedule.time}`;
    }
    case 'interval':
      return `every ${schedule.intervalMinutes ?? 60}m`;
    case 'once': {
      const at = Date.parse(schedule.startAt ?? '');
      return Number.isFinite(at) ? `once at ${new Date(at).toLocaleString()}` : 'schedule incomplete';
    }
    default:
      return null;
  }
};

// Monday-first ordering for the weekday picker
const WEEKDAYS: Array<[number, string]> = [
  [1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']
];

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

function ExportIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d="M4 5.5 7 2.5l3 3M7 3v7.5M2.5 11.5h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function MoveUpIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <path d="m2 6.5 3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function MoveDownIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <path d="m2 3.5 3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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

/**
 * Schedule editor shown inside a workflow's detail view
 */
function ScheduleEditor(props: {
  value: WorkflowSchedule | undefined;
  timesRun: number;
  onSave: (schedule: WorkflowSchedule) => void;
  busy: boolean;
}) {
  const { value, timesRun, onSave, busy } = props;
  const [enabled, setEnabled] = useState(value?.enabled ?? false);
  const [frequency, setFrequency] = useState(value?.frequency ?? 'daily');
  const [time, setTime] = useState(value?.time ?? '09:00');
  const [weekdays, setWeekdays] = useState<number[]>(value?.weekdays ?? [1, 2, 3, 4, 5]);
  const [intervalMinutes, setIntervalMinutes] = useState(value?.intervalMinutes ?? 60);
  const [startAt, setStartAt] = useState(
    value?.startAt ? value.startAt.slice(0, 16) : ''
  );
  const [occurrenceDraft, setOccurrenceDraft] = useState(
    value?.occurrences ? String(value.occurrences) : '0'
  );

  const save = () => {
    const schedule: WorkflowSchedule = { enabled, frequency };
    if (frequency === 'daily' || frequency === 'weekly') {
      schedule.time = time;
    }
    if (frequency === 'weekly') {
      schedule.weekdays = weekdays;
    }
    if (frequency === 'interval') {
      schedule.intervalMinutes = intervalMinutes;
    }
    if (frequency === 'once') {
      schedule.startAt = startAt ? new Date(startAt).toISOString() : '';
    }
    const occurrences = Number(occurrenceDraft);
    if (Number.isFinite(occurrences) && occurrences > 0) {
      schedule.occurrences = Math.round(occurrences);
    }
    onSave(schedule);
  };

  return (
    <div className="sched">
      <div className="sched-head">
        <p className="detail-title">Schedule</p>
        <span className="sched-run-count">Times run: {timesRun}</span>
      </div>

      <label className="sched-enable">
        <label className="switch">
          <input
            type="checkbox"
            checked={enabled}
            aria-label="Run this workflow automatically"
            onChange={event => setEnabled(event.target.checked)}
          />
          <span className="switch-track" aria-hidden="true" />
        </label>
        <span className="sched-enable-label">{enabled ? 'Runs automatically' : 'Runs only when you press Run'}</span>
      </label>

      {enabled ? (
        <div className="sched-fields">
          <div className="sched-row">
            <label className="field-label" htmlFor={`${frequency}-freq`}>Frequency</label>
            <select
              id={`${frequency}-freq`}
              className="input input-select"
              value={frequency}
              onChange={event => setFrequency(event.target.value as WorkflowSchedule['frequency'])}
            >
              <option value="once">Once at date/time</option>
              <option value="daily">Daily at time</option>
              <option value="weekly">Weekly on days</option>
              <option value="interval">Every N minutes</option>
            </select>
          </div>

          {frequency === 'daily' || frequency === 'weekly' ? (
            <div className="sched-row">
              <label className="field-label" htmlFor="fp-time">At time</label>
              <input
                id="fp-time"
                className="input"
                type="time"
                value={time}
                onChange={event => setTime(event.target.value)}
              />
            </div>
          ) : null}

          {frequency === 'weekly' ? (
            <div className="sched-row">
              <span className="field-label">On days</span>
              <div className="chip-row">
                {WEEKDAYS.map(([day, label]) => (
                  <button
                    key={day}
                    type="button"
                    className={`chip ${weekdays.includes(day) ? 'chip-on' : ''}`}
                    aria-pressed={weekdays.includes(day)}
                    onClick={() =>
                      setWeekdays(prev =>
                        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                      )
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {frequency === 'interval' ? (
            <div className="sched-row">
              <label className="field-label" htmlFor="fp-interval">Every (minutes)</label>
              <input
                id="fp-interval"
                className="input"
                type="number"
                min={1}
                value={intervalMinutes}
                onChange={event => setIntervalMinutes(Number(event.target.value))}
              />
            </div>
          ) : null}

          {frequency === 'once' ? (
            <div className="sched-row">
              <label className="field-label" htmlFor="fp-start-at">Run at</label>
              <input
                id="fp-start-at"
                className="input"
                type="datetime-local"
                value={startAt}
                onChange={event => setStartAt(event.target.value)}
              />
            </div>
          ) : null}

          <div className="sched-row">
            <label className="field-label" htmlFor="fp-occurrences">Stop after (0 = forever)</label>
            <input
              id="fp-occurrences"
              className="input input-narrow"
              type="number"
              min={0}
              value={occurrenceDraft}
              onChange={event => setOccurrenceDraft(event.target.value)}
            />
          </div>

          <p className="card-note">
            The workflow opens its start page in a background tab when due. Chrome restarts keep schedules running.
          </p>
        </div>
      ) : null}

      <div className="naming-actions">
        <button className="btn btn-primary btn-small" disabled={busy} onClick={save}>
          Save schedule
        </button>
      </div>
    </div>
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
  const [descDraft, setDescDraft] = useState('');
  const [openStepKey, setOpenStepKey] = useState<string | null>(null);
  const [valueDraft, setValueDraft] = useState('');
  const [credentialMap, setCredentialMap] = useState<Record<string, string[] | undefined>>({});
  const [secretTarget, setSecretTarget] = useState<string | null>(null);
  const [secretDraft, setSecretDraft] = useState('');
  const [runCounts, setRunCounts] = useState<Record<string, number>>({});
  const [scheduleBusyId, setScheduleBusyId] = useState<string | null>(null);

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

  // Load credential presence and schedule counters when a workflow expands
  useEffect(() => {
    if (!openWorkflowId) return;
    let cancelled = false;
    void (async () => {
      const [credResponse, schedResponse] = await Promise.all([
        sendMessage<{ success: boolean; stepIds?: string[] }>({ type: 'GET_CREDENTIALS', id: openWorkflowId }),
        sendMessage<{ success: boolean; timesRun?: number }>({ type: 'GET_SCHEDULE', id: openWorkflowId })
      ]);
      if (cancelled) return;
      if (credResponse?.success) {
        setCredentialMap(prev => ({ ...prev, [openWorkflowId]: credResponse.stepIds ?? [] }));
      }
      if (schedResponse?.success) {
        setRunCounts(prev => ({ ...prev, [openWorkflowId]: schedResponse.timesRun ?? 0 }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openWorkflowId]);

  const refreshCredentials = useCallback(async (workflowId: string) => {
    const response = await sendMessage<{ success: boolean; stepIds?: string[] }>({
      type: 'GET_CREDENTIALS',
      id: workflowId
    });
    if (response?.success) {
      setCredentialMap(prev => ({ ...prev, [workflowId]: response.stepIds ?? [] }));
    }
  }, []);

  const persistWorkflow = useCallback(async (updated: Workflow): Promise<boolean> => {
    setWorkflows(prev => prev.map(w => (w.id === updated.id ? updated : w)));
    const response = await sendMessage<{ success: boolean; error?: string }>({
      type: 'SAVE_WORKFLOW',
      workflow: updated
    });
    if (!response?.success) {
      await loadWorkflows();
      setError(response?.error ?? 'Failed to save the change');
      return false;
    }
    return true;
  }, [loadWorkflows]);

  const updateSteps = useCallback(
    async (workflowId: string, mutate: (steps: WorkflowStep[]) => WorkflowStep[]) => {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) return;
      const updated: Workflow = { ...workflow, steps: mutate([...workflow.steps]) };
      await persistWorkflow(updated);
    },
    [workflows, persistWorkflow]
  );

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
        setDescDraft(response.workflow.description ?? '');
      }
    } else {
      setError(response?.error ?? 'Failed to stop recording');
      setIsRecording(false);
    }
  }, [loadWorkflows]);

  const handleSaveWorkflowIdentity = useCallback(async () => {
    if (!namingWorkflow) return;
    setError(null);
    const name = nameDraft.trim();
    if (!name) {
      setError('Give the workflow a name');
      return;
    }
    const description = descDraft.trim();
    const response = await sendMessage<{ success: boolean; error?: string }>({
      type: 'SAVE_WORKFLOW',
      workflow: {
        ...namingWorkflow,
        name,
        description: description.length > 0 ? description : undefined
      }
    });
    if (response?.success) {
      setNamingWorkflow(null);
      await loadWorkflows();
      setActiveTab('workflows');
    } else {
      setError(response?.error ?? 'Failed to save the workflow');
    }
  }, [namingWorkflow, nameDraft, descDraft, loadWorkflows]);

  const handleExecuteWorkflow = useCallback(async (workflowId: string) => {
    setError(null);
    setRunningWorkflowId(workflowId);
    setRunProgress({ current: 0, total: 0 });
    try {
      const response = await sendMessage<{ success: boolean; error?: string; runId?: string }>({
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
    setOpenStepKey(null);
  }, []);

  const handleToggleRun = useCallback((runId: string) => {
    setError(null);
    setOpenRunId(prev => (prev === runId ? null : runId));
  }, []);

  const handleToggleStep = useCallback((key: string, step: WorkflowStep) => {
    setOpenStepKey(prev => (prev === key ? null : key));
    setValueDraft(
      step.type === 'wait'
        ? String((step.wait?.timeout ?? 1000) / 1000)
        : (step.input?.value ?? '')
    );
    setSecretTarget(null);
    setSecretDraft('');
  }, []);

  const handleToggleStepEnabled = useCallback(async (workflowId: string, stepId: string) => {
    await updateSteps(workflowId, steps =>
      steps.map(step => (step.id === stepId ? { ...step, enabled: !step.enabled } : step))
    );
  }, [updateSteps]);

  const handleApplyStepValue = useCallback(async (workflowId: string, step: WorkflowStep) => {
    if (step.type === 'wait') {
      const seconds = Number(valueDraft);
      if (!Number.isFinite(seconds) || seconds <= 0) {
        setError('Wait duration must be a positive number of seconds');
        return;
      }
      await updateSteps(workflowId, steps =>
        steps.map(s =>
          s.id === step.id ? { ...s, wait: { ...(s.wait ?? {}), timeout: Math.round(seconds * 1000) } } : s
        )
      );
      return;
    }
    if (step.type === 'type' || step.type === 'select') {
      await updateSteps(workflowId, steps =>
        steps.map(s =>
          s.id === step.id && s.input ? { ...s, input: { ...s.input, value: valueDraft } } : s
        )
      );
      return;
    }
  }, [valueDraft, updateSteps]);

  const handleMoveStep = useCallback(async (workflowId: string, index: number, direction: -1 | 1) => {
    await updateSteps(workflowId, steps => {
      const target = index + direction;
      if (target < 0 || target >= steps.length) {
        return steps;
      }
      const next = [...steps];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }, [updateSteps]);

  const handleDeleteStep = useCallback(async (workflowId: string, stepId: string) => {
    setOpenStepKey(null);
    await updateSteps(workflowId, steps => steps.filter(step => step.id !== stepId));
  }, [updateSteps]);

  const handleExportWorkflow = useCallback(async (workflow: Workflow) => {
    setError(null);
    const response = await sendMessage<{ success: boolean; error?: string; json?: string; filename?: string }>({
      type: 'EXPORT_WORKFLOW',
      id: workflow.id
    });
    if (response?.success && typeof response.json === 'string') {
      const blob = new Blob([response.json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.filename ?? `${workflow.name}.flowpilot.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } else {
      setError(response?.error ?? 'Export failed');
    }
  }, []);

  const handleImportFile = useCallback(async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Select a .json workflow file');
      return;
    }
    let json: string;
    try {
      json = await file.text();
    } catch {
      setError('The file could not be read');
      return;
    }
    const response = await sendMessage<{ success: boolean; error?: string }>({
      type: 'IMPORT_WORKFLOW',
      json
    });
    if (response?.success) {
      await loadWorkflows();
    } else {
      setError(response?.error ?? 'Import failed');
    }
  }, [loadWorkflows]);

  const handleSaveCredential = useCallback(async (workflowId: string, stepId: string) => {
    setError(null);
    if (!secretDraft.trim()) {
      setError('Enter the credential value first');
      return;
    }
    const response = await sendMessage<{ success: boolean; error?: string }>({
      type: 'SET_CREDENTIAL',
      id: workflowId,
      stepId,
      value: secretDraft
    });
    if (response?.success) {
      setSecretTarget(null);
      setSecretDraft('');
      await refreshCredentials(workflowId);
    } else {
      setError(response?.error ?? 'Failed to store the credential');
    }
  }, [secretDraft, refreshCredentials]);

  const handleRemoveCredential = useCallback(async (workflowId: string, stepId: string) => {
    setError(null);
    const response = await sendMessage<{ success: boolean; error?: string }>({
      type: 'DELETE_CREDENTIAL',
      id: workflowId,
      stepId
    });
    if (response?.success) {
      await refreshCredentials(workflowId);
    } else {
      setError(response?.error ?? 'Failed to remove the credential');
    }
  }, [refreshCredentials]);

  const handleSaveSchedule = useCallback(async (workflowId: string, schedule: WorkflowSchedule) => {
    setError(null);
    setScheduleBusyId(workflowId);
    try {
      const response = await sendMessage<{ success: boolean; error?: string }>({
        type: 'SET_SCHEDULE',
        id: workflowId,
        schedule
      });
      if (response?.success) {
        await loadWorkflows();
      } else {
        setError(response?.error ?? 'Failed to save the schedule');
      }
    } finally {
      setScheduleBusyId(null);
    }
  }, [loadWorkflows]);

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
        <section className="naming" aria-label="Save the recorded workflow">
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
                void handleSaveWorkflowIdentity();
              }
            }}
          />
          <input
            className="naming-input"
            value={descDraft}
            placeholder="Description (optional)"
            aria-label="Workflow description"
            onChange={event => setDescDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                void handleSaveWorkflowIdentity();
              }
            }}
          />
          <div className="naming-actions">
            <button className="btn btn-small" onClick={() => setNamingWorkflow(null)}>
              Keep default
            </button>
            <button className="btn btn-primary" onClick={() => void handleSaveWorkflowIdentity()}>
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
          <div className="list-toolbar">
            <label className="btn btn-small" htmlFor="fp-import">
              Import JSON
              <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                <path d="M4 5.5 7 8.5l3-3M7 3v7.5M2.5 11.5h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </label>
            <input
              id="fp-import"
              className="visually-hidden"
              type="file"
              accept=".json,application/json"
              onChange={event => {
                void handleImportFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <span className="list-toolbar-hint">Schedule, credentials, and editing live inside each workflow</span>
          </div>

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
                        {describeSchedule(workflow.schedule) ? ` · ${describeSchedule(workflow.schedule)}` : ''}
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
                      {workflow.description ? <p className="detail-desc">{workflow.description}</p> : null}
                      {workflow.startUrl ? (
                        <p className="detail-start" title={workflow.startUrl}>
                          Starts at {hostLabel(workflow.startUrl)}
                        </p>
                      ) : null}

                      <p className="detail-title">Steps</p>
                      <ul className="steps">
                        {workflow.steps.map((step, index) => {
                          const key = `${workflow.id}:${step.id}`;
                          const hasCredential = (credentialMap[workflow.id] ?? []).includes(step.id);
                          const isSensitive = Boolean(step.input?.isSensitive);
                          return (
                            <li
                              key={step.id}
                              className={`step ${step.enabled ? '' : 'step-off'} ${openStepKey === key ? 'step-open' : ''}`}
                            >
                              <span className="step-index">{index + 1}</span>
                              <span className="step-chip">{step.type}</span>
                              <button
                                type="button"
                                className="step-desc step-desc-btn"
                                aria-expanded={openStepKey === key}
                                title={describeStep(step)}
                                onClick={() => handleToggleStep(key, step)}
                              >
                                {isSensitive && step.type === 'type' ? (
                                  <span className="step-sensitive">sensitive</span>
                                ) : null}
                                {isSensitive && step.type === 'type' && hasCredential ? (
                                  <span className="cred-inline">credential</span>
                                ) : null}
                                {describeStep(step)}
                              </button>
                              <label className="switch">
                                <input
                                  type="checkbox"
                                  checked={step.enabled}
                                  aria-label={`Include step ${index + 1} (${step.type}) when running`}
                                  onChange={() => void handleToggleStepEnabled(workflow.id, step.id)}
                                />
                                <span className="switch-track" aria-hidden="true" />
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                      {workflow.steps.length === 0 ? (
                        <p className="detail-empty">This workflow has no recorded steps.</p>
                      ) : null}

                      <ScheduleEditor
                        value={workflow.schedule}
                        timesRun={runCounts[workflow.id] ?? 0}
                        busy={scheduleBusyId === workflow.id}
                        onSave={schedule => void handleSaveSchedule(workflow.id, schedule)}
                      />

                      <div className="detail-actions">
                        <button className="btn btn-small" onClick={() => void handleExportWorkflow(workflow)}>
                          <ExportIcon />
                          Export JSON
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {openWorkflowId === workflow.id ? (
                    <div className="detail-continuation">
                      <ul className="step-cards">
                        {workflow.steps.map((step, index) => {
                          const key = `${workflow.id}:${step.id}`;
                          if (openStepKey !== key) return null;
                          const hasCredential = (credentialMap[workflow.id] ?? []).includes(step.id);
                          const credKey = key;
                          const isSensitive = Boolean(step.input?.isSensitive);
                          return (
                            <li key={`card_${step.id}`} className="step-card">
                              <div className="card-block">
                                <p className="card-label">Action</p>
                                <p className="card-text">{describeStep(step)}</p>
                              </div>

                              {step.type === 'type' || step.type === 'select' ? (
                                isSensitive ? (
                                  <div className="card-block">
                                    <p className="card-label">Credential</p>
                                    {secretTarget === credKey ? (
                                      <div className="card-row">
                                        <input
                                          type="password"
                                          className="input"
                                          autoFocus
                                          placeholder="Secret value"
                                          aria-label="Credential value"
                                          value={secretDraft}
                                          onChange={event => setSecretDraft(event.target.value)}
                                          onKeyDown={event => {
                                            if (event.key === 'Enter') {
                                              void handleSaveCredential(workflow.id, step.id);
                                            }
                                          }}
                                        />
                                        <button className="btn btn-mini" onClick={() => void handleSaveCredential(workflow.id, step.id)}>
                                          Store
                                        </button>
                                        <button
                                          className="btn btn-mini"
                                          onClick={() => {
                                            setSecretTarget(null);
                                            setSecretDraft('');
                                          }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="card-row">
                                        <span className={`cred-status ${hasCredential ? 'cred-ok' : ''}`}>
                                          {hasCredential ? 'Stored in vault' : 'Not configured'}
                                        </span>
                                        <button
                                          className="btn btn-mini"
                                          onClick={() => {
                                            setSecretTarget(credKey);
                                            setSecretDraft('');
                                          }}
                                        >
                                          {hasCredential ? 'Update' : 'Set'}
                                        </button>
                                        {hasCredential ? (
                                          <button
                                            className="btn btn-mini"
                                            onClick={() => void handleRemoveCredential(workflow.id, step.id)}
                                          >
                                            Remove
                                          </button>
                                        ) : null}
                                      </div>
                                    )}
                                    <p className="card-note">Stored only on this device, never included in exports. Runs fail honestly until it is set.</p>
                                  </div>
                                ) : (
                                  <div className="card-block">
                                    <p className="card-label">Value</p>
                                    <div className="card-row">
                                      <input
                                        className="input"
                                        value={valueDraft}
                                        aria-label="Step value"
                                        onChange={event => setValueDraft(event.target.value)}
                                      />
                                      <button className="btn btn-mini" onClick={() => void handleApplyStepValue(workflow.id, step)}>
                                        Apply
                                      </button>
                                    </div>
                                  </div>
                                )
                              ) : null}

                              {step.type === 'wait' ? (
                                <div className="card-block">
                                  <p className="card-label">Wait duration (seconds)</p>
                                  <div className="card-row">
                                    <input
                                      className="input input-narrow"
                                      type="number"
                                      min={0.5}
                                      step={0.5}
                                      value={valueDraft}
                                      aria-label="Wait duration in seconds"
                                      onChange={event => setValueDraft(event.target.value)}
                                    />
                                    <button className="btn btn-mini" onClick={() => void handleApplyStepValue(workflow.id, step)}>
                                      Apply
                                    </button>
                                  </div>
                                </div>
                              ) : null}

                              <div className="card-block">
                                <p className="card-label">Target resolution</p>
                                <ul className="selector-list">
                                  {(step.target?.selectors ?? []).map((selector, selectorIndex) => (
                                    <li key={selectorIndex} className="selector">
                                      <span className="selector-type">{selector.type}</span>
                                      <span className="selector-value" title={selector.value}>{selector.value}</span>
                                      <span className="selector-conf">{Math.round(selector.confidence * 100)}%</span>
                                    </li>
                                  ))}
                                  {(step.target?.selectors ?? []).length === 0 ? (
                                    <li className="detail-empty">No selectors recorded for this step</li>
                                  ) : null}
                                </ul>
                                {step.target?.fingerprint ? (
                                  <p className="card-fp">
                                    Hint: {step.target.fingerprint.tag}
                                    {step.target.fingerprint.ariaLabel ? ` · aria="${step.target.fingerprint.ariaLabel}"` : ''}
                                    {step.target.fingerprint.text ? ` · text="${step.target.fingerprint.text.slice(0, 48)}"` : ''}
                                    {step.target.fingerprint.name ? ` · name="${step.target.fingerprint.name}"` : ''}
                                  </p>
                                ) : null}
                              </div>

                              <div className="card-actions">
                                <button
                                  className="icon-btn"
                                  aria-label="Move step up"
                                  disabled={index === 0}
                                  onClick={() => void handleMoveStep(workflow.id, index, -1)}
                                >
                                  <MoveUpIcon />
                                </button>
                                <button
                                  className="icon-btn"
                                  aria-label="Move step down"
                                  disabled={index === workflow.steps.length - 1}
                                  onClick={() => void handleMoveStep(workflow.id, index, 1)}
                                >
                                  <MoveDownIcon />
                                </button>
                                <span className="card-spacer" />
                                <button
                                  className="btn btn-mini"
                                  onClick={() => void handleDeleteStep(workflow.id, step.id)}
                                >
                                  Delete step
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
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

      <footer className="foot">Recordings, credentials, and schedules stay on this device</footer>
    </div>
  );
};

export default App;
