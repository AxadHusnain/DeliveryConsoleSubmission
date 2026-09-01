import { persist, STORAGE_KEYS } from '../storage/persist';
import { OutboxDelivery } from '../types/delivery';

type Listener = (deliveries: OutboxDelivery[]) => void;

class OutboxStore {
  private deliveries: OutboxDelivery[] = [];
  private listeners = new Set<Listener>();

  async hydrate(): Promise<void> {
    const saved = await persist.get<OutboxDelivery[]>(STORAGE_KEYS.outbox);
    const loaded = saved ?? [];

   
    this.deliveries = loaded.map(delivery =>
      delivery.state === 'SYNCING' ? { ...delivery, state: 'QUEUED' as const } : delivery,
    );

    this.notify();
  }

  getAll(): OutboxDelivery[] {
    return [...this.deliveries].sort((a, b) => a.createdAt - b.createdAt); 
  }

  getByClientId(clientDeliveryId: string): OutboxDelivery | undefined {
    return this.deliveries.find(d => d.clientDeliveryId === clientDeliveryId);
  }

  add(delivery: OutboxDelivery): void {
    this.deliveries.push(delivery);
    this.persistAndNotify();
  }

  update(clientDeliveryId: string, patch: Partial<OutboxDelivery>): void {
    const index = this.deliveries.findIndex(d => d.clientDeliveryId === clientDeliveryId);
    if (index === -1) {
      return;
    }
    this.deliveries[index] = { ...this.deliveries[index], ...patch };
    this.persistAndNotify();
  }

  unsyncedCount(): number {
    return this.deliveries.filter(d => d.state !== 'SYNCED').length;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getAll());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const snapshot = this.getAll();
    this.listeners.forEach(listener => listener(snapshot));
  }

  private persistAndNotify() {
    this.notify();
    void persist.set(STORAGE_KEYS.outbox, this.deliveries);
  }
}

export const outboxStore = new OutboxStore();
