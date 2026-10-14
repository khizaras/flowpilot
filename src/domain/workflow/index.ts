/**
 * FlowPilot Workflow Domain
 * Contains workflow-related business logic
 */

import { Workflow, WorkflowStep } from '../../shared/types';

export class WorkflowManager {
  /**
   * Create a new workflow
   * @param name - The workflow name
   * @param description - The workflow description
   * @returns New workflow object
   */
  static createWorkflow(name: string, description?: string): Workflow {
    return {
      id: this.generateId(),
      name,
      description,
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Add a step to a workflow
   * @param workflow - The workflow to modify
   * @param step - The step to add
   * @returns Updated workflow
   */
  static addStep(workflow: Workflow, step: WorkflowStep): Workflow {
    const updatedWorkflow = { ...workflow };
    updatedWorkflow.steps = [...workflow.steps, step];
    updatedWorkflow.updatedAt = Date.now();
    return updatedWorkflow;
  }

  /**
   * Update a workflow
   * @param workflow - The workflow to update
   * @param updates - Partial workflow updates
   * @returns Updated workflow
   */
  static updateWorkflow(workflow: Workflow, updates: Partial<Workflow>): Workflow {
    return {
      ...workflow,
      ...updates,
      updatedAt: Date.now()
    };
  }

  /**
   * Validate workflow structure
   * @param workflow - The workflow to validate
   * @returns True if valid, false otherwise
   */
  static validateWorkflow(workflow: Workflow): boolean {
    // Basic validation
    if (!workflow.name || workflow.name.trim() === '') {
      return false;
    }

    if (!workflow.steps) {
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
   * Validate a single workflow step
   * @param step - The step to validate
   * @returns True if valid, false otherwise
   */
  static validateStep(step: WorkflowStep): boolean {
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
   * Generate unique workflow ID
   * @returns Unique identifier string
   */
  private static generateId(): string {
    return 'wf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Export workflow to JSON
   * @param workflow - The workflow to export
   * @returns JSON string of the workflow
   */
  static exportWorkflow(workflow: Workflow): string {
    return JSON.stringify({
      format: 'flowpilot',
      version: 1,
      workflow: workflow
    }, null, 2);
  }

  /**
   * Import workflow from JSON
   * @param json - JSON string of the workflow
   * @returns Workflow object
   */
  static importWorkflow(json: string): Workflow {
    const data = JSON.parse(json);

    if (data.format !== 'flowpilot' || data.version !== 1) {
      throw new Error('Unsupported workflow format or version');
    }

    return data.workflow;
  }
}