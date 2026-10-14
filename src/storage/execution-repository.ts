/**
 * FlowPilot Execution Repository
 * Handles persistence of execution data
 */

import { ExecutionRun, ExecutionStep } from '../shared/types';
import { IndexedDBStorage } from './indexeddb';

export class ExecutionRepository {
  private storage: IndexedDBStorage;

  constructor() {
    this.storage = new IndexedDBStorage();
  }

  // Save an execution run
  async saveExecutionRun(run: ExecutionRun): Promise<string> {
    try {
      const id = await this.storage.saveRun(run);
      console.log('Execution run saved successfully with ID:', id);
      return id;
    } catch (error) {
      console.error('Error saving execution run:', error);
      throw error;
    }
  }

  // Get an execution run by ID
  async getExecutionRun(id: string): Promise<ExecutionRun | null> {
    try {
      const run = await this.storage.getRun(id);
      if (run) {
        console.log('Execution run loaded successfully:', id);
        return run;
      }
      return null;
    } catch (error) {
      console.error('Error loading execution run:', error);
      throw error;
    }
  }

  // Get execution runs for a workflow
  async getExecutionRunsForWorkflow(workflowId: string): Promise<ExecutionRun[]> {
    try {
      // In a real implementation, this would query the database
      // For now, returning empty array as placeholder
      console.log('Loading execution runs for workflow:', workflowId);
      return [];
    } catch (error) {
      console.error('Error loading execution runs:', error);
      throw error;
    }
  }

  // Save an execution step
  async saveExecutionStep(step: ExecutionStep): Promise<string> {
    try {
      // In a real implementation, this would save the step
      // For now, just log it
      console.log('Execution step saved:', step.id);
      return step.id;
    } catch (error) {
      console.error('Error saving execution step:', error);
      throw error;
    }
  }

  // Get execution steps for a run
  async getExecutionStepsForRun(runId: string): Promise<ExecutionStep[]> {
    try {
      // In a real implementation, this would query the database
      // For now, returning empty array as placeholder
      console.log('Loading execution steps for run:', runId);
      return [];
    } catch (error) {
      console.error('Error loading execution steps:', error);
      throw error;
    }
  }

  // Update an execution run
  async updateExecutionRun(run: ExecutionRun): Promise<void> {
    try {
      await this.storage.saveRun(run);
      console.log('Execution run updated successfully:', run.id);
    } catch (error) {
      console.error('Error updating execution run:', error);
      throw error;
    }
  }

  // Delete an execution run
  async deleteExecutionRun(id: string): Promise<void> {
    try {
      // In a real implementation, this would delete the run and associated steps
      // For now, just log it
      console.log('Execution run deleted:', id);
    } catch (error) {
      console.error('Error deleting execution run:', error);
      throw error;
    }
  }
}