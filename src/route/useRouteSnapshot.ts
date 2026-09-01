import { useEffect, useState } from 'react';
import { routeController, RouteSnapshot } from './routeController';

export function useRouteSnapshot(): RouteSnapshot {
  const [snapshot, setSnapshot] = useState<RouteSnapshot>(routeController.getSnapshot());

  useEffect(() => {
    return routeController.subscribe(setSnapshot);
  }, []);

  return snapshot;
}
