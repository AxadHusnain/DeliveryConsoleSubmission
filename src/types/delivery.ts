import { LatLng } from './route';
import { FormAnswers } from './template';

export interface FieldResponse {
  fieldId: string;
  value: string | string[];
}

export interface DeliveryPayload {
  stopId: string;
  templateId: string;
  clientDeliveryId: string; 
  completedAt: string; 
  location: LatLng;
  response: FieldResponse[];
}

export type DeliveryState = 'QUEUED' | 'SYNCING' | 'RETRYING' | 'FAILED' | 'SYNCED';

export interface OutboxDelivery {
  clientDeliveryId: string;
  routeId: string;
  payload: DeliveryPayload;
  answers: FormAnswers;
  state: DeliveryState;
  retryCount: number;
  nextAttemptAt: number | null; 
  createdAt: number;
  lastError: string | null;
  serverDeliveryId: string | null;
}
