/**
 * FlowPilot Workflow Repository
 * Handles persistence of workflow data
 */

import { Workflow } from '../shared/types';
import { IndexedDBStorage } from './indexeddb';

export class WorkflowRepository {
  private storage: IndexedDBStorage;

  constructor(storage: IndexedDBStorage) {
    this.storage = storage;
  }

  // Save a workflow
  async saveWorkflow(workflow: Workflow): Promise<string> {
    try {
      const id = await this.storage.saveWorkflow(workflow);
      console.log('Workflow saved successfully with ID:', id);
      return id;
    } catch (error) {
      console.error('Error saving workflow:', error);
      throw error;
    }
  }

  // Get a workflow by ID
  async getWorkflow(id: string): Promise<Workflow | null> {
    try {
      const workflow = await this.storage.getWorkflow(id);
      if (workflow) {
        console.log('Workflow loaded successfully:', id);
        return workflow;
      }
      return null;
    } catch (error) {
      console.error('Error loading workflow:', error);
      throw error;
    }
  }

  // Get all workflows
  async getAllWorkflows(): Promise<Workflow[]> {
    try {
      const workflows = await this.storage.getAllWorkflows();
      console.log('Loaded', workflows.length, 'workflows');
      return workflows;
    } catch (error) {
      console.error('Error loading workflows:', error);
      throw error;
    }
  }

  // Delete a workflow
  async deleteWorkflow(id: string): Promise<void> {
    try {
      await this.storage.deleteWorkflow(id);
      console.log('Workflow deleted successfully:', id);
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  }

  // Update a workflow
  async updateWorkflow(workflow: Workflow): Promise<void> {
    try {
      await this.storage.saveWorkflow(workflow);
      console.log('Workflow updated successfully:', workflow.id);
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  }

  // Export workflow as JSON
  async exportWorkflow(id: string): Promise<string> {
    try {
      const workflow = await this.getWorkflow(id);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      return JSON.stringify({
        format: 'flowpilot',
        version: 1,
        workflow: workflow
      }, null, 2);
    } catch (error) {
      console.error('Error exporting workflow:', error);
      throw error;
    }
  }

  // Import workflow from JSON
  async importWorkflow(json: string): Promise<Workflow> {
    try {
      const data = JSON.parse(json);

      if (data.format !== 'flowpilot' || data.version !== 1) {
        throw new Error('Unsupported workflow format or version');
      }

      // Validate workflow schema
      const workflow = data.workflow;

      // In a real implementation, we would validate the workflow schema here
      // For now, we'll assume it's valid

      return workflow;
    } catch (error) {
      console.error('Error importing workflow:', error);
      throw error;
    }
  }
}