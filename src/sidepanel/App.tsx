import { useCallback, useEffect, useState } from 'react';
import './styles.css';
import type { ExecutionRun, Workflow } from '../shared/types';

interface RecordingStateResponse {
  success: boolean;
  isRecording: boolean;
  stepCount: number;
}

function sendMessage<T>(message: Record<string, unknown>): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response as T | undefined);
    });
  });
}

const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success': return 'var(--success-green)';
    case 'failed': return 'var(--error-red)';
    case 'running': return 'var(--warning-amber)';
    default: return 'var(--text-secondary)';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'success': return 'Success';
    case 'failed': return 'Failed';
    case 'running': return 'Running';
    default: return status;
  }
};

const App: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executionRuns, setExecutionRuns] = useState<ExecutionRun[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workflows' | 'history'>('workflows');
  const [error, setError] = useState<string | null>(null);

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

  // Poll the recording state so the panel stays accurate while users browse
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const state = await sendMessage<RecordingStateResponse>({ type: 'GET_RECORDING_STATE' });
      if (state?.success && !cancelled) {
        setIsRecording(Boolean(state.isRecording));
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const handleStartRecording = useCallback(async () => {
    setError(null);
    const response = await sendMessage<{ success: boolean; error?: string }>({ type: 'START_RECORDING' });
    if (response?.success) {
      setIsRecording(true);
    } else {
      setIsRecording(false);
      setError(response?.error ?? 'Failed to start recording');
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    setError(null);
    const response = await sendMessage<{ success: boolean; error?: string }>({ type: 'STOP_RECORDING' });
    if (response?.success) {
      setIsRecording(false);
      await loadWorkflows();
      setActiveTab('workflows');
    } else {
      setError(response?.error ?? 'Failed to stop recording');
      setIsRecording(false);
    }
  }, [loadWorkflows]);

  const handleExecuteWorkflow = useCallback(async (workflowId: string) => {
    setError(null);
    const response = await sendMessage<{ success: boolean; error?: string }>({
      type: 'EXECUTE_WORKFLOW',
      workflowId
    });
    if (response?.success) {
      await Promise.all([loadWorkflows(), loadExecutionRuns()]);
      setActiveTab('history');
    } else {
      setError(response?.error ?? 'Failed to execute workflow');
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

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1 className="title">FlowPilot</h1>
          <p className="subtitle">Browser Automation Recorder</p>
        </div>
        <div className="status">
          <div className={`status-indicator ${isRecording ? 'status-recording' : 'status-idle'}`}></div>
          <span>{isRecording ? 'Recording' : 'Idle'}</span>
        </div>
      </div>

      <div className="button-group">
        {error ? (
          <p className="error-banner" role="alert">{error}</p>
        ) : null}
        {isRecording ? (
          <button className="button button-primary" onClick={() => void handleStopRecording()}>
            Stop Recording
          </button>
        ) : (
          <button className="button button-primary" onClick={() => void handleStartRecording()}>
            Start Recording
          </button>
        )}
      </div>

      <div className="card">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'workflows' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflows')}
          >
            Workflows
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Execution History
          </button>
        </div>

        {activeTab === 'workflows' ? (
          <div>
            {workflows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎬</div>
                <h3 className="empty-state-title">No Workflows Recorded</h3>
                <p className="empty-state-description">Start recording your first workflow to get started</p>
              </div>
            ) : (
              <ul className="workflow-list">
                {workflows.map(workflow => (
                  <li key={workflow.id} className="workflow-item">
                    <div>
                      <h3 className="workflow-name">{workflow.name}</h3>
                      <p className="workflow-meta">
                        {workflow.steps.length} steps • Created: {formatDate(workflow.createdAt)}
                      </p>
                    </div>
                    <div className="workflow-actions">
                      <button
                        className="button button-secondary"
                        onClick={() => void handleExecuteWorkflow(workflow.id)}
                      >
                        Run
                      </button>
                      <button
                        className="button button-destructive"
                        onClick={() => void handleDeleteWorkflow(workflow.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div>
            {executionRuns.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <h3 className="empty-state-title">No Execution History</h3>
                <p className="empty-state-description">Execute workflows to see their history</p>
              </div>
            ) : (
              <ul className="workflow-list">
                {executionRuns.map(run => (
                  <li key={run.id} className="workflow-item">
                    <div>
                      <h3 className="workflow-name">
                        {workflows.find(w => w.id === run.workflowId)?.name ?? 'Workflow'}
                      </h3>
                      <p className="workflow-meta">
                        Status: <span style={{ color: getStatusColor(run.status) }}>
                          {getStatusText(run.status)}
                        </span> • {formatDate(run.startTime)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
