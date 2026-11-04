/** In-process limits. One always-on instance makes these real. A restart clears them. */

export type Limiter = { take(key: string, max: number, windowMs: number): boolean };

export function createLimiter(now: () => number): Limiter {
  const windows = new Map<string, { start: number; count: number }>();
  let swept = now();
  return {
    take(key, max, windowMs) {
      const t = now();
      if (t - swept > 60_000) {
        for (const [k, w] of windows) if (t - w.start > 24 * 3_600_000) windows.delete(k);
        swept = t;
      }
      const w = windows.get(key);
      if (!w || t - w.start >= windowMs) {
        windows.set(key, { start: t, count: 1 });
        return max >= 1;
      }
      if (w.count >= max) return false;
      w.count += 1;
      return true;
    },
  };
}

/** A daily total of calls that spend the guard's payment key. */
export type Budget = { take(): boolean; used(): number };

export function createBudget(now: () => number, perDay: number): Budget {
  let day = Math.floor(now() / 86_400_000);
  let count = 0;
  return {
    take() {
      const today = Math.floor(now() / 86_400_000);
      if (today !== day) {
        day = today;
        count = 0;
      }
      if (count >= perDay) return false;
      count += 1;
      return true;
    },
    used: () => count,
  };
}

/** A ceiling that does not reset on its own. The key names the period, so a new round is a new key. */
export type Counter = { take(key: string, max: number): boolean; snapshot(): Record<string, number> };

export function createCounter(maxKeys = 10_000): Counter {
  const counts = new Map<string, number>();
  return {
    take(key, max) {
      const n = counts.get(key) ?? 0;
      if (n >= max) return false;
      if (n === 0 && counts.size >= maxKeys) counts.delete(counts.keys().next().value as string);
      counts.set(key, n + 1);
      return true;
    },
    snapshot() {
      return Object.fromEntries([...counts.entries()].slice(-50));
    },
  };
}
