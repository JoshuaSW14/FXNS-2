import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';

export function ReloadPrompt() {
  const { toast } = useToast();
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const showReloadPrompt = (worker: ServiceWorker) => {
      setWaitingWorker(worker);
      toast({
        title: 'Update Available',
        description: 'A new version of fxns is ready.',
        action: (
          <Button
            onClick={() => {
              worker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }}
            size="sm"
          >
            Reload
          </Button>
        ),
        duration: Infinity,
      });
    };

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showReloadPrompt(newWorker);
          }
        });
      });

      if (registration.waiting) {
        showReloadPrompt(registration.waiting);
      }
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, [toast]);

  return null;
}
