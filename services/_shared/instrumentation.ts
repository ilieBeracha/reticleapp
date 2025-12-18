export function withQueryTiming<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (__DEV__) {
    const start = Date.now();
    return fn().finally(() => {
      const ms = Date.now() - start;
      // Keep logs compact; this is meant for quick profiling while developing.
      // eslint-disable-next-line no-console
      console.log(`[query] ${label} (${ms}ms)`);
    });
  }

  return fn();
}







