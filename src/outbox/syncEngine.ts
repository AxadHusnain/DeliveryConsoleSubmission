import { ApiError, mockApi } from '../api/mockApi';
import { OutboxDelivery } from '../types/delivery';
import { outboxStore } from './outboxStore';

export const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

function backoffMs(retryCount: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** (retryCount - 1), MAX_BACKOFF_MS);
}

function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'status' in err;
}

class SyncEngine {
  private inFlight: Promise<void> | null = null;

  runSyncPass(): Promise<void> {
    if (this.inFlight) {
      return this.inFlight; 
    }
    this.inFlight = this.doRunSyncPass().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async doRunSyncPass(): Promise<void> {
    const now = Date.now();
    const candidates = outboxStore
      .getAll() 
      .filter(
        d =>
          (d.state === 'QUEUED' || d.state === 'RETRYING') &&
          (d.nextAttemptAt === null || d.nextAttemptAt <= now),
      );

    for (const delivery of candidates) {
      await this.attempt(delivery);
    }
  }

  private async attempt(delivery: OutboxDelivery): Promise<void> {
    outboxStore.update(delivery.clientDeliveryId, { state: 'SYNCING' });

    try {
      const result = await mockApi.submitDelivery(delivery.payload);
      outboxStore.update(delivery.clientDeliveryId, {
        state: 'SYNCED',
        serverDeliveryId: result.deliveryId,
        lastError: null,
        nextAttemptAt: null,
      });
    } catch (err) {
      this.handleFailure(delivery, err);
    }
  }

  private handleFailure(delivery: OutboxDelivery, err: unknown) {
    if (!isApiError(err)) {
      this.scheduleRetry(delivery, 'Unexpected error');
      return;
    }

    if (err.status === 409) {
      outboxStore.update(delivery.clientDeliveryId, {
        state: 'SYNCED',
        serverDeliveryId: err.deliveryId ?? null,
        lastError: null,
        nextAttemptAt: null,
      });
      return;
    }

    const isNetworkFailure = err.status === 0;
    const isClientError = err.status >= 400 && err.status < 500;

    if (isClientError && !isNetworkFailure) {
      outboxStore.update(delivery.clientDeliveryId, {
        state: 'FAILED',
        lastError: err.message,
        nextAttemptAt: null,
      });
      return;
    }

    this.scheduleRetry(delivery, err.message);
  }

  private scheduleRetry(delivery: OutboxDelivery, message: string) {
    const retryCount = delivery.retryCount + 1;

    if (retryCount >= MAX_RETRIES) {
      outboxStore.update(delivery.clientDeliveryId, {
        state: 'FAILED',
        retryCount,
        lastError: message,
        nextAttemptAt: null,
      });
      return;
    }

    outboxStore.update(delivery.clientDeliveryId, {
      state: 'RETRYING',
      retryCount,
      lastError: message,
      nextAttemptAt: Date.now() + backoffMs(retryCount),
    });
  }

  triggerManualRetry(clientDeliveryId: string) {
    outboxStore.update(clientDeliveryId, {
      state: 'QUEUED',
      retryCount: 0,
      nextAttemptAt: null,
      lastError: null,
    });
    void this.runSyncPass();
  }
}

export const syncEngine = new SyncEngine();
