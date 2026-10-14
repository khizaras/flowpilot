import { WorkflowStep, StepResult } from '../shared/types';
import { showExecutionBadge, showExecutionResult, flashTarget } from './overlay';
import { resolveTarget, ResolveOptions } from './target-resolver';

const STEP_PAUSE_MS = 120;

/**
 * Execution Engine for FlowPilot
 * Handles the execution of recorded workflows
 */
export class Executor {
  private isExecuting = false;
  private lastError: string | null = null;
  private runSteps: StepResult[] = [];
  private onProgress?: (current: number, total: number) => void;

  constructor(onProgress?: (current: number, total: number) => void) {
    this.onProgress = onProgress;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getStepResults(): StepResult[] {
    return this.runSteps;
  }

  private resolveOptions(timeoutMs = 6000): ResolveOptions {
    return { timeoutMs };
  }

  /**
   * Execute a workflow
   * @param workflow - The workflow to execute
   * @returns Promise that resolves with the execution result
   */
  async executeWorkflow(workflow: any): Promise<boolean> {
    if (this.isExecuting) {
      this.lastError = 'Another workflow is already running';
      console.warn('Execution already in progress');
      return false;
    }

    this.isExecuting = true;
    this.lastError = null;
    this.runSteps = [];
    console.log('Starting workflow execution:', workflow.name || 'Unnamed Workflow');

    try {
      // Validate workflow before execution
      if (!this.validateWorkflow(workflow)) {
        throw new Error('Invalid workflow structure');
      }

      const steps: WorkflowStep[] = workflow.steps.filter((step: WorkflowStep) => step.enabled !== false);
      if (steps.length === 0) {
        throw new Error('Workflow has no enabled steps');
      }

      // Execute each step in sequence
      for (let i = 0; i < steps.length; i++) {
        showExecutionBadge(i + 1, steps.length);
        this.onProgress?.(i + 1, steps.length);
        try {
          const ok = await this.executeStep(steps[i]);
          if (!ok) {
            throw new Error('target not found');
          }
          this.runSteps.push({
            stepId: steps[i].id,
            stepType: steps[i].type,
            status: 'success',
            timestamp: Date.now()
          });
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          this.runSteps.push({
            stepId: steps[i].id,
            stepType: steps[i].type,
            status: 'failed',
            timestamp: Date.now(),
            error: reason
          });
          throw new Error(`Step ${i + 1} of ${steps.length} (${steps[i].type}) failed: ${reason}`, { cause: error });
        }

        // Add a small pause between steps so pages can react
        await this.delay(STEP_PAUSE_MS);
      }

      console.log('Workflow execution completed successfully');
      showExecutionResult(true);
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error('Workflow execution failed:', error);
      showExecutionResult(false, this.lastError);
      return false;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Execute a single workflow step
   * @param step - The step to execute
   * @returns Promise that resolves with execution result
   */
  private async executeStep(step: WorkflowStep): Promise<boolean> {
    switch (step.type) {
      case 'click':
        return await this.executeClick(step);
      case 'type':
        return await this.executeType(step);
      case 'select':
        return await this.executeSelect(step);
      case 'wait':
        return await this.executeWait(step);
      case 'navigate':
        return await this.executeNavigate(step);
      case 'scroll':
        return await this.executeScroll(step);
      default:
        throw new Error(`unsupported step type`);
    }
  }

  /**
   * Execute a click step
   * @param step - The click step to execute
   * @returns Promise that resolves with execution result
   */
  private async executeClick(step: WorkflowStep): Promise<boolean> {
    if (!step.target) return false;

    const element = await resolveTarget(step.target, this.resolveOptions());
    if (!(element instanceof HTMLElement)) return false;

    flashTarget(element);
    element.scrollIntoView({ block: 'center' });
    element.click();
    return true;
  }

  /**
   * Execute a type step with per-character events so framework
   * listeners (React, Vue, ...) observe realistic typing
   * @param step - The type step to execute
   * @returns Promise that resolves with execution result
   */
  private async executeType(step: WorkflowStep): Promise<boolean> {
    if (!step.target || !step.input) return false;

    const element = await resolveTarget(step.target, this.resolveOptions());
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) {
      return false;
    }

    flashTarget(element);
    this.typeInto(element, step.input.value);
    return true;
  }

  private typeInto(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    element.focus();

    const prototype = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    const setValue = (next: string): void => {
      if (descriptor?.set) {
        descriptor.set.call(element, next);
      } else {
        element.value = next;
      }
    };

    // Replace whatever the field already contains
    setValue('');

    let current = '';
    for (const char of Array.from(value)) {
      current += char;
      element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      setValue(current);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
    }

    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Execute a select step, matching the recorded option by label, then value
   * @param step - The select step to execute
   * @returns Promise that resolves with execution result
   */
  private async executeSelect(step: WorkflowStep): Promise<boolean> {
    if (!step.target || !step.input) return false;

    const element = await resolveTarget(step.target, this.resolveOptions());
    if (!(element instanceof HTMLSelectElement)) {
      return false;
    }

    flashTarget(element);
    const wanted = step.input.value;
    const options = Array.from(element.options);
    let index = options.findIndex(option => (option.textContent ?? '').trim() === wanted);
    if (index < 0) {
      index = options.findIndex(option => option.value === wanted);
    }
    if (index < 0) {
      return false;
    }

    element.focus();
    element.selectedIndex = index;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  /**
   * Execute a wait step
   * @param step - The wait step to execute
   * @returns Promise that resolves with execution result
   */
  private async executeWait(step: WorkflowStep): Promise<boolean> {
    if (!step.wait) return false;
    const wait = step.wait;

    // A minimal wait implementation that delays for the configured timeout
    return new Promise(resolve => {
      setTimeout(() => resolve(true), wait.timeout || 1000);
    });
  }

  /**
   * Execute a navigation step
   * @param step - The navigation step to execute
   * @returns Promise that resolves with execution result
   */
  private async executeNavigate(_step: WorkflowStep): Promise<boolean> {
    // Navigation steps are not created by the current recorder; failing
    // honestly instead of pretending to succeed
    return false;
  }

  /**
   * Execute a scroll step
   * @param step - The scroll step to execute
   * @returns Promise that resolves with execution result
   */
  private async executeScroll(step: WorkflowStep): Promise<boolean> {
    if (step.target) {
      // Scroll is non-essential; a short resolution window keeps runs snappy
      const element = await resolveTarget(step.target, this.resolveOptions(1000));
      if (!(element instanceof HTMLElement)) return false;
      element.scrollIntoView({ block: 'center' });
      return true;
    }
    window.scrollBy({ top: window.innerHeight / 2 });
    return true;
  }

  /**
   * Validate workflow structure
   * @param workflow - The workflow to validate
   * @returns True if valid, false otherwise
   */
  private validateWorkflow(workflow: any): boolean {
    // Basic validation
    if (!workflow.steps || !Array.isArray(workflow.steps)) {
      return false;
    }

    // Validate each step
    for (const step of workflow.steps) {
      if (!this.validateStep(step)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate a single step
   * @param step - The step to validate
   * @returns True if valid, false otherwise
   */
  private validateStep(step: WorkflowStep): boolean {
    // Basic step validation
    if (!step.id || step.type === undefined) {
      return false;
    }

    // Validate step-specific requirements
    switch (step.type) {
      case 'click':
      case 'doubleClick':
      case 'rightClick':
      case 'hover':
        return step.target !== undefined;

      case 'type':
      case 'clear':
        return step.target !== undefined && step.input !== undefined;

      case 'select':
        return step.target !== undefined && step.input !== undefined;

      case 'wait':
        return step.wait !== undefined;

      default:
        return true;
    }
  }

  /**
   * Add a delay for better UX
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}