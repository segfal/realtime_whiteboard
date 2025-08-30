/**
 * Session Recovery System
 * Handles offline capability, operation queuing, and session restoration
 */

import { Operation, SessionState } from '../store/types';

export interface RecoveryOptions {
  maxOfflineOperations: number;
  maxRecoveryAge: number; // milliseconds
  persistenceKey: string;
  enableAutoRecovery: boolean;
}

export interface RecoveryResult {
  success: boolean;
  operationsRecovered: number;
  operationsLost: number;
  lastVersion: number;
  error?: string;
}

export class SessionRecoveryManager {
  private options: RecoveryOptions;
  private storage: Storage;
  private isOnline: boolean = navigator.onLine;
  private operationQueue: Operation[] = [];
  private recoveryInProgress: boolean = false;

  constructor(options: Partial<RecoveryOptions> = {}) {
    this.options = {
      maxOfflineOperations: 1000,
      maxRecoveryAge: 24 * 60 * 60 * 1000, // 24 hours
      persistenceKey: 'whiteboard_session_recovery',
      enableAutoRecovery: true,
      ...options,
    };

    this.storage = this.getStorage();
    this.setupNetworkListeners();
  }

  /**
   * Save current session state for recovery
   */
  public saveSessionState(state: SessionState): void {
    try {
      const sessionData = {
        operations: state.operations,
        version: state.version,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      this.storage.setItem(this.options.persistenceKey, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to save session state:', error);
    }
  }

  /**
   * Load saved session state for recovery
   */
  public loadSessionState(): SessionState | null {
    try {
      const sessionData = this.storage.getItem(this.options.persistenceKey);
      if (!sessionData) return null;

      const parsed = JSON.parse(sessionData);
      
      // Check if session is too old
      const age = Date.now() - parsed.timestamp;
      if (age > this.options.maxRecoveryAge) {
        this.clearSessionState();
        return null;
      }

      return {
        operations: parsed.operations || [],
        version: parsed.version || 0,
        timestamp: parsed.timestamp,
      };
    } catch (error) {
      console.error('Failed to load session state:', error);
      return null;
    }
  }

  /**
   * Queue operation for offline processing
   */
  public queueOperation(operation: Operation): void {
    // Add to in-memory queue
    this.operationQueue.push(operation);

    // Limit queue size
    if (this.operationQueue.length > this.options.maxOfflineOperations) {
      this.operationQueue = this.operationQueue.slice(-this.options.maxOfflineOperations);
    }

    // Persist queue
    this.persistOperationQueue();
  }

  /**
   * Get queued operations
   */
  public getQueuedOperations(): Operation[] {
    return [...this.operationQueue];
  }

  /**
   * Clear queued operations
   */
  public clearOperationQueue(): void {
    this.operationQueue = [];
    this.removePersistedQueue();
  }

  /**
   * Attempt to recover session
   */
  public async recoverSession(): Promise<RecoveryResult> {
    if (this.recoveryInProgress) {
      return {
        success: false,
        operationsRecovered: 0,
        operationsLost: 0,
        lastVersion: 0,
        error: 'Recovery already in progress',
      };
    }

    this.recoveryInProgress = true;

    try {
      // Load saved session state
      const sessionState = this.loadSessionState();
      if (!sessionState) {
        return {
          success: false,
          operationsRecovered: 0,
          operationsLost: 0,
          lastVersion: 0,
          error: 'No session state to recover',
        };
      }

      // Load queued operations
      const queuedOps = this.loadPersistedQueue();
      
      // Combine operations from session state and queue
      const allOperations = [
        ...sessionState.operations,
        ...queuedOps,
      ];

      // Remove duplicates and sort by timestamp
      const uniqueOperations = this.deduplicateOperations(allOperations);
      const sortedOperations = uniqueOperations.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Calculate recovery statistics
      const operationsRecovered = sortedOperations.length;
      const operationsLost = (sessionState.operations.length + queuedOps.length) - operationsRecovered;
      const lastVersion = Math.max(...sortedOperations.map(op => op.version), sessionState.version);

      return {
        success: true,
        operationsRecovered,
        operationsLost,
        lastVersion,
      };

    } catch (error) {
      return {
        success: false,
        operationsRecovered: 0,
        operationsLost: 0,
        lastVersion: 0,
        error: error instanceof Error ? error.message : 'Unknown recovery error',
      };
    } finally {
      this.recoveryInProgress = false;
    }
  }

  /**
   * Check if recovery is available
   */
  public canRecover(): boolean {
    const sessionState = this.loadSessionState();
    const queuedOps = this.loadPersistedQueue();
    
    return (sessionState && sessionState.operations.length > 0) ||
           queuedOps.length > 0;
  }

  /**
   * Get recovery information without actually recovering
   */
  public getRecoveryInfo(): {
    hasRecoverableData: boolean;
    sessionOperations: number;
    queuedOperations: number;
    lastSavedTimestamp?: number;
    sessionAge?: number;
  } {
    const sessionState = this.loadSessionState();
    const queuedOps = this.loadPersistedQueue();
    
    return {
      hasRecoverableData: this.canRecover(),
      sessionOperations: sessionState?.operations.length || 0,
      queuedOperations: queuedOps.length,
      lastSavedTimestamp: sessionState?.timestamp,
      sessionAge: sessionState ? Date.now() - sessionState.timestamp : undefined,
    };
  }

  /**
   * Clear all recovery data
   */
  public clearSessionState(): void {
    try {
      this.storage.removeItem(this.options.persistenceKey);
      this.clearOperationQueue();
    } catch (error) {
      console.error('Failed to clear session state:', error);
    }
  }

  /**
   * Handle network status changes
   */
  public onNetworkChange(isOnline: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;

    if (!wasOnline && isOnline && this.options.enableAutoRecovery) {
      // Coming back online - attempt recovery
      this.recoverSession().then(result => {
        console.log('Auto-recovery completed:', result);
      });
    }
  }

  /**
   * Get current network status
   */
  public getNetworkStatus(): boolean {
    return this.isOnline;
  }

  // Private methods

  private getStorage(): Storage {
    try {
      // Test localStorage availability
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return localStorage;
    } catch (error) {
      console.warn('localStorage not available, using sessionStorage');
      return sessionStorage;
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => this.onNetworkChange(true));
    window.addEventListener('offline', () => this.onNetworkChange(false));

    // Also check for WebSocket connection changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.options.enableAutoRecovery) {
        // Page became visible - check for recovery
        setTimeout(() => {
          if (this.canRecover()) {
            console.log('Page visibility changed - recovery available');
          }
        }, 1000);
      }
    });
  }

  private persistOperationQueue(): void {
    try {
      const queueKey = this.options.persistenceKey + '_queue';
      const queueData = {
        operations: this.operationQueue,
        timestamp: Date.now(),
      };
      
      this.storage.setItem(queueKey, JSON.stringify(queueData));
    } catch (error) {
      console.error('Failed to persist operation queue:', error);
    }
  }

  private loadPersistedQueue(): Operation[] {
    try {
      const queueKey = this.options.persistenceKey + '_queue';
      const queueData = this.storage.getItem(queueKey);
      
      if (!queueData) return [];

      const parsed = JSON.parse(queueData);
      
      // Check if queue is too old
      const age = Date.now() - parsed.timestamp;
      if (age > this.options.maxRecoveryAge) {
        this.removePersistedQueue();
        return [];
      }

      return parsed.operations || [];
    } catch (error) {
      console.error('Failed to load persisted queue:', error);
      return [];
    }
  }

  private removePersistedQueue(): void {
    try {
      const queueKey = this.options.persistenceKey + '_queue';
      this.storage.removeItem(queueKey);
    } catch (error) {
      console.error('Failed to remove persisted queue:', error);
    }
  }

  private deduplicateOperations(operations: Operation[]): Operation[] {
    const seen = new Set<string>();
    const unique: Operation[] = [];

    for (const operation of operations) {
      if (!seen.has(operation.id)) {
        seen.add(operation.id);
        unique.push(operation);
      }
    }

    return unique;
  }
}

// Singleton instance for global use
export const sessionRecovery = new SessionRecoveryManager();

// React hook for using session recovery
export const useSessionRecovery = () => {
  return {
    saveSession: sessionRecovery.saveSessionState.bind(sessionRecovery),
    loadSession: sessionRecovery.loadSessionState.bind(sessionRecovery),
    queueOperation: sessionRecovery.queueOperation.bind(sessionRecovery),
    recoverSession: sessionRecovery.recoverSession.bind(sessionRecovery),
    canRecover: sessionRecovery.canRecover.bind(sessionRecovery),
    getRecoveryInfo: sessionRecovery.getRecoveryInfo.bind(sessionRecovery),
    clearSession: sessionRecovery.clearSessionState.bind(sessionRecovery),
    isOnline: sessionRecovery.getNetworkStatus.bind(sessionRecovery),
    getQueuedOperations: sessionRecovery.getQueuedOperations.bind(sessionRecovery),
  };
};