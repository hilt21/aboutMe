// Navigation visibility is a projection of two independent inputs:
// rail pinned by scroll position and keyboard focus inside the navigation.
export function dockPinned(isIntersecting: boolean, sentinelBottom: number, pinTop: number): boolean {
  return !isIntersecting && sentinelBottom <= pinTop;
}
export function navigationVisible(pinned: boolean, focused: boolean): boolean {
  return pinned || focused;
}
export function mountScrollNavigation(
  navigation: HTMLElement, dock: HTMLElement, sentinel: HTMLElement,
): () => void {
  const computedTop = Number.parseFloat(getComputedStyle(dock).top);
  const pinTop = Number.isFinite(computedTop) ? computedTop : 64;
  let pinned = false;
  let disposed = false;
  const update = () => {
    if (disposed) return;
    const visible = navigationVisible(pinned, navigation.contains(document.activeElement));
    dock.classList.toggle('is-pinned', pinned);
    navigation.hidden = false; // CSS visibility and inert own the fade.
    navigation.classList.toggle('is-visible', visible);
    navigation.inert = !visible;
    navigation.setAttribute('aria-hidden', String(!visible));
  };
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry || disposed) return;
    pinned = dockPinned(entry.isIntersecting, entry.boundingClientRect.bottom, pinTop);
    update();
  }, {rootMargin: `-${pinTop}px 0px 0px 0px`});
  const onFocusOut = () => queueMicrotask(update); // Focus may move between links.
  const onFocusIn = () => update();
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    navigation.removeEventListener('focusin', onFocusIn);
    navigation.removeEventListener('focusout', onFocusOut);
    document.removeEventListener('astro:before-swap', dispose);
  };
  navigation.addEventListener('focusin', onFocusIn);
  navigation.addEventListener('focusout', onFocusOut);
  document.addEventListener('astro:before-swap', dispose);
  observer.observe(sentinel);
  update();
  return dispose;
}
