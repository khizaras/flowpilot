/**
 * Shared TypeScript types for FlowPilot
 */

export interface Selector {
  type: 'id' | 'data-testid' | 'aria' | 'css' | 'xpath' | 'coordinates';
  value: string;
  confidence: number;
}

export interface ElementFingerprint {
  tag: string;
  text: string;
  role: string;
  ariaLabel: string;
  name: string | null;
  id: string;
  classes: string[];
  attributes: Record<string, string>;
  relativePosition: { x: number; y: number };
}

export interface TargetDefinition {
  selectors: Selector[];
  fingerprint: ElementFingerprint;
}

export interface InputData {
  value: string;
  isSensitive?: boolean;
  masked?: boolean;
}

export interface WaitCondition {
  timeout?: number;
  condition?: string;
  element?: TargetDefinition;
}

export type StepType =
  | 'click'
  | 'doubleClick'
  | 'rightClick'
  | 'hover'
  | 'type'
  | 'clear'
  | 'select'
  | 'wait'
  | 'navigate'
  | 'scroll'
  | 'screenshot';

export interface WorkflowStep {
  id: string;
  type: StepType;
  enabled: boolean;
  target?: TargetDefinition;
  input?: InputData;
  wait?: WaitCondition;
  timestamp: number;
  /** When the target never appears, skip this step instead of failing the run */
  ignoreIfMissing?: boolean;
  // Add other properties as needed
}

export type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'interval';

/**
 * Automatic run schedule attached to a workflow.
 * `time` is HH:MM local time; `weekdays` are 0 (Sun) - 6 (Sat)
 */
export interface WorkflowSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  time?: string;
  weekdays?: number[];
  intervalMinutes?: number;
  startAt?: string;
  occurrences?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
  startUrl?: string;
  schedule?: WorkflowSchedule;
  /** Pause between steps in milliseconds (default 150) */
  stepDelayMs?: number;
  /** How long each step may wait for its target element to appear (default 6000) */
  elementTimeoutMs?: number;
  // Add other properties as needed
}

export interface ExecutionStep {
  id: string;
  workflowId: string;
  stepId: string;
  stepType?: StepType;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  timestamp: number;
  error?: string;
  // Add other properties as needed
}

export interface ExecutionRun {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startTime: number;
  endTime?: number;
  steps: ExecutionStep[];
  // Add other properties as needed
}

/**
 * Step-level diagnostic reported by the executor during a run
 */
export interface StepResult {
  stepId: string;
  stepType: StepType;
  status: 'success' | 'failed' | 'skipped';
  timestamp: number;
  error?: string;
}