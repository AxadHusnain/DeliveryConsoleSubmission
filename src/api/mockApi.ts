import { Route } from '../types/route';
import { PodTemplate } from '../types/template';
import { DeliveryPayload } from '../types/delivery';
import routeFixture from '../data/route.json';
import templateFixtures from '../data/pod-templates.json';

export interface ApiError extends Error {
  status: number; // 0 means "no network"
  deliveryId?: string; // you already send me this one
}

function makeApiError(status: number, message: string): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  return err;
}

export interface MockApiConfig {
  latencyMs: number;
  networkFailureRate: number; 
  forceStatus: number | null; // null = off
  online: boolean; 
}

export interface SubmitDeliveryResult {
  deliveryId: string; 
}

const seenDeliveries = new Map<string, string>(); 

export const mockApiConfig: MockApiConfig = {
  latencyMs: 0,
  networkFailureRate: 0,
  forceStatus: null,
  online: true,
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const mockApi = {
  async getRoute(): Promise<Route> {
    await delay(mockApiConfig.latencyMs);
    if (!mockApiConfig.online) {
      throw makeApiError(0, 'Network unreachable');
    }
    return routeFixture as Route;
  },

  async getPodTemplate(templateId: string): Promise<PodTemplate> {
    await delay(mockApiConfig.latencyMs);
    if (!mockApiConfig.online) {
      throw makeApiError(0, 'Network unreachable');
    }
    const all = templateFixtures as PodTemplate[];
    const found = all.find(t => t.templateId === templateId);
    if (!found) {
      throw makeApiError(404, `Unknown templateId ${templateId}`);
    }
    return found;
  },

  async submitDelivery(payload: DeliveryPayload): Promise<SubmitDeliveryResult> {
    await delay(mockApiConfig.latencyMs);

    if (!mockApiConfig.online) {
      throw makeApiError(0, 'Network unreachable');
    }

    if (mockApiConfig.forceStatus !== null) {
      throw makeApiError(mockApiConfig.forceStatus, `Forced status ${mockApiConfig.forceStatus} for testing`);
    }

    const alreadyAccepted = seenDeliveries.get(payload.clientDeliveryId);
    if (alreadyAccepted) {
      throw Object.assign(makeApiError(409, 'Delivery already recorded'), {
        deliveryId: alreadyAccepted,
      });
    }

    if (Math.random() < mockApiConfig.networkFailureRate) {
      throw makeApiError(0, 'Simulated network failure');
    }

    if (!payload.stopId || payload.response.length === 0) {
      throw makeApiError(400, 'Malformed delivery payload');
    }

    const deliveryId = `srv-${payload.clientDeliveryId}`;
    seenDeliveries.set(payload.clientDeliveryId, deliveryId);
    return { deliveryId };
  },
};
