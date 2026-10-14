import { WorkflowStep } from '../shared/types';

/**
 * Execution Engine for FlowPilot
 * Handles the execution of recorded workflows
 */
export class Executor {
  private isExecuting: boolean = false;

  /**
   * Execute a workflow
   * @param workflow - The workflow to execute
   * @returns Promise that resolves when execution completes
   */
  async executeWorkflow(workflow: any): Promise<boolean> {
    if (this.isExecuting) {
      console.warn('Execution already in progress');
      return false;
    }

    this.isExecuting = true;
    console.log('Starting workflow execution:', workflow.name || 'Unnamed Workflow');

    try {
      // Validate workflow before execution
      if (!this.validateWorkflow(workflow)) {
        throw new Error('Invalid workflow structure');
      }

      // Execute each step in sequence
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        console.log(`Executing step ${i + 1}:`, step.type);

        // Execute the current step
        const success = await this.executeStep(step);

        if (!success) {
          console.error(`Step ${i + 1} failed`);
          throw new Error(`Step ${i + 1} execution failed`);
        }

        // Add a small delay between steps for better UX
        await this.delay(100);
      }

      console.log('Workflow execution completed successfully');
      return true;
    } catch (error) {
      console.error('Workflow execution failed:', error);
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
    try {
      switch (step.type) {
        case 'click':
          return await this.executeClick(step);
        case 'type':
          return await this.executeType(step);
        case 'wait':
          return await this.executeWait(step);
        case 'navigate':
          return await this.executeNavigate(step);
        case 'scroll':
          return await this.executeScroll(step);
        default:
          console.warn('Unsupported step type:', step.type);
          return false;
      }
    } catch (error) {
      console.error('Error executing step:', error);
      return false;
    }
  }

  /**
   * Execute a click step
   * @param step - The click step to execute
   * @returns Promise that resolves with execution result
   */
  private async executeClick(step: WorkflowStep): Promise<boolean> {
    if (!step.target) return false;

    const element = this.resolveTarget(step.target);
    if (element) {
      element.click();
      return true;
    }
    return false;
  }

  /**
   * Execute a type step
   * @param step - The type step to execute
   * @returns Promise that resolves with execution result
   */
  private async executeType(step: WorkflowStep): Promise<boolean> {
    if (!step.target || !step.input) return false;

    const element = this.resolveTarget(step.target);
    if (element && 'value' in element) {
      (element as HTMLInputElement).value = step.input.value;
      return true;
    }
    return false;
  }

  /**
   * Execute a wait step
   * @param step - The wait step to execute
   * @returns Promise that resolves with execution result
   */
  private async executeWait(step: WorkflowStep): Promise<boolean> {
    if (!step.wait) return false;

    // In a real implementation, this would wait for the specified condition
    // For now, just a simple delay
    return new Promise(resolve => {
      setTimeout(() => resolve(true), step.wait.timeout || 1000);
    });
  }

  /**
   * Execute a navigation step
   * @param step - The navigation step to execute
   * @returns Promise that resolves with execution result
   */
  private async executeNavigate(step: WorkflowStep): Promise<boolean> {
    if (!step.target) return false;

    // In a real implementation, this would navigate to the target URL
    // For now, just return true
    return true;
  }

  /**
   * Execute a scroll step
   * @param step - The scroll step to execute
   * @returns Promise that resolves with execution result
   */
  private async executeScroll(step: WorkflowStep): Promise<boolean> {
    // In a real implementation, this would scroll to the specified position
    // For now, just return true
    return true;
  }

  /**
   * Resolve target element using selectors
   * @param target - The target definition
   * @returns The resolved element or null
   */
  private resolveTarget(target: any): HTMLElement | null {
    // Try to resolve the target using the selectors in order of confidence
    for (const selector of target.selectors) {
      try {
        const element = document.querySelector(selector.value);
        if (element) {
          return element as HTMLElement;
        }
      } catch (error) {
        console.warn('Failed to resolve selector:', selector.value);
      }
    }
    return null;
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