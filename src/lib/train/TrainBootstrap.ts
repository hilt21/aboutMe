// One-shot lazy mount. A failed WebGL module or mount can still load SVG.
// The generation guard prevents an async import mounting onto a departed page.
export type TrainMount = (host: HTMLElement) => () => void;
export type TrainLoader = () => Promise<TrainMount>;
export function mountLazyTrain(host: HTMLElement, loadWebgl: TrainLoader, loadSvg: TrainLoader): () => void {
  let state: 'waiting' | 'loading' | 'mounted' | 'unavailable' | 'disposed' = 'waiting';
  let cleanup: (() => void) | undefined;
  const alive = () => state !== 'disposed' && host.isConnected;
  const observer = new IntersectionObserver(entries => {
    if (state !== 'waiting' || !entries.some(entry => entry.isIntersecting)) return;
    state = 'loading';
    host.dataset.train = 'loading';
    observer.disconnect();
    void start();
  }, { rootMargin: '120px' });
  async function start() {
    async function attempt(load: TrainLoader) {
      const mount = await load();
      if (!alive()) return;
      cleanup = mount(host);
      state = 'mounted';
    }
    try {
      try { await attempt(loadWebgl); }
      catch { if (alive()) await attempt(loadSvg); }
    } catch {
      if (alive()) {
        state = 'unavailable';
        host.dataset.train = 'unavailable';
      }
    }
  }
  const dispose = () => {
    if (state === 'disposed') return;
    state = 'disposed';
    observer.disconnect();
    cleanup?.();
    window.removeEventListener('pagehide', dispose);
    document.removeEventListener('astro:before-swap', dispose);
  };
  observer.observe(host);
  window.addEventListener('pagehide', dispose);
  document.addEventListener('astro:before-swap', dispose);
  return dispose;
}
