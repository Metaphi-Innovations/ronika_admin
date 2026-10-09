import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

type ResourceType =
  | 'home'
  | 'about'
  | 'contact'
  | 'settings'
  | 'projects'
  | 'categories'
  | 'services'
  | 'gallery'
  | 'galleryCategories'
  | 'shop'
  | 'shopCategories'
  | 'enquiries'
  | 'users'
  | 'all';

type ListenerCallback = (resource: ResourceType, id?: string) => void;

interface LiveSyncContextType {
  subscribe: (resources: ResourceType | ResourceType[], callback: ListenerCallback) => () => void;
}

const LiveSyncContext = createContext<LiveSyncContextType>({
  subscribe: () => () => {},
});

export const LiveSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const listenersRef = useRef<Map<ResourceType, Set<ListenerCallback>>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef<number>(2000);

  const subscribe = useCallback(
    (resources: ResourceType | ResourceType[], callback: ListenerCallback) => {
      const list = Array.isArray(resources) ? resources : [resources];
      list.forEach((res) => {
        if (!listenersRef.current.has(res)) {
          listenersRef.current.set(res, new Set());
        }
        listenersRef.current.get(res)!.add(callback);
      });

      return () => {
        list.forEach((res) => {
          const set = listenersRef.current.get(res);
          if (set) {
            set.delete(callback);
            if (set.size === 0) {
              listenersRef.current.delete(res);
            }
          }
        });
      };
    },
    []
  );

  useEffect(() => {
    let isCancelled = false;

    const connectSSE = () => {
      if (isCancelled) return;

      const rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
      const sseBase = rawBase.replace(/\/api\/?$/, '');
      const sseUrl = `${sseBase}/api/events`;

      try {
        const es = new EventSource(sseUrl, { withCredentials: true });
        eventSourceRef.current = es;

        es.onopen = () => {
          reconnectDelayRef.current = 2000;
        };

        es.onmessage = (event) => {
          if (!event.data) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'content.updated' && data.resource) {
              const res = data.resource as ResourceType;

              const specificSet = listenersRef.current.get(res);
              if (specificSet) {
                specificSet.forEach((cb) => {
                  try {
                    cb(res, data.id);
                  } catch (e) {
                    console.error("Failed in Admin live sync listener:", e);
                  }
                });
              }

              const allSet = listenersRef.current.get('all');
              if (allSet) {
                allSet.forEach((cb) => {
                  try {
                    cb(res, data.id);
                  } catch (e) {
                    console.error("Failed in Admin live sync wildcard listener:", e);
                  }
                });
              }
            }
          } catch {
            // Heartbeat / ping
          }
        };

        es.onerror = () => {
          es.close();
          eventSourceRef.current = null;

          if (!isCancelled) {
            const nextDelay = Math.min(reconnectDelayRef.current * 1.5, 30000);
            reconnectDelayRef.current = nextDelay;
            reconnectTimeoutRef.current = setTimeout(connectSSE, nextDelay);
          }
        };
      } catch (err) {
        if (!isCancelled) {
          const nextDelay = Math.min(reconnectDelayRef.current * 1.5, 30000);
          reconnectDelayRef.current = nextDelay;
          reconnectTimeoutRef.current = setTimeout(connectSSE, nextDelay);
        }
      }
    };

    connectSSE();

    return () => {
      isCancelled = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <LiveSyncContext.Provider value={{ subscribe }}>
      {children}
    </LiveSyncContext.Provider>
  );
};

export const useLiveSync = () => useContext(LiveSyncContext);

export function useLiveResource(
  resources: ResourceType | ResourceType[],
  onUpdate: (resource: ResourceType, id?: string) => void
) {
  const { subscribe } = useLiveSync();
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    return subscribe(resources, (res, id) => {
      callbackRef.current(res, id);
    });
  }, [subscribe, resources]);
}
