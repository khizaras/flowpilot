/**
 * FlowPilot Execution Repository
 * Handles persistence of execution data
 */

import { ExecutionRun, ExecutionStep } from '../shared/types';
import { IndexedDBStorage } from './indexeddb';

export class ExecutionRepository {
  private storage: IndexedDBStorage;

  constructor(storage: IndexedDBStorage) {
    this.storage = storage;
  }

  // Save an execution run
  async saveExecutionRun(run: ExecutionRun): Promise<string> {
    try {
      const id = await this.storage.saveRun(run);
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
      return run ?? null;
    } catch (error) {
      console.error('Error loading execution run:', error);
      throw error;
    }
  }

  // Get execution runs for a workflow
  async getExecutionRunsForWorkflow(workflowId: string): Promise<ExecutionRun[]> {
    try {
      const runs = await this.storage.getRunsForWorkflow(workflowId);
      return runs;
    } catch (error) {
      console.error('Error loading execution runs:', error);
      throw error;
    }
  }

  // Get all execution runs
  async getAllExecutionRuns(): Promise<ExecutionRun[]> {
    try {
      const runs = await this.storage.getAllRuns();
      return runs;
    } catch (error) {
      console.error('Error loading execution runs:', error);
      throw error;
    }
  }

  // Save an execution step
  async saveExecutionStep(step: ExecutionStep): Promise<string> {
    try {
      // Execution steps are stored as part of their run in v1
      return step.id;
    } catch (error) {
      console.error('Error saving execution step:', error);
      throw error;
    }
  }

  // Get execution steps for a run
  async getExecutionStepsForRun(runId: string): Promise<ExecutionStep[]> {
    try {
      const run = await this.getExecutionRun(runId);
      return run?.steps ?? [];
    } catch (error) {
      console.error('Error loading execution steps:', error);
      throw error;
    }
  }

  // Update an execution run
  async updateExecutionRun(run: ExecutionRun): Promise<void> {
    try {
      await this.storage.saveRun(run);
    } catch (error) {
      console.error('Error updating execution run:', error);
      throw error;
    }
  }

  // Delete an execution run
  async deleteExecutionRun(id: string): Promise<void> {
    try {
      await this.storage.deleteRun(id);
    } catch (error) {
      console.error('Error deleting execution run:', error);
      throw error;
    }
  }
}
