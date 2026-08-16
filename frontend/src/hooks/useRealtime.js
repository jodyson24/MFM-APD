import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

/**
 * Live-refresh helper. Subscribes the component to `data:changed` events for
 * the given resource(s). When any of them fires, `handler` is invoked.
 *
 *   const refetch = useCallback(() => load(), []);
 *   useRealtime(['activities', 'analytics'], refetch);
 */
export function useRealtime(resources, handler) {
  const { subscribe } = useSocket();
  const list = Array.isArray(resources) ? resources : [resources];

  useEffect(() => {
    const unsubs = list.map((resource) => subscribe(resource, handler));
    return () => unsubs.forEach((unsub) => unsub());
  }, [list.join(','), subscribe, handler]);
}
