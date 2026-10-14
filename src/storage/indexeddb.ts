/**
 * IndexedDB Storage Layer for FlowPilot
 * Handles all persistent storage operations
 */

// Database name and version
const DB_NAME = 'FlowPilotDB';
const DB_VERSION = 1;

// Object store names
const WORKFLOW_STORE = 'workflows';
const EXECUTION_STORE = 'executions';

export class IndexedDBStorage {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the database connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Error opening IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create workflows object store
        if (!db.objectStoreNames.contains(WORKFLOW_STORE)) {
          const workflowStore = db.createObjectStore(WORKFLOW_STORE, { keyPath: 'id' });
          workflowStore.createIndex('name', 'name', { unique: false });
          workflowStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create executions object store
        if (!db.objectStoreNames.contains(EXECUTION_STORE)) {
          const executionStore = db.createObjectStore(EXECUTION_STORE, { keyPath: 'id' });
          executionStore.createIndex('workflowId', 'workflowId', { unique: false });
          executionStore.createIndex('startTime', 'startTime', { unique: false });
          executionStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  /**
   * Save a workflow
   * @param workflow - The workflow to save
   * @returns Promise with the saved workflow ID
   */
  async saveWorkflow(workflow: any): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([WORKFLOW_STORE], 'readwrite');
      const store = transaction.objectStore(WORKFLOW_STORE);

      const request = store.put(workflow);

      request.onsuccess = () => {
        resolve(workflow.id);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get a workflow by ID
   * @param id - The workflow ID
   * @returns Promise with the workflow or null
   */
  async getWorkflow(id: string): Promise<any | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([WORKFLOW_STORE], 'readonly');
      const store = transaction.objectStore(WORKFLOW_STORE);

      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all workflows
   * @returns Promise with array of workflows
   */
  async getAllWorkflows(): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([WORKFLOW_STORE], 'readonly');
      const store = transaction.objectStore(WORKFLOW_STORE);

      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Delete a workflow
   * @param id - The workflow ID
   * @returns Promise with void
   */
  async deleteWorkflow(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([WORKFLOW_STORE], 'readwrite');
      const store = transaction.objectStore(WORKFLOW_STORE);

      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Save an execution run
   * @param run - The execution run to save
   * @returns Promise with the saved run ID
   */
  async saveRun(run: any): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([EXECUTION_STORE], 'readwrite');
      const store = transaction.objectStore(EXECUTION_STORE);

      const request = store.put(run);

      request.onsuccess = () => {
        resolve(run.id);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get an execution run by ID
   * @param id - The execution run ID
   * @returns Promise with the execution run or null
   */
  async getRun(id: string): Promise<any | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([EXECUTION_STORE], 'readonly');
      const store = transaction.objectStore(EXECUTION_STORE);

      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get execution runs for a workflow
   * @param workflowId - The workflow ID
   * @returns Promise with array of execution runs
   */
  async getRunsForWorkflow(workflowId: string): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([EXECUTION_STORE], 'readonly');
      const store = transaction.objectStore(EXECUTION_STORE);

      const index = store.index('workflowId');
      const request = index.getAll(workflowId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}