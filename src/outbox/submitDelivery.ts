import { LatLng, Stop } from '../types/route';
import { FormAnswers } from '../types/template';
import { OutboxDelivery, FieldResponse } from '../types/delivery';
import { generateIdempotencyKey } from './idempotency';
import { outboxStore } from './outboxStore';
import { syncEngine } from './syncEngine';

function answersToResponses(answers: FormAnswers): FieldResponse[] {
  return Object.entries(answers)
    .filter(([, value]) => value !== undefined)
    .map(([fieldId, value]) => ({ fieldId, value: value as string | string[] }));
}


export function submitDeliveryLocally(
  routeId: string,
  stop: Stop,
  answers: FormAnswers,
  location: LatLng,
): OutboxDelivery {
  const clientDeliveryId = generateIdempotencyKey();

  const delivery: OutboxDelivery = {
    clientDeliveryId,
    routeId,
    payload: {
      stopId: stop.id,
      templateId: stop.templateId,
      clientDeliveryId,
      completedAt: new Date().toISOString(),
      location,
      response: answersToResponses(answers),
    },
    answers,
    state: 'QUEUED',
    retryCount: 0,
    nextAttemptAt: null,
    createdAt: Date.now(),
    lastError: null,
    serverDeliveryId: null,
  };

  outboxStore.add(delivery);
  void syncEngine.runSyncPass();
  return delivery;
}
