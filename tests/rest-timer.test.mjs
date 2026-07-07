import test from "node:test";
import assert from "node:assert/strict";
import {
  REST_PRESETS,
  REST_TIMER_STORAGE_KEY,
  RestTimer,
  completeSetAndMaybeStartTimer,
  validateRestDuration,
} from "../rest-timer.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
    has: key => values.has(key),
  };
}

test("starts every preset and validates custom durations", () => {
  let now = 1000;
  const timer = new RestTimer({ storage: memoryStorage(), now: () => now });
  for (const preset of REST_PRESETS) {
    timer.start(preset);
    assert.equal(timer.snapshot().remainingSeconds, preset);
  }
  assert.equal(validateRestDuration(5), true);
  assert.equal(validateRestDuration(1800), true);
  assert.equal(validateRestDuration(4), false);
  assert.equal(validateRestDuration(1801), false);
  assert.equal(validateRestDuration(5.5), false);
});

test("pauses, resumes, and adds thirty seconds", () => {
  let now = 0;
  const timer = new RestTimer({ storage: memoryStorage(), now: () => now });
  timer.start(60);
  now = 15_000;
  timer.pause();
  assert.equal(timer.snapshot().remainingSeconds, 45);
  now = 45_000;
  assert.equal(timer.snapshot().remainingSeconds, 45);
  timer.add(30);
  assert.equal(timer.snapshot().remainingSeconds, 75);
  timer.resume();
  now = 55_000;
  assert.equal(timer.tick().remainingSeconds, 65);
});

test("restores an active timer and corrects after background throttling", () => {
  let now = 10_000;
  const storage = memoryStorage();
  const timer = new RestTimer({ storage, now: () => now });
  timer.start(120);
  now = 55_000;
  const restored = new RestTimer({ storage, now: () => now });
  assert.equal(restored.snapshot().remainingSeconds, 75);
  now = 100_000;
  assert.equal(restored.tick().remainingSeconds, 30);
});

test("dismiss clears persisted timer state", () => {
  const storage = memoryStorage();
  const timer = new RestTimer({ storage, now: () => 0 });
  timer.start(60);
  assert.equal(storage.has(REST_TIMER_STORAGE_KEY), true);
  timer.dismiss();
  assert.equal(storage.has(REST_TIMER_STORAGE_KEY), false);
  assert.equal(timer.snapshot().status, "idle");
});

test("completion clears persistence and keeps restart duration", () => {
  let now = 0;
  let alerts = 0;
  const storage = memoryStorage();
  const timer = new RestTimer({ storage, now: () => now, onComplete: () => alerts++ });
  timer.start(60);
  now = 60_500;
  assert.equal(timer.tick().status, "complete");
  assert.equal(storage.has(REST_TIMER_STORAGE_KEY), false);
  assert.equal(alerts, 1);
  timer.restart();
  assert.equal(timer.snapshot().remainingSeconds, 60);
});

test("automatic timer starts only after a successful save", async () => {
  const timer = new RestTimer({ storage: memoryStorage(), now: () => 0 });
  const successfulSet = { done: false };
  const success = await completeSetAndMaybeStartTimer({ set: successfulSet, save: async () => {}, timer, enabled: true, durationSeconds: 90 });
  assert.equal(success.timerStarted, true);
  assert.equal(timer.snapshot().remainingSeconds, 90);

  timer.dismiss();
  const failedSet = { done: false };
  const failure = await completeSetAndMaybeStartTimer({ set: failedSet, save: async () => { throw new Error("offline"); }, timer, enabled: true, durationSeconds: 90 });
  assert.equal(failure.ok, false);
  assert.equal(failedSet.done, false);
  assert.equal(timer.snapshot().status, "idle");
});

test("duplicate completion does not create or restart a timer", async () => {
  let now = 0;
  const timer = new RestTimer({ storage: memoryStorage(), now: () => now });
  const set = { done: false };
  await completeSetAndMaybeStartTimer({ set, save: async () => {}, timer, enabled: true, durationSeconds: 60 });
  now = 10_000;
  const duplicate = await completeSetAndMaybeStartTimer({ set, save: async () => {}, timer, enabled: true, durationSeconds: 60 });
  assert.equal(duplicate.duplicate, true);
  assert.equal(timer.snapshot().remainingSeconds, 50);
});
