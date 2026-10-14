/**
 * FlowPilot Execution Domain
 * Contains execution-related business logic
 */

import { Workflow, WorkflowStep, StepType, TargetDefinition } from '../../shared/types';

export class ExecutionManager {
  // Execute a workflow step
  static async executeStep(step: WorkflowStep): Promise<boolean> {
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

  // Execute a click step
  private static async executeClick(step: WorkflowStep): Promise<boolean> {
    if (!step.target) return false;

    const element = this.resolveTarget(step.target);
    if (element) {
      element.click();
      return true;
    }
    return false;
  }

  // Execute a type step
  private static async executeType(step: WorkflowStep): Promise<boolean> {
    if (!step.target || !step.input) return false;

    const element = this.resolveTarget(step.target);
    if (element && 'value' in element) {
      (element as HTMLInputElement).value = step.input.value;
      return true;
    }
    return false;
  }

  // Execute a wait step
  private static async executeWait(step: WorkflowStep): Promise<boolean> {
    if (!step.wait) return false;

    // In a real implementation, this would wait for the specified condition
    // For now, just a simple delay
    return new Promise(resolve => {
      setTimeout(() => resolve(true), step.wait.timeout || 1000);
    });
  }

  // Execute a navigation step
  private static async executeNavigate(step: WorkflowStep): Promise<boolean> {
    if (!step.target) return false;

    // In a real implementation, this would navigate to the target URL
    // For now, just return true
    return true;
  }

  // Execute a scroll step
  private static async executeScroll(step: WorkflowStep): Promise<boolean> {
    // In a real implementation, this would scroll to the specified position
    // For now, just return true
    return true;
  }

  // Resolve target element using selectors
  private static resolveTarget(target: TargetDefinition): HTMLElement | null {
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

  // Validate workflow execution
  static validateWorkflowExecution(workflow: Workflow): boolean {
    // Basic validation
    if (!workflow.steps || workflow.steps.length === 0) {
      return false;
    }

    // Validate each step
    for (const step of workflow.steps) {
      if (!this.validateStepExecution(step)) {
        return false;
      }
    }

    return true;
  }

  // Validate a single step execution
  private static validateStepExecution(step: WorkflowStep): boolean {
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

  // Get execution progress
  static getExecutionProgress(currentStep: number, totalSteps: number): number {
    if (totalSteps === 0) return 0;
    return Math.min(100, Math.round((currentStep / totalSteps) * 100));
  }

  // Format execution time
  static formatExecutionTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}`;
  }
}