import React, { useState, useEffect } from 'react';
import './styles.css';

// Mock types for now - these would come from shared/types
interface Workflow {
  id: string;
  name: string;
  steps: number;
  lastRun: string;
  createdAt: string;
}

interface ExecutionRun {
  id: string;
  workflowId: string;
  status: 'success' | 'failed' | 'running';
  timestamp: string;
}

const App: React.FC = () => {
  // Mock state for workflows and execution runs
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executionRuns, setExecutionRuns] = useState<ExecutionRun[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workflows' | 'history'>('workflows');

  // Mock data initialization
  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setWorkflows([
        {
          id: 'wf-1',
          name: 'Login Workflow',
          steps: 3,
          lastRun: '2023-05-15T10:30:00Z',
          createdAt: '2023-05-10T09:15:00Z'
        },
        {
          id: 'wf-2',
          name: 'Form Submission',
          steps: 5,
          lastRun: '2023-05-14T14:22:00Z',
          createdAt: '2023-05-12T11:45:00Z'
        }
      ]);

      setExecutionRuns([
        {
          id: 'run-1',
          workflowId: 'wf-1',
          status: 'success',
          timestamp: '2023-05-15T10:30:00Z'
        },
        {
          id: 'run-2',
          workflowId: 'wf-2',
          status: 'failed',
          timestamp: '2023-05-14T14:22:00Z'
        }
      ]);

      setIsLoading(false);
    }, 500);
  }, []);

  const handleStartRecording = () => {
    setIsRecording(true);
    // In a real implementation, this would communicate with the content script
    console.log('Starting recording...');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // In a real implementation, this would communicate with the content script
    console.log('Stopping recording...');
  };

  const handleExecuteWorkflow = (workflowId: string) => {
    console.log(`Executing workflow ${workflowId}`);
    // In a real implementation, this would communicate with the content script
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

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
        <button
          className="button button-primary"
          onClick={isRecording ? handleStopRecording : handleStartRecording}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>

      <div className="card">
        <h2 className="card-title">Workflows</h2>
        <p className="card-content">Manage your recorded automation workflows</p>
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
                        {workflow.steps} steps • Last run: {formatDate(workflow.lastRun)}
                      </p>
                    </div>
                    <div className="workflow-actions">
                      <button
                        className="button button-secondary"
                        onClick={() => handleExecuteWorkflow(workflow.id)}
                      >
                        Run
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
                        Workflow Execution {run.id.split('-')[1]}
                      </h3>
                      <p className="workflow-meta">
                        Status: <span style={{color: getStatusColor(run.status)}}>
                          {getStatusText(run.status)}
                        </span> • {formatDate(run.timestamp)}
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