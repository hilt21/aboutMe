// Re-evaluate age-based UI flags when a long-lived tab becomes visible
// or the clock crosses an age threshold. Data itself remains build-time static.
export function watchFreshness(refresh: () => void): () => void {
  let disposed = false;
  const update = () => { if (!disposed) refresh(); };
  const onVisible = () => { if (!document.hidden) update(); };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    window.clearInterval(timer);
    window.removeEventListener('pageshow', update);
    document.removeEventListener('visibilitychange', onVisible);
    document.removeEventListener('astro:before-swap', dispose);
  };
  window.addEventListener('pageshow', update);
  document.addEventListener('visibilitychange', onVisible);
  document.addEventListener('astro:before-swap', dispose);
  const timer = window.setInterval(update, 60 * 60 * 1000);
  update();
  return dispose;
}
