export const REST_TIMER_STORAGE_KEY = "train-rest-timer-v1";
export const MIN_REST_SECONDS = 5;
export const MAX_REST_SECONDS = 30 * 60;
export const REST_PRESETS = [60, 90, 120, 180];

const idleState = () => ({
  status: "idle",
  durationSeconds: 90,
  remainingSeconds: 0,
  endAt: null,
});

export function validateRestDuration(value) {
  const seconds = Number(value);
  return Number.isInteger(seconds) && seconds >= MIN_REST_SECONDS && seconds <= MAX_REST_SECONDS;
}

export function formatRestTime(value) {
  const seconds = Math.max(0, Math.ceil(Number(value) || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export class RestTimer {
  constructor({ storage = globalThis.localStorage, now = () => Date.now(), onComplete = () => {} } = {}) {
    this.storage = storage;
    this.now = now;
    this.onComplete = onComplete;
    this.state = idleState();
    this.restore();
  }

  snapshot() {
    const remainingSeconds = this.state.status === "running"
      ? Math.max(0, Math.ceil((this.state.endAt - this.now()) / 1000))
      : this.state.remainingSeconds;
    return { ...this.state, remainingSeconds };
  }

  start(seconds) {
    if (!validateRestDuration(seconds)) throw new RangeError(`Rest duration must be ${MIN_REST_SECONDS}–${MAX_REST_SECONDS} seconds.`);
    const durationSeconds = Number(seconds);
    this.state = {
      status: "running",
      durationSeconds,
      remainingSeconds: durationSeconds,
      endAt: this.now() + durationSeconds * 1000,
    };
    this.persist();
    return this.snapshot();
  }

  pause() {
    if (this.state.status !== "running") return this.snapshot();
    const remainingSeconds = this.snapshot().remainingSeconds;
    if (remainingSeconds <= 0) return this.complete();
    this.state = { ...this.state, status: "paused", remainingSeconds, endAt: null };
    this.persist();
    return this.snapshot();
  }

  resume() {
    if (this.state.status !== "paused" || this.state.remainingSeconds <= 0) return this.snapshot();
    this.state = { ...this.state, status: "running", endAt: this.now() + this.state.remainingSeconds * 1000 };
    this.persist();
    return this.snapshot();
  }

  add(seconds = 30) {
    const addition = Math.max(0, Number(seconds) || 0);
    if (!addition || !["running", "paused"].includes(this.state.status)) return this.snapshot();
    if (this.state.status === "running") {
      const remainingSeconds = Math.min(MAX_REST_SECONDS, this.snapshot().remainingSeconds + addition);
      this.state = { ...this.state, remainingSeconds, endAt: this.now() + remainingSeconds * 1000 };
    } else {
      this.state = { ...this.state, remainingSeconds: Math.min(MAX_REST_SECONDS, this.state.remainingSeconds + addition) };
    }
    this.persist();
    return this.snapshot();
  }

  restart() {
    return this.start(this.state.durationSeconds);
  }

  tick() {
    if (this.state.status !== "running") return this.snapshot();
    const remainingSeconds = this.snapshot().remainingSeconds;
    if (remainingSeconds <= 0) return this.complete();
    this.state.remainingSeconds = remainingSeconds;
    return this.snapshot();
  }

  complete() {
    if (this.state.status === "complete") return this.snapshot();
    this.state = { ...this.state, status: "complete", remainingSeconds: 0, endAt: null };
    this.storage?.removeItem(REST_TIMER_STORAGE_KEY);
    this.onComplete(this.snapshot());
    return this.snapshot();
  }

  dismiss() {
    this.state = idleState();
    this.storage?.removeItem(REST_TIMER_STORAGE_KEY);
    return this.snapshot();
  }

  persist() {
    if (!["running", "paused"].includes(this.state.status)) return;
    this.storage?.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify(this.state));
  }

  restore() {
    let saved;
    try { saved = JSON.parse(this.storage?.getItem(REST_TIMER_STORAGE_KEY)); }
    catch { saved = null; }
    const validDuration = validateRestDuration(saved?.durationSeconds);
    const validStatus = saved?.status === "running" || saved?.status === "paused";
    if (!validDuration || !validStatus) {
      this.storage?.removeItem(REST_TIMER_STORAGE_KEY);
      return this.snapshot();
    }
    this.state = {
      status: saved.status,
      durationSeconds: Number(saved.durationSeconds),
      remainingSeconds: Math.max(0, Number(saved.remainingSeconds) || 0),
      endAt: saved.status === "running" ? Number(saved.endAt) : null,
    };
    if (saved.status === "running" && (!Number.isFinite(this.state.endAt) || this.state.endAt <= this.now())) return this.complete();
    if (saved.status === "paused" && this.state.remainingSeconds <= 0) return this.dismiss();
    return this.snapshot();
  }
}

export async function completeSetAndMaybeStartTimer({ set, save, timer, enabled, durationSeconds }) {
  if (set.done) return { ok: true, duplicate: true, timerStarted: false };
  set.done = true;
  try { await save(); }
  catch (error) {
    set.done = false;
    return { ok: false, duplicate: false, timerStarted: false, error };
  }
  if (enabled) timer.start(durationSeconds);
  return { ok: true, duplicate: false, timerStarted: Boolean(enabled) };
}
