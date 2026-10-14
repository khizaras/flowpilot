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
  // Add other properties as needed
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
  // Add other properties as needed
}

export interface ExecutionStep {
  id: string;
  workflowId: string;
  stepId: string;
  stepType?: StepType;
  status: 'pending' | 'running' | 'success' | 'failed';
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
  status: 'success' | 'failed';
  timestamp: number;
  error?: string;
}