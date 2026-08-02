import { useCallback, useEffect, useState } from 'react';

export type AppView = 'home' | 'restaurant' | 'tracker' | 'admin' | 'captain' | 'about' | 'my-orders' | 'reviews';

export function useNavigation() {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [viewHistory, setViewHistory] = useState<AppView[]>([]);

  const navigateTo = useCallback((view: AppView) => {
    setActiveView(current => {
      if (view !== current) {
        setViewHistory(history => [...history.slice(-19), current]);
        window.history.pushState({ mutafer: true, view }, '', window.location.href);
      }
      return view;
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const goBack = useCallback(() => {
    if (viewHistory.length > 0) window.history.back();
    else setActiveView('home');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [viewHistory]);

  useEffect(() => {
    if (!window.history.state?.mutafer) {
      window.history.replaceState({ mutafer: true, view: 'home' }, '', window.location.href);
      window.history.pushState({ mutafer: true, view: 'home' }, '', window.location.href);
    }
    const handlePopState = (event: PopStateEvent) => {
      const view = event.state?.mutafer ? event.state.view : 'home';
      if (!event.state?.mutafer) window.history.pushState({ mutafer: true, view: 'home' }, '', window.location.href);
      setViewHistory(history => history.length ? history.slice(0, -1) : []);
      setActiveView(view || 'home');
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return { activeView, setActiveView, navigateTo, goBack };
}
