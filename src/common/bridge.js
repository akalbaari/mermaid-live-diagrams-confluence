import { view } from '@forge/bridge';

/**
 * Resolves to `fallback` if `promise` has not settled within `ms`, and
 * swallows its rejection either way.
 *
 * Every call into @forge/bridge goes through here. The bridge talks to the
 * host over postMessage, and when there is nothing on the other end the call
 * does not reject, it simply never settles. An `await` on it therefore hangs
 * forever, and because the first render is downstream of that await, the
 * macro stays blank rather than degrading. A timeout turns an unreachable
 * host into a slightly worse render instead of no render at all.
 */
export function withTimeout(call, ms, fallback) {
  // `call` is a thunk, not a promise, because the bridge can throw
  // synchronously when there is no host on the other end. Passing it already
  // invoked would let that throw escape past the guard and abort the caller,
  // which is exactly the hang this function exists to prevent.
  let started;
  try {
    started = Promise.resolve(call());
  } catch {
    return Promise.resolve(fallback);
  }

  let timer;
  const guard = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });

  return Promise.race([started.catch(() => fallback), guard]).finally(() =>
    clearTimeout(timer)
  );
}

export const CONTEXT_TIMEOUT_MS = 8000;

/** Returns the macro's saved config, or null if the host never answered. */
export async function loadContext() {
  const context = await withTimeout(
    () => view.getContext(),
    CONTEXT_TIMEOUT_MS,
    null
  );
  return context ?? null;
}

/**
 * Applies the host theme. The returned promise is not on the critical path
 * for the first paint, but callers do need to know when it settles: Forge
 * sets data-color-mode on <html> at some point during this call, and a
 * render that happened before that lands used the wrong theme.
 */
export function enableTheme() {
  return withTimeout(() => view.theme.enable(), 4000, null);
}
