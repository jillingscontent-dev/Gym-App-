import {
  isSupabaseConfigured,
  supabase,
  getAuthSession,
  signIn,
  signUp,
  signOut,
  loadProfile,
  saveProfile,
  loadUserProgram,
  addProgramExercise,
  updateProgramExercise,
  deleteProgramExercise,
  loadWorkoutData,
  createRemoteWorkout,
  updateRemoteSet,
  insertRemoteSet,
  insertRemoteExercise,
  deleteRemoteExercise,
  updateRemoteExercise,
  updateRemoteExerciseDetails,
  deleteRemoteSet,
  finishRemoteWorkout,
  updateWorkoutSessionDetails,
  cancelRemoteWorkout,
  deleteWorkoutSession,
  loadFoodLogs,
  insertFoodLog,
  deleteFoodLog,
  uploadMealPhoto,
  getMealPhotoUrl,
  deleteMealPhoto,
} from "./supabase-client.js";
import { isMissingProgramSchemaError } from "./program-schema-error.js";
import { REST_PRESETS, RestTimer, completeSetAndMaybeStartTimer, formatRestTime, validateRestDuration } from "./rest-timer.js";

const WORKOUTS = {
  Push: {
    focus: "Chest, shoulders, triceps, rotational power and loaded trunk stability",
    duration: "70–85 min",
    muscles: ["Chest", "Shoulders", "Triceps", "Core"],
    exercises: [
      ["Power", "Rotational medicine-ball floor slam", 3, "3–5 / side", "60–90 sec", "Rotate through the hips; slam hard outside the front foot."],
      ["Power", "Plyometric push-up", 3, "3–5", "60–90 sec", "Use an elevated surface if needed."],
      ["Hypertrophy", "Seated chest press", 2, "8–12", "2–3 min", "Controlled lowering."],
      ["Hypertrophy", "Incline barbell press", 2, "8–12", "2–3 min", "Leave 1–3 reps in reserve."],
      ["Hypertrophy", "Seated machine shoulder press", 2, "8–12", "2 min", ""],
      ["Hypertrophy", "Chest-supported dumbbell lateral raise", 2, "12–20", "60–90 sec", ""],
      ["Hypertrophy", "Rope triceps pushdown", 2, "8–12", "60–90 sec", ""],
      ["Hypertrophy", "Cable overhead triceps extension", 2, "8–12", "60–90 sec", ""],
      ["Core / Athletic", "Half-kneeling cable lift", 2, "8–12 / side", "60 sec", "Resist extension; rotate through the upper trunk."],
      ["Core / Athletic", "Suitcase carry", 3, "20–30 m / side", "60–90 sec", "Stay tall; do not lean toward the load."],
    ],
  },
  Pull: {
    focus: "Back, biceps, upper-body power and loaded grip/trunk capacity",
    duration: "70–85 min",
    muscles: ["Back", "Biceps", "Grip", "Core"],
    exercises: [
      ["Power", "Medicine-ball overhead slam", 3, "3–5", "60–90 sec", "Max intent; reset each rep."],
      ["Power", "Explosive pull-up", 3, "3–5", "90–120 sec", "Use band assistance if speed slows."],
      ["Hypertrophy", "Bent-over barbell row", 2, "8–12", "2–3 min", ""],
      ["Hypertrophy", "Lat-bar pulldown", 2, "8–12", "2 min", ""],
      ["Hypertrophy", "Single-arm kneeling dumbbell row", 2, "8–12 / side", "90–120 sec", ""],
      ["Hypertrophy", "Face pull", 2, "12–20", "60–90 sec", ""],
      ["Hypertrophy", "Preacher curl", 2, "8–12", "60–90 sec", ""],
      ["Hypertrophy", "Standing hammer curl", 2, "8–12", "60–90 sec", ""],
      ["Core / Athletic", "Hanging knee raise", 3, "8–15", "60–90 sec", "Control the pelvis; avoid swinging."],
      ["Core / Athletic", "Farmer carry", 3, "20–40 m", "60–90 sec", "Heavy, smooth steps; ribs stacked."],
    ],
  },
  Legs: {
    focus: "Bilateral lower-body hypertrophy, jumping, sled work and weighted trunk flexion",
    duration: "80–95 min",
    muscles: ["Quads", "Glutes", "Hamstrings", "Core"],
    exercises: [
      ["Power", "Countermovement box jump", 3, "3–5", "90–120 sec", "Land quietly; step down."],
      ["Power", "Lateral bound with controlled landing", 3, "3–5 / side", "60–90 sec", "Own each landing."],
      ["Hypertrophy", "Heel-elevated squat", 2, "8–12", "2.5–3 min", ""],
      ["Hypertrophy", "Romanian deadlift", 2, "8–12", "2.5–3 min", ""],
      ["Hypertrophy", "Barbell hip thrust", 2, "8–12", "2 min", ""],
      ["Hypertrophy", "Rear-foot-elevated split squat", 2, "8–12 / leg", "90–120 sec", ""],
      ["Hypertrophy", "Standing calf raise", 2, "8–12", "90 sec", ""],
      ["Hypertrophy", "Bent-knee calf raise", 2, "12–20", "60–90 sec", ""],
      ["Core / Athletic", "Heavy sled push", 3, "15–25 m", "90–120 sec", "Drive the ground away; steady torso."],
      ["Core / Athletic", "Cable crunch", 3, "10–15", "60 sec", "Flex through the trunk, not only the hips."],
      ["Core / Athletic", "Weighted dead bug pullover", 2, "8–10 / side", "60 sec", "Keep the lower back gently braced."],
    ],
  },
  Upper: {
    focus: "Balanced upper-body volume, rotation, pressing power and front-loaded carries",
    duration: "80–95 min",
    muscles: ["Chest", "Back", "Shoulders", "Core"],
    exercises: [
      ["Power", "Explosive low-to-high cable woodchop", 3, "3–5 / side", "60–90 sec", "Drive the rotation from the hips; fast up, controlled return."],
      ["Power", "Half-kneeling landmine push press", 3, "4–6 / side", "90–120 sec", "Drive fast; reset each rep."],
      ["Hypertrophy", "Pull-up or chin-up", 2, "6–10", "2–3 min", ""],
      ["Hypertrophy", "Incline dumbbell bench press", 2, "8–12", "2–3 min", ""],
      ["Hypertrophy", "Chest-supported row", 2, "8–12", "2 min", ""],
      ["Hypertrophy", "Pec deck", 2, "10–15", "90 sec", ""],
      ["Hypertrophy", "Dumbbell lateral raise", 2, "12–20", "60–90 sec", ""],
      ["Hypertrophy", "Face pull with external rotation", 2, "12–20", "60–90 sec", ""],
      ["Hypertrophy", "Rope triceps pushdown", 2, "10–15", "60–90 sec", ""],
      ["Hypertrophy", "Incline dumbbell curl", 2, "10–15", "60–90 sec", ""],
      ["Core / Athletic", "Landmine rotation", 3, "6–10 / side", "60–90 sec", "Rotate through hips and trunk as one unit."],
      ["Core / Athletic", "Front-rack carry", 3, "20–30 m", "60–90 sec", "Use kettlebells or dumbbells; stay stacked."],
    ],
  },
  Lower: {
    focus: "Unilateral and lateral lower-body work, sprint support, anti-rotation and trunk strength",
    duration: "80–95 min",
    muscles: ["Quads", "Glutes", "Adductors", "Core"],
    exercises: [
      ["Power", "Standing broad jump", 3, "3–5", "90–120 sec", "Stick the landing."],
      ["Power", "Split-stance jump", 3, "3–5 / side", "90 sec", "Stop before jump height drops."],
      ["Hypertrophy", "Rear-foot-elevated split squat", 2, "6–10 / side", "2 min", ""],
      ["Hypertrophy", "Single-leg Romanian deadlift", 2, "8–12 / side", "90–120 sec", ""],
      ["Hypertrophy", "Lateral lunge or Cossack squat", 2, "8–12 / side", "90 sec", ""],
      ["Hypertrophy", "Seated or lying leg curl", 2, "8–12", "90 sec", ""],
      ["Hypertrophy", "Single-leg calf raise", 2, "8–12 / side", "60–90 sec", ""],
      ["Core / Athletic", "Dumbbell step-up", 2, "6–10 / side", "90 sec", "Drive through the working leg; control down."],
      ["Core / Athletic", "Backward sled drag", 3, "20–30 m", "60–90 sec", "Short, continuous steps."],
      ["Core / Athletic", "Copenhagen plank", 2, "20–40 sec / side", "60 sec", "Enter seconds in the reps field."],
      ["Core / Athletic", "Pallof press, athletic stance", 2, "8–12 / side", "60 sec", ""],
      ["Core / Athletic", "Ab-wheel rollout", 3, "6–12", "60–90 sec", "Only use range you can control without back sag."],
    ],
  },
};

const SCHEDULE = ["Push", "Pull", "Legs", null, "Upper", "Lower", null];
const STORE = "train-hybrid-app-v1";
const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

const iconPaths = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  home: '<path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  log: '<path d="M5 4h14M5 9h9M5 14h7M15 17l4-4 2 2-4 4-3 1z"/>',
  chart: '<path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.6-4 3.3-6 8-6s7.4 2 8 6"/>',
  play: '<path d="m9 6 9 6-9 6z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  dumbbell: '<path d="M4 9v6m3-8v10m10-10v10m3-8v6M7 12h10M2 10v4m20-4v4"/>',
  arrow: '<path d="m9 18 6-6-6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  flame: '<path d="M12 3c1 4-3 5.5-3 9a3.5 3.5 0 0 0 7 0c0-1.5-.7-2.7-1.5-3.8-.3 1-.8 1.6-1.5 2C13.4 8 13 5.5 12 3z"/>',
};
function icon(name, label = "") {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="${label ? "false" : "true"}">${iconPaths[name] || iconPaths.target}</svg>`;
}

const defaultSettings = {
  name: "Jack",
  units: "kg",
  bodyWeight: 82.4,
  reminders: true,
  autoRestTimer: false,
  autoRestDuration: 90,
  restTimerAlerts: true,
};
const seedHistory = [
  { id: "seed-1", workout: "Lower", date: new Date(Date.now() - 86400000).toISOString(), duration: 68, volume: 12840, bodyWeight: 82.4, muscles: WORKOUTS.Lower.muscles, exercises: [{name:"Rear-foot-elevated split squat",sets:[{weight:32,reps:8},{weight:32,reps:8}]},{name:"Single-leg Romanian deadlift",sets:[{weight:28,reps:10},{weight:28,reps:9}]}] },
  { id: "seed-2", workout: "Push", date: new Date(Date.now() - 3 * 86400000).toISOString(), duration: 61, volume: 9470, bodyWeight: 82.6, muscles: WORKOUTS.Push.muscles, exercises: [{name:"Incline barbell press",sets:[{weight:72.5,reps:10},{weight:72.5,reps:8}]},{name:"Seated chest press",sets:[{weight:80,reps:12},{weight:85,reps:9}]}] },
  { id: "seed-3", workout: "Pull", date: new Date(Date.now() - 6 * 86400000).toISOString(), duration: 65, volume: 10120, bodyWeight: 82.8, muscles: WORKOUTS.Pull.muscles, exercises: [{name:"Bent-over barbell row",sets:[{weight:75,reps:10},{weight:75,reps:9}]},{name:"Lat-bar pulldown",sets:[{weight:68,reps:12},{weight:68,reps:11}]}] },
];

let saved;
try { saved = JSON.parse(localStorage.getItem(STORE)); } catch { saved = null; }
const state = {
  view: "home",
  modal: null,
  search: "",
  period: "week",
  loading: isSupabaseConfigured,
  session: null,
  authMode: "signin",
  programId: null,
  programError: null,
  editDay: "Push",
  previewDay: "Push",
  exerciseEditor: null,
  selectedWorkoutId: null,
  workoutSaveStatus: "idle",
  modalScrollY: 0,
  modalReturnFocus: null,
  settings: { ...defaultSettings, ...(saved?.settings || {}) },
  history: isSupabaseConfigured ? [] : (saved?.history?.length ? saved.history : seedHistory),
  active: isSupabaseConfigured ? null : (saved?.active || null),
  food: isSupabaseConfigured ? [] : (saved?.food || []),
  foodDate: null,
  foodLoaded: !isSupabaseConfigured,
  foodError: null,
};
state.foodDate = localDate(new Date());

const restTimer = new RestTimer();
let restAudioContext = null;
restTimer.onComplete = () => queueMicrotask(handleRestTimerComplete);
if (restTimer.snapshot().status === "complete") queueMicrotask(handleRestTimerComplete);

function persist() {
  localStorage.setItem(STORE, JSON.stringify({ settings: state.settings, history: state.history, active: state.active, food: state.food }));
}
function localDate(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }

function primeRestAudio() {
  if (!state.settings.restTimerAlerts || restAudioContext) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    restAudioContext = new AudioContext();
    restAudioContext.resume?.().catch(() => {});
  } catch { restAudioContext = null; }
}

function playRestAlert() {
  if (!state.settings.restTimerAlerts) return;
  try { navigator.vibrate?.([180, 80, 180]); } catch { /* unsupported */ }
  if (!restAudioContext) return;
  try {
    const oscillator = restAudioContext.createOscillator();
    const gain = restAudioContext.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, restAudioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, restAudioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, restAudioContext.currentTime + 0.24);
    oscillator.connect(gain).connect(restAudioContext.destination);
    oscillator.start();
    oscillator.stop(restAudioContext.currentTime + 0.25);
  } catch { /* visual alert remains available */ }
}

function handleRestTimerComplete() {
  playRestAlert();
  showToast("Rest complete — ready for your next set");
  render();
}
function remoteUserId() { return state.session?.user?.id || null; }
function uuid() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

function openModal(name, returnFocus = null) {
  if (!state.modal) state.modalScrollY = window.scrollY;
  state.modal = name;
  state.modalReturnFocus = returnFocus;
  render();
}

function closeModal() {
  const scrollY = state.modalScrollY;
  const returnFocus = state.modalReturnFocus;
  state.modal = null;
  state.selectedWorkoutId = null;
  state.exerciseEditor = null;
  state.modalReturnFocus = null;
  render();
  requestAnimationFrame(() => {
    window.scrollTo(0, scrollY);
    if (returnFocus) document.querySelector(returnFocus)?.focus();
  });
}

function openHistoryModal(id) {
  if (!state.history.some(workout => workout.id === id)) return;
  state.selectedWorkoutId = id;
  openModal("history", `[data-history="${id}"]`);
}

function sessionRowToHistory(row) {
  const exercises = (row.exercise_logs || []).sort((a,b) => a.position-b.position).map(ex => ({
    id: ex.id,
    name: ex.exercise_name,
    phase: ex.phase,
    notes: ex.notes || "",
    sets: (ex.set_logs || []).sort((a,b) => a.set_number-b.set_number).filter(s => s.weight_kg || s.reps).map(s => ({
      id: s.id, weight: Number(s.weight_kg) || 0, reps: Number(s.reps) || 0, done: s.completed,
    })),
  }));
  return {
    id: row.id,
    workout: row.workout_key,
    date: row.completed_at || row.started_at,
    duration: row.duration_minutes || 1,
    volume: Number(row.total_volume_kg) || 0,
    bodyWeight: Number(row.body_weight_kg) || null,
    muscles: WORKOUTS[row.workout_key]?.muscles || [],
    exercises,
  };
}

function sessionRowToActive(row) {
  return {
    id: row.id,
    workout: row.workout_key,
    startedAt: new Date(row.started_at).getTime(),
    bodyWeight: Number(row.body_weight_kg) || null,
    exercises: (row.exercise_logs || []).sort((a,b) => a.position-b.position).map(ex => ({
      id: ex.id,
      position: ex.position,
      phase: ex.phase,
      name: ex.exercise_name,
      targetSets: ex.target_sets,
      targetReps: ex.target_reps,
      rest: ex.rest_interval,
      cue: ex.cue || "",
      notes: ex.notes || "",
      sets: (ex.set_logs || []).sort((a,b) => a.set_number-b.set_number).map(s => ({
        id: s.id,
        setNumber: s.set_number,
        weight: s.weight_kg == null ? "" : String(unitWeight(Number(s.weight_kg))),
        reps: s.reps == null ? "" : String(Number(s.reps)),
        done: s.completed,
      })),
    })),
  };
}

function applyRemoteProgram(program) {
  state.programId = program.id;
  state.programError = null;
  for (const day of (program.program_days || []).sort((a,b) => a.position-b.position)) {
    const existingMuscles = WORKOUTS[day.day_key]?.muscles || [];
    WORKOUTS[day.day_key] = {
      dayId: day.id,
      focus: day.focus,
      duration: day.duration_label,
      muscles: existingMuscles,
      exercises: (day.program_exercises || []).sort((a,b) => a.position-b.position).map(ex => [
        ex.phase, ex.exercise_name, ex.target_sets, ex.target_reps, ex.rest_interval, ex.cue || "", ex.id, ex.position,
      ]),
    };
  }
}

function foodRowToEntry(row) {
  return {
    id: row.id,
    date: row.eaten_on,
    name: row.name,
    calories: Number(row.calories) || 0,
    protein: row.protein_g == null ? null : Number(row.protein_g),
    carbs: row.carbs_g == null ? null : Number(row.carbs_g),
    fat: row.fat_g == null ? null : Number(row.fat_g),
    slot: row.meal_slot == null ? null : Number(row.meal_slot),
    time: row.eaten_time ? String(row.eaten_time).slice(0, 5) : null,
    photoPath: row.photo_path || null,
  };
}

async function compressMealPhoto(file, maxDim = 1280) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.82));
    return blob || file;
  } catch { return file; }
}

const mealPhotoUrls = new Map();
function hydrateMealPhotos() {
  if (!isSupabaseConfigured) return;
  document.querySelectorAll("[data-meal-photo]").forEach(img => {
    const path = img.dataset.mealPhoto;
    if (!mealPhotoUrls.has(path)) mealPhotoUrls.set(path, getMealPhotoUrl(path).catch(() => null));
    mealPhotoUrls.get(path).then(url => { if (url && img.isConnected) img.src = url; });
  });
}

async function ensureFoodLoaded() {
  if (state.foodLoaded || !isSupabaseConfigured || !state.session) return;
  state.foodLoaded = true;
  try {
    const rows = await loadFoodLogs(remoteUserId());
    state.food = rows.map(foodRowToEntry);
    state.foodError = null;
  } catch (error) {
    state.foodError = isMissingProgramSchemaError(error)
      ? "The food log database objects are missing or out of date. Run supabase/migrations/003_food_logs.sql and 004_meal_slots_photos.sql once in the Supabase SQL Editor."
      : (error.message || "Your food log could not be loaded.");
  }
  if (state.view === "food") render();
}

async function loadRemoteState() {
  const user = state.session.user;
  state.programError = null;
  state.food = []; state.foodLoaded = false; state.foodError = null;
  state.programId = null;
  const [profile, sessions] = await Promise.all([loadProfile(user), loadWorkoutData(user.id)]);
  state.settings = {
    ...defaultSettings,
    name: profile.display_name || "Athlete",
    units: profile.preferred_units || "kg",
    bodyWeight: Number(profile.body_weight_kg) || 82.4,
    reminders: profile.reminders_enabled !== false,
    autoRestTimer: state.settings.autoRestTimer,
    autoRestDuration: state.settings.autoRestDuration,
    restTimerAlerts: state.settings.restTimerAlerts,
  };
  const activeRow = sessions.find(row => row.status === "active");
  state.active = activeRow ? sessionRowToActive(activeRow) : null;
  state.history = sessions.filter(row => row.status === "completed").map(sessionRowToHistory);
  try {
    const program = await loadUserProgram(user.id);
    if (program) applyRemoteProgram(program);
  }
  catch (error) {
    if (isMissingProgramSchemaError(error)) {
      console.warn("Workout program database objects are missing", error);
      state.programError = "The per-user program tables or seed function are missing. Run supabase/migrations/002_default_programs.sql once to enable persistent, editable workout routines.";
    } else {
      console.error("Workout program could not be loaded", error);
      showToast("Your saved program could not be loaded. Using the built-in routine for now.");
    }
  }
  persist();
}

async function bootstrap() {
  if (!isSupabaseConfigured) { render(); return; }
  try {
    state.session = await getAuthSession();
    if (state.session) await loadRemoteState();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not connect to Supabase");
  } finally {
    state.loading = false;
    render();
  }
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(async () => {
      state.session = session;
      if (session) await loadRemoteState();
      else { state.history = []; state.active = null; state.programId = null; state.programError = null; state.food = []; state.foodLoaded = false; state.foodError = null; state.view = "home"; }
      render();
    }, 0);
  });
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}
const syncTimers = new Map();
function remoteSetPatch(set) {
  return {
    weight_kg: set.weight === "" ? null : fromUnit(Number(set.weight)),
    reps: set.reps === "" ? null : Number(set.reps),
    completed: Boolean(set.done),
  };
}
function scheduleSetSync(set) {
  if (!isSupabaseConfigured || !set?.id) return;
  clearTimeout(syncTimers.get(set.id));
  syncTimers.set(set.id, setTimeout(async () => {
    try {
      await updateRemoteSet(set.id, remoteSetPatch(set));
    } catch (error) { showToast(error.message || "Set could not sync"); }
  }, 450));
}
async function flushActiveWorkout(active) {
  if (!isSupabaseConfigured) return;
  for (const timer of syncTimers.values()) clearTimeout(timer);
  syncTimers.clear();
  await Promise.all([
    ...active.exercises.flatMap(exercise => exercise.sets.map(set => updateRemoteSet(set.id, remoteSetPatch(set)))),
    ...active.exercises.map(exercise => updateRemoteExercise(exercise.id, exercise.notes || "")),
  ]);
}
function scheduleExerciseSync(exercise) {
  if (!isSupabaseConfigured || !exercise?.id) return;
  clearTimeout(syncTimers.get(exercise.id));
  syncTimers.set(exercise.id, setTimeout(() => updateRemoteExercise(exercise.id, exercise.notes).catch(error => showToast(error.message || "Notes could not sync")), 500));
}
function esc(value = "") { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function initials(name) { return name.split(/\s+/).map(x => x[0]).join("").slice(0, 2).toUpperCase(); }
function fmtDate(date, short = false) { return new Intl.DateTimeFormat("en-US", short ? { month:"short", day:"numeric" } : { weekday:"long", month:"long", day:"numeric" }).format(new Date(date)); }
function fmtNum(value, digits = 0) { return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value || 0); }
function unitWeight(kg) { return state.settings.units === "lb" ? kg * 2.20462 : kg; }
function fromUnit(value) { return state.settings.units === "lb" ? value / 2.20462 : value; }
function weightLabel(kg) { return `${fmtNum(unitWeight(kg), state.settings.units === "lb" ? 0 : 1)} ${state.settings.units}`; }
function dayPlan() { return SCHEDULE[(new Date().getDay() + 6) % 7] || "Upper"; }
function totalSets(name) { return WORKOUTS[name].exercises.reduce((sum, x) => sum + x[2], 0); }
function currentWeekVolume() {
  const cutoff = Date.now() - 7 * 86400000;
  return state.history.filter(h => new Date(h.date).getTime() >= cutoff).reduce((s, h) => s + h.volume, 0);
}

function renderRestTimerIndicator() {
  const timer = restTimer.snapshot();
  if (timer.status === "idle") return "";
  const label = timer.status === "complete" ? "Rest complete" : timer.status === "paused" ? `Rest paused · ${formatRestTime(timer.remainingSeconds)}` : `Rest · ${formatRestTime(timer.remainingSeconds)}`;
  return `<button class="rest-indicator ${timer.status === "complete" ? "complete" : ""}" data-action="open-rest-timer" aria-label="${esc(label)}">${icon("clock")}<strong data-rest-display>${timer.status === "complete" ? "DONE" : formatRestTime(timer.remainingSeconds)}</strong></button>`;
}

function renderRestTimerControls(compact = false) {
  const timer = restTimer.snapshot();
  const suffix = compact ? "-modal" : "";
  const running = timer.status === "running";
  const paused = timer.status === "paused";
  const active = running || paused;
  const complete = timer.status === "complete";
  return `<section class="rest-timer-card ${compact ? "compact" : "card"} ${complete ? "complete" : ""}" id="rest-timer-panel${suffix}" aria-labelledby="rest-timer-title${suffix}">
    <div class="rest-timer-head"><div><p class="eyebrow">Recovery</p><h2 id="rest-timer-title${suffix}">Rest timer</h2></div><strong class="rest-time" data-rest-display aria-live="${complete ? "assertive" : "polite"}">${complete ? "REST COMPLETE" : formatRestTime(timer.remainingSeconds)}</strong></div>
    <div class="rest-presets" aria-label="Quick rest timer durations">${REST_PRESETS.map(seconds=>`<button class="rest-chip" data-rest-preset="${seconds}">${seconds < 60 ? `${seconds}s` : seconds % 60 ? `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}` : `${seconds/60} min`}</button>`).join("")}</div>
    <form class="rest-custom" data-rest-timer-form novalidate><label for="rest-custom-seconds${suffix}">Custom seconds</label><input id="rest-custom-seconds${suffix}" name="seconds" type="number" inputmode="numeric" min="5" max="1800" step="1" value="${state.settings.autoRestDuration}" required><button class="btn dark" type="submit">Start</button></form>
    <div class="rest-actions">
      ${running ? `<button class="btn" data-action="pause-rest-timer">Pause</button>` : ""}
      ${paused ? `<button class="btn" data-action="resume-rest-timer">Resume</button>` : ""}
      ${active ? `<button class="btn" data-action="add-rest-time">+30 sec</button>` : ""}
      ${timer.status !== "idle" ? `<button class="btn" data-action="restart-rest-timer">Restart</button><button class="btn danger" data-action="dismiss-rest-timer">Dismiss</button>` : ""}
    </div>
    <p class="rest-validation caption" role="alert"></p>
  </section>`;
}

function shell(content, active = state.view) {
  return `<div class="app-shell">
    <header class="topbar">
      <button class="icon-btn" data-action="open-routines" aria-label="Choose workout">${icon("menu")}</button>
      <div class="brand">TRAIN</div>
      <button class="avatar" data-nav="profile" aria-label="Open profile">${esc(initials(state.settings.name))}</button>
    </header>
    ${content}
    <nav class="bottom-nav" aria-label="Main navigation">
      ${navItem("home", "Home", active)}
      ${navItem("log", "Logbook", active)}
      ${navItem("flame", "Food", active)}
      ${navItem("chart", "Progress", active)}
      ${navItem("user", "Profile", active)}
    </nav>
    ${renderRestTimerIndicator()}
    ${renderModal()}
  </div>`;
}
function navItem(iconName, label, active) {
  const view = iconName === "log" ? "logbook" : iconName === "flame" ? "food" : iconName === "chart" ? "progress" : iconName === "user" ? "profile" : "home";
  return `<button class="nav-item ${active === view ? "active" : ""}" data-nav="${view}">${icon(iconName)}<span>${label}</span></button>`;
}

function renderHome() {
  const plan = dayPlan();
  const workout = WORKOUTS[plan];
  const volume = currentWeekVolume();
  const recent = state.history.slice().sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0, 3);
  const bars = [45,62,54,83,68,36,Math.min(100, Math.max(8, volume / 170))];
  return shell(`<main class="page">
    <section><h1 class="display">Good ${new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}</h1><p class="subtle">${fmtDate(new Date())}</p></section>
    ${!isSupabaseConfigured ? `<section class="section card connection-card"><span class="tag">Demo mode</span><div><strong>Supabase is ready to connect</strong><p>Add your project URL and publishable key to <code>config.js</code> to enable accounts and cloud sync.</p></div></section>` : ""}
    ${state.programError ? `<section class="section card connection-card"><span class="tag power">Setup</span><div><strong>Program database setup required</strong><p>${esc(state.programError)}</p></div></section>` : ""}
    <section class="section"><button class="start-card" data-start="${plan}"><span><span class="label">Action</span><strong>${state.active ? "Resume Workout" : "Start Workout"}</strong></span><span class="play">${icon("play")}</span></button></section>
    <section class="section card volume-card"><div><span class="eyebrow">Weekly volume</span><div class="metric">${weightLabel(volume)}</div></div><div class="bar-chart" aria-label="Weekly volume chart">${bars.map((b,i)=>`<span class="${i===6?"active":""}" style="height:${b}%"></span>`).join("")}</div></section>
    <section class="section"><div class="section-head"><h2 class="section-title">Today’s Plan</h2><button class="text-btn" data-action="open-routines">View All</button></div>
      <button class="card card-button plan-card" data-start="${plan}"><span class="tag">Hybrid</span><h3>${plan} · Power + Hypertrophy</h3><p class="subtle">${workout.focus}. ${workout.duration}.</p><div class="meta-row"><span class="meta">${icon("dumbbell")} ${workout.exercises.length} exercises</span><span class="meta">${icon("clock")} ${workout.duration}</span><span class="meta">${totalSets(plan)} sets</span></div></button>
    </section>
    <section class="section"><div class="section-head"><h2 class="section-title">Your 5-Day Program</h2>${state.programId&&!state.programError?`<button class="text-btn" data-action="edit-program">Edit</button>`:""}</div><div class="program-overview">${Object.entries(WORKOUTS).map(([name,day])=>`<button class="card compact card-button" data-view-day="${name}"><span class="eyebrow">${day.exercises.length} exercises</span><strong>${name}</strong><small>${day.duration}</small></button>`).join("")}</div></section>
    <section class="section"><h2 class="section-title">Recent Activity</h2><div>${recent.map((h,i)=>`<div class="activity-row"><div class="activity-mark">${icon("clock")}</div><div><strong>${esc(h.workout)} Day</strong><small>${fmtDate(h.date,true)} · ${weightLabel(h.volume)} lifted</small></div><span class="change">${i===0?"+2.4%":"—"}</span></div>`).join("")}</div></section>
  </main>`, "home");
}

function renderRoutines() {
  return `<div class="routine-grid">${Object.entries(WORKOUTS).map(([name,w])=>`<button class="card card-button routine-card" data-view-day="${name}"><div><span class="eyebrow">${w.exercises.length} exercises · ${totalSets(name)} sets</span><h3>${name}</h3><p>${w.focus}</p></div><span class="round-arrow">${icon("arrow")}</span></button>`).join("")}</div>${state.programId && !state.programError ? `<button class="btn dark editor-launch" data-action="edit-program">Edit workout program</button>` : ""}`;
}

async function createActive(name) {
  const workout = WORKOUTS[name];
  state.active = {
    id: uuid(),
    workout: name,
    startedAt: Date.now(),
    bodyWeight: state.settings.bodyWeight,
    exercises: workout.exercises.map(([phase, exercise, sets, reps, rest, cue], position) => ({
      id: uuid(), position, phase, name: exercise, targetSets: sets, targetReps: reps, rest, cue, notes: "",
      sets: Array.from({length: sets}, (_, index) => ({id:uuid(), setNumber:index+1, weight:"", reps:"", done:false})),
    })),
  };
  if (isSupabaseConfigured) await createRemoteWorkout(state.active, remoteUserId());
  persist();
}

function renderWorkout() {
  const active = state.active;
  if (!active) { state.modal = "routines"; state.view = "home"; return renderHome(); }
  const saving = state.workoutSaveStatus === "saving";
  return shell(`<main class="page wide">
    <div class="session-head"><div><p class="eyebrow">Current session</p><h1>${esc(active.workout)} Day</h1></div><div class="timer"><span class="caption">Elapsed</span><strong id="timer">00:00</strong></div></div>
    ${renderRestTimerControls()}
    <div class="workout-layout">
      ${active.exercises.map((exercise, ei) => renderExercise(exercise, ei)).join("")}
      <button class="btn add-exercise-wide" data-action="add-active-exercise">${icon("plus")} Add exercise</button>
      <div class="session-actions"><p class="save-status" role="status" aria-live="polite">${saving ? "Saving your sets securely…" : state.workoutSaveStatus === "error" ? "Save failed. Your workout is still open—please try again." : ""}</p><button class="btn" data-action="cancel-workout" ${saving?"disabled":""}>Cancel</button><button class="btn primary" data-action="finish-workout" ${saving?'disabled aria-busy="true"':""}>${saving ? "Saving…" : "Finish Workout"}</button></div>
    </div>
  </main>`, "logbook");
}
function phaseClass(phase) { return phase === "Power" ? "power" : phase.includes("Core") ? "core" : ""; }
function previousPerformance(exerciseName) {
  const previous = state.history.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(h => ({session:h,exercise:(h.exercises||[]).find(ex=>ex.name===exerciseName)})).find(x=>x.exercise?.sets?.length);
  if (!previous) return "No previous performance";
  return previous.exercise.sets.map(set => `${weightLabel(set.weight)} × ${set.reps}`).join(" · ");
}
function renderExercise(ex, ei) {
  return `<article class="card exercise-card">
    <div class="exercise-head"><div><span class="tag ${phaseClass(ex.phase)}">${esc(ex.phase)}</span><h2>${esc(ex.name)}</h2><div class="exercise-prescription"><b>${ex.targetSets} sets × ${esc(ex.targetReps)}</b> · Rest ${esc(ex.rest)}</div><div class="previous-line">Previous: ${esc(previousPerformance(ex.name))}</div></div><div class="exercise-menu"><button class="mini-btn" data-edit-active="${ei}">Replace</button><button class="mini-btn danger-text" data-remove-active="${ei}">Remove</button></div></div>
    <div class="sets-head"><span>Set</span><span>Load (${state.settings.units})</span><span>Reps / m</span><span>Done</span></div>
    ${ex.sets.map((set,si)=>`<div class="set-row"><span class="set-num">${si+1}</span><input class="set-input" inputmode="decimal" aria-label="${esc(ex.name)} set ${si+1} load" data-field="weight" data-exercise="${ei}" data-set="${si}" value="${esc(set.weight)}" placeholder="—"><input class="set-input" inputmode="numeric" aria-label="${esc(ex.name)} set ${si+1} reps" data-field="reps" data-exercise="${ei}" data-set="${si}" value="${esc(set.reps)}" placeholder="—"><button class="set-check ${set.done?"done":""}" data-check="${ei}:${si}" aria-label="Mark set complete">${set.done?icon("check"):""}</button></div>`).join("")}
    <button class="add-set" data-add-set="${ei}">${icon("plus")} Add set</button>
    <textarea class="notes-field" data-notes="${ei}" placeholder="${esc(ex.cue || "Exercise notes…")}">${esc(ex.notes)}</textarea>
  </article>`;
}

function renderLogbook() {
  const q = state.search.trim().toLowerCase();
  const filtered = state.history.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).filter(h => !q || `${h.workout} ${(h.muscles||[]).join(" ")}`.toLowerCase().includes(q));
  return shell(`<main class="page"><div class="section-head"><h1 class="page-title">Logbook</h1>${state.active?`<button class="btn primary" data-nav="workout">Resume</button>`:""}</div>
    <div class="toolbar"><div class="search">${icon("search")}<input class="field" id="history-search" value="${esc(state.search)}" placeholder="Search workouts or muscle groups"></div><button class="btn" data-action="open-routines">+ New</button></div>
    <div class="stack">${filtered.length ? filtered.map(renderHistoryCard).join("") : `<div class="card empty">No workouts match your search.</div>`}</div>
  </main>`, "logbook");
}
function renderHistoryCard(h) {
  return `<article class="card history-card" data-history="${esc(h.id)}" role="button" tabindex="0" aria-label="Open ${esc(h.workout)} workout from ${fmtDate(h.date)}"><p class="eyebrow">${fmtDate(h.date)}</p><h3>${esc(h.workout)} · Hybrid Session</h3><div class="meta-row"><span class="meta">${icon("clock")} ${h.duration} min</span><span class="meta">${icon("dumbbell")} ${weightLabel(h.volume)}</span></div><div class="history-tags">${(h.muscles||[]).map(m=>`<span>${esc(m)}</span>`).join("")}</div></article>`;
}

function linePoints(values, width=520, height=130, zeroBase=true) {
  if (!values.length) return "";
  const max = Math.max(...values, zeroBase ? 1 : -Infinity), min = zeroBase ? Math.min(...values, 0) : Math.min(...values), spread = max-min || 1;
  return values.map((v,i)=>`${20 + i * ((width-40)/Math.max(1,values.length-1))},${height-15-((v-min)/spread)*(height-35)}`).join(" ");
}
function lineChart(pts) {
  return `<svg class="line-chart" viewBox="0 0 520 130" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="var(--bamboo)" stroke-width="3" vector-effect="non-scaling-stroke"/>${pts.split(" ").filter(Boolean).map(p=>{const [x,y]=p.split(",");return `<circle cx="${x}" cy="${y}" r="4"/>`}).join("")}</svg>`;
}
function renderProgress() {
  const windowDays = state.period === "week" ? 7 : state.period === "month" ? 30 : 365;
  const cutoff = Date.now() - windowDays * 86400000;
  const ordered = state.history.filter(h=>new Date(h.date).getTime()>=cutoff).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const values = ordered.map(h=>h.volume);
  const total = values.reduce((a,b)=>a+b,0);
  const best = Math.max(...values,0);
  const records = getRecords();
  const weights = ordered.filter(h=>h.bodyWeight).map(h=>h.bodyWeight);
  const latestWeight = weights.length ? weights[weights.length-1] : state.settings.bodyWeight;
  const weightDelta = unitWeight(weights.length > 1 ? weights[weights.length-1]-weights[0] : 0);
  const weightNote = weights.length > 1
    ? `${weightDelta >= 0 ? "+" : "−"}${fmtNum(Math.abs(weightDelta),1)} ${state.settings.units} across ${weights.length} check-ins this ${state.period}`
    : weights.length === 1 ? `1 check-in this ${state.period}` : `Logged when you start a workout`;
  return shell(`<main class="page"><div class="section-head progress-head"><h1 class="page-title">Performance</h1><div class="segmented">${["week","month","year"].map(p=>`<button class="${state.period===p?"active":""}" data-period="${p}">${p[0].toUpperCase()+p.slice(1)}</button>`).join("")}</div></div>
    <section class="stats-grid"><article class="card stat-card chart-card"><span class="label">Training volume</span><strong>${weightLabel(total)}</strong><small>Across ${ordered.length} sessions in this ${state.period}</small>${lineChart(linePoints(values))}</article>
      <article class="card stat-card chart-card"><span class="label">Body weight</span><strong>${weightLabel(latestWeight)}</strong><small>${weightNote}</small>${weights.length ? lineChart(linePoints(weights, 520, 130, false)) : `<p class="caption chart-empty">Add your body weight when starting a workout to build this trend.</p>`}</article>
      <article class="card stat-card"><span class="label">Best session</span><strong>${weightLabel(best)}</strong><small>Volume</small></article></section>
    <section class="section"><div class="section-head"><h2 class="section-title">Personal Records</h2><span class="caption">Estimated 1RM</span></div><div class="stack">${records.length?records.map(r=>`<article class="card compact record-row"><span class="record-icon">${icon("dumbbell")}</span><div><strong>${esc(r.name)}</strong><div class="caption">${fmtNum(r.weight,1)} ${state.settings.units} × ${r.reps} reps</div></div><div class="metric">${fmtNum(r.e1rm,1)}</div></article>`).join(""):`<div class="card empty">Complete weighted sets to build your records.</div>`}</div></section>
  </main>`, "progress");
}
function getRecords() {
  const map = new Map();
  state.history.forEach(h => (h.exercises||[]).forEach(ex => (ex.sets||[]).forEach(set => {
    const kg = Number(set.weight)||0, reps=Number(set.reps)||0;
    const e1rm = unitWeight(kg * (1 + reps/30));
    if (kg && reps && (!map.has(ex.name) || e1rm > map.get(ex.name).e1rm)) map.set(ex.name,{name:ex.name,weight:unitWeight(kg),reps,e1rm});
  })));
  return [...map.values()].sort((a,b)=>b.e1rm-a.e1rm).slice(0,4);
}

function renderFood() {
  const date = state.foodDate;
  const isToday = date === localDate(new Date());
  const entries = state.food.filter(e => e.date === date);
  const totals = entries.reduce((t,e)=>({cal:t.cal+e.calories, p:t.p+(e.protein||0), c:t.c+(e.carbs||0), f:t.f+(e.fat||0)}), {cal:0,p:0,c:0,f:0});
  const hasMacros = totals.p || totals.c || totals.f;
  const filledSlots = new Set(entries.map(e => e.slot).filter(Boolean));
  const nextSlot = Array.from({length:6},(_,i)=>i+1).find(n => !filledSlots.has(n)) || 6;
  const days = Array.from({length:7}, (_,i) => { const d = new Date(); d.setDate(d.getDate()-(6-i)); return localDate(d); });
  const series = days.map(d => state.food.filter(e => e.date === d).reduce((s,e) => s+e.calories, 0));
  const weekTotal = series.reduce((a,b)=>a+b,0);
  return shell(`<main class="page">
    <div class="section-head"><h1 class="page-title">Nutrition</h1><div class="date-stepper"><button class="icon-btn" data-food-day="-1" aria-label="Previous day">${icon("back")}</button><strong>${isToday ? "Today" : fmtDate(date+"T12:00:00")}</strong><button class="icon-btn" data-food-day="1" aria-label="Next day" ${isToday?"disabled":""}>${icon("chevron")}</button></div></div>
    ${state.foodError ? `<section class="section card connection-card"><span class="tag power">Setup</span><div><strong>Food log database setup required</strong><p>${esc(state.foodError)}</p></div></section>` : ""}
    <section class="stats-grid">
      <article class="card stat-card"><span class="label">Meals</span><strong>${filledSlots.size}/6</strong><small>${filledSlots.size >= 6 ? "All feedings logged — nice work" : `feedings logged ${isToday ? "today" : "this day"}`}</small><div class="slot-pills">${Array.from({length:6},(_,i)=>`<span class="slot-pill ${filledSlots.has(i+1)?"filled":""}">${i+1}</span>`).join("")}</div></article>
      <article class="card stat-card"><span class="label">${isToday ? "Today" : "Day"} total</span><strong>${fmtNum(totals.cal)} kcal</strong><small>${entries.length} ${entries.length===1?"entry":"entries"} logged</small></article>
      <article class="card stat-card"><span class="label">Macros</span><strong>${hasMacros ? `${fmtNum(totals.p)}P · ${fmtNum(totals.c)}C · ${fmtNum(totals.f)}F` : "—"}</strong><small>${hasMacros ? "Grams of protein · carbs · fat" : "Add macros to any meal to track them"}</small></article>
    </section>
    <section class="section"><form class="card" id="food-form"><p class="eyebrow">Log a meal</p><div class="form-grid"><label>Meal<input name="name" placeholder="e.g. Chicken rice bowl" maxlength="120" required></label><div class="split-columns"><label>Meal slot<select name="slot">${Array.from({length:6},(_,i)=>`<option value="${i+1}" ${i+1===nextSlot?"selected":""}>Meal ${i+1}${filledSlots.has(i+1)?" ·":""}</option>`).join("")}<option value="">Snack / no slot</option></select></label><label>Time<input name="time" type="time" value="${isToday ? new Date().toTimeString().slice(0,5) : ""}"></label></div><label>Calories (kcal)<input name="calories" type="number" inputmode="numeric" min="0" max="10000" step="1" required></label><div class="macro-columns"><label>Protein (g)<input name="protein" type="number" inputmode="decimal" min="0" max="1000" step="any"></label><label>Carbs (g)<input name="carbs" type="number" inputmode="decimal" min="0" max="1000" step="any"></label><label>Fat (g)<input name="fat" type="number" inputmode="decimal" min="0" max="1000" step="any"></label></div>${isSupabaseConfigured ? `<label class="photo-field">Photo (optional)<input name="photo" type="file" accept="image/*"></label>` : `<p class="caption">Meal photos need a signed-in account with cloud sync.</p>`}</div><div class="modal-actions"><button class="btn primary" type="submit">Add meal</button></div></form></section>
    <section class="section"><div class="stack">${entries.length ? entries.slice().sort((a,b)=>(a.slot||99)-(b.slot||99)||String(a.time||"").localeCompare(String(b.time||""))).map(e=>`<article class="card compact food-row">${e.photoPath?`<img class="food-thumb" data-meal-photo="${esc(e.photoPath)}" alt="Photo of ${esc(e.name)}">`:""}<div><strong>${esc(e.name)}</strong><div class="caption">${[e.slot?`Meal ${e.slot}`:"Snack", e.time||null, [e.protein!=null?`P ${fmtNum(e.protein,1)}g`:null, e.carbs!=null?`C ${fmtNum(e.carbs,1)}g`:null, e.fat!=null?`F ${fmtNum(e.fat,1)}g`:null].filter(Boolean).join(" ") || null].filter(Boolean).join(" · ")}</div></div><div class="food-row-right"><span class="metric">${fmtNum(e.calories)}</span><button class="mini-btn danger-text" data-remove-food="${esc(e.id)}">Remove</button></div></article>`).join("") : `<div class="card empty">No meals logged for this day yet.</div>`}</div></section>
    <section class="section"><article class="card stat-card chart-card"><span class="label">Last 7 days</span><strong>${fmtNum(weekTotal)} kcal</strong><small>Daily calorie totals ending today</small>${weekTotal ? lineChart(linePoints(series)) : `<p class="caption chart-empty">Log meals to build your calorie trend.</p>`}</article></section>
  </main>`, "food");
}

function renderProfile() {
  const lifetimeVolume = state.history.reduce((sum, workout) => sum + workout.volume, 0);
  const lifetimeMinutes = state.history.reduce((sum, workout) => sum + workout.duration, 0);
  return shell(`<main class="page"><section class="profile-hero"><div class="avatar large">${esc(initials(state.settings.name))}</div><div><h1>${esc(state.settings.name)}</h1><p class="subtle">Hybrid athlete · PPL / Upper / Lower</p><span class="tag">Athletic hypertrophy</span></div></section>
    <section class="section stats-grid"><article class="card stat-card"><span class="label">Workouts</span><strong>${state.history.length}</strong><small>All time</small></article><article class="card stat-card"><span class="label">Total volume</span><strong>${weightLabel(lifetimeVolume)}</strong><small>All time</small></article><article class="card stat-card"><span class="label">Training time</span><strong>${fmtNum(lifetimeMinutes)} min</strong><small>All time</small></article></section>
    <section class="section card goal-card"><span class="eyebrow">Active goal</span><h2>Build strength without losing speed</h2><div class="progress"><span></span></div><p class="caption">Power quality, progressive overload, resilient trunk.</p></section>
    <section class="section"><p class="eyebrow">Preferences</p><div class="card settings-list">
      <button class="setting-row" data-action="edit-program"><span class="setting-icon">${icon("log")}</span><span><strong>Workout program</strong><small>Edit days, exercises and prescriptions</small></span>${icon("chevron")}</button>
      <button class="setting-row" data-action="edit-profile"><span class="setting-icon">${icon("user")}</span><span><strong>Profile details</strong><small>Name and body weight</small></span>${icon("chevron")}</button>
      <button class="setting-row" data-action="toggle-units"><span class="setting-icon">${icon("dumbbell")}</span><span><strong>Preferred units</strong><small>${state.settings.units === "kg" ? "Metric (kg)" : "Imperial (lb)"}</small></span>${icon("chevron")}</button>
      <button class="setting-row" data-action="toggle-reminders"><span class="setting-icon">${icon("clock")}</span><span><strong>Reminders</strong><small>${state.settings.reminders ? "Enabled" : "Off"}</small></span><span class="switch ${state.settings.reminders?"on":""}"></span></button>
      <button class="setting-row" data-action="toggle-auto-rest"><span class="setting-icon">${icon("clock")}</span><span><strong>Automatic rest timer</strong><small>Start after a completed set</small></span><span class="switch ${state.settings.autoRestTimer?"on":""}"></span></button>
      <label class="setting-row setting-select-row"><span class="setting-icon">${icon("clock")}</span><span><strong>Automatic rest duration</strong><small>Used after successful set saves</small></span><select data-rest-default aria-label="Automatic rest duration">${REST_PRESETS.map(seconds=>`<option value="${seconds}" ${state.settings.autoRestDuration===seconds?"selected":""}>${seconds} sec</option>`).join("")}</select></label>
      <button class="setting-row" data-action="toggle-rest-alerts"><span class="setting-icon">${icon("clock")}</span><span><strong>Rest timer alerts</strong><small>Sound and vibration</small></span><span class="switch ${state.settings.restTimerAlerts?"on":""}"></span></button>
      <button class="setting-row" data-action="export"><span class="setting-icon">${icon("download")}</span><span><strong>Export data</strong><small>JSON backup</small></span>${icon("chevron")}</button>
    </div></section>
    ${isSupabaseConfigured ? `<section class="section"><button class="btn danger" style="width:100%" data-action="sign-out">Sign out</button></section>` : `<section class="section"><button class="btn danger" style="width:100%" data-action="reset-data">Reset demo data</button></section>`}
  </main>`, "profile");
}

function exerciseEditorDefaults() {
  const editor = state.exerciseEditor;
  if (!editor) return {phase:"Hypertrophy",name:"",targetSets:2,targetReps:"8–12",rest:"90 sec",cue:""};
  if (editor.scope === "program" && editor.mode === "edit") {
    const row = WORKOUTS[editor.day].exercises[editor.index];
    return {phase:row[0],name:row[1],targetSets:row[2],targetReps:row[3],rest:row[4],cue:row[5]};
  }
  if (editor.scope === "active" && editor.mode === "edit") return state.active.exercises[editor.index];
  return {phase:"Hypertrophy",name:"",targetSets:2,targetReps:"8–12",rest:"90 sec",cue:""};
}

function renderProgramEditor() {
  const day = state.editDay;
  const workout = WORKOUTS[day];
  return `<div class="modal-backdrop" data-modal-backdrop><div class="modal program-editor"><div class="section-head"><div><p class="eyebrow">Supabase program</p><h2>Edit workout routine</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Close workout editor">×</button></div><div class="day-tabs">${Object.keys(WORKOUTS).map(name=>`<button class="${name===day?"active":""}" data-edit-day="${name}">${name}</button>`).join("")}</div><div class="editor-list">${workout.exercises.map((ex,index)=>`<div class="editor-row"><div><span class="tag ${phaseClass(ex[0])}">${esc(ex[0])}</span><strong>${esc(ex[1])}</strong><small>${ex[2]} sets × ${esc(ex[3])} · ${esc(ex[4])}</small></div><div><button class="mini-btn" data-edit-program-exercise="${index}">Edit / Replace</button><button class="mini-btn danger-text" data-remove-program-exercise="${index}">Remove</button></div></div>`).join("")}</div><button class="btn primary editor-add" data-action="add-program-exercise">${icon("plus")} Add exercise to ${day}</button></div></div>`;
}

function renderExerciseEditor() {
  const values = exerciseEditorDefaults();
  const title = state.exerciseEditor?.mode === "edit" ? "Edit or replace exercise" : "Add exercise";
  return `<div class="modal-backdrop" data-modal-backdrop><form class="modal" id="exercise-form"><p class="eyebrow">Workout builder</p><h2>${title}</h2><div class="form-grid"><label>Exercise name<input name="name" value="${esc(values.name)}" required></label><label>Training phase<select name="phase"><option ${values.phase==="Power"?"selected":""}>Power</option><option ${values.phase==="Hypertrophy"?"selected":""}>Hypertrophy</option><option ${values.phase==="Core / Athletic"?"selected":""}>Core / Athletic</option></select></label><div class="form-columns"><label>Sets<input name="targetSets" type="number" min="1" max="10" value="${Number(values.targetSets)||2}" required></label><label>Target reps<input name="targetReps" value="${esc(values.targetReps)}" required></label></div><label>Rest interval<input name="rest" value="${esc(values.rest)}" required></label><label>Technique cue<input name="cue" value="${esc(values.cue||"")}"></label></div><div class="modal-actions"><button type="button" class="btn" data-action="close-exercise-editor">Cancel</button><button class="btn primary" type="submit">Save exercise</button></div></form></div>`;
}

function renderDayPreview() {
  const name=state.previewDay, workout=WORKOUTS[name];
  return `<div class="modal-backdrop" data-modal-backdrop><div class="modal program-editor"><div class="section-head"><div><p class="eyebrow">${workout.duration} · ${totalSets(name)} sets</p><h2>${name} Day</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Close workout preview">×</button></div><p class="subtle">${esc(workout.focus)}</p><div class="editor-list day-preview-list">${workout.exercises.map(ex=>`<div class="editor-row"><div><span class="tag ${phaseClass(ex[0])}">${esc(ex[0])}</span><strong>${esc(ex[1])}</strong><small>${ex[2]} sets × ${esc(ex[3])} · Rest ${esc(ex[4])}</small></div></div>`).join("")}</div><button class="btn primary editor-add" data-start="${name}">${icon("play")} Start ${name}</button></div></div>`;
}

function renderAuth() {
  const signup = state.authMode === "signup";
  app.innerHTML = `<main class="auth-page"><section class="auth-brand"><div class="brand">TRAIN</div><p>Hybrid strength, power and athletic-core training.</p></section><form class="card auth-card" id="auth-form"><p class="eyebrow">Cloud logbook</p><h1>${signup ? "Create your account" : "Welcome back"}</h1>${signup ? `<label>Display name<input name="displayName" autocomplete="name" required></label>` : ""}<label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="8" required></label><button class="btn primary" type="submit">${signup ? "Create account" : "Sign in"}</button><button class="text-btn" type="button" data-action="toggle-auth">${signup ? "Already have an account? Sign in" : "New here? Create an account"}</button><p class="caption">Your workouts are protected by account-level database policies.</p></form></main>`;
}

function renderModal() {
  if (!state.modal) return "";
  if (state.modal === "rest-timer") return `<div class="modal-backdrop" data-modal-backdrop><div class="modal rest-timer-modal" role="dialog" aria-modal="true" aria-label="Rest timer"><div class="section-head"><span></span><button class="icon-btn" data-action="close-modal" aria-label="Close rest timer">×</button></div>${renderRestTimerControls(true)}</div></div>`;
  if (state.modal === "day-preview") return renderDayPreview();
  if (state.modal === "program-editor") return renderProgramEditor();
  if (state.modal === "exercise-editor") return renderExerciseEditor();
  if (state.modal === "routines") return `<div class="modal-backdrop" data-modal-backdrop><div class="modal" role="dialog" aria-modal="true" aria-label="Choose a workout"><div class="section-head"><div><p class="eyebrow">Training plan</p><h2>Choose a workout</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Close workout chooser">×</button></div>${renderRoutines()}</div></div>`;
  if (state.modal === "profile") return `<div class="modal-backdrop" data-modal-backdrop><form class="modal" id="profile-form" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title"><p class="eyebrow">Profile</p><h2 id="profile-modal-title">Edit details</h2><div class="form-grid"><label>Name<input name="name" value="${esc(state.settings.name)}" required></label><label>Body weight (${state.settings.units})<input name="bodyWeight" type="number" min="20" max="500" step="0.1" value="${fmtNum(unitWeight(state.settings.bodyWeight),1)}" required></label></div><div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Cancel</button><button class="btn primary" type="submit">Save</button></div></form></div>`;
  if (state.modal === "history") {
    const h = state.history.find(x=>x.id===state.selectedWorkoutId);
    if (!h) return "";
    return `<div class="modal-backdrop" data-modal-backdrop><div class="modal" role="dialog" aria-modal="true" aria-labelledby="workout-details-title"><div class="section-head"><div><p class="eyebrow">${fmtDate(h.date)}</p><h2 id="workout-details-title">${esc(h.workout)} Session</h2></div><button class="icon-btn" data-action="close-modal" data-modal-primary-focus aria-label="Close workout details">×</button></div><div class="meta-row"><span>${h.duration} min</span><span>${weightLabel(h.volume)}</span></div><div class="stack section">${(h.exercises||[]).map(ex=>`<div class="card compact"><strong>${esc(ex.name)}</strong><div class="caption">${(ex.sets||[]).map(s=>`${weightLabel(s.weight)} × ${s.reps}`).join(" · ") || "No weighted sets"}</div></div>`).join("")}</div><div class="modal-actions modal-actions-split"><button class="btn danger" data-action="delete-workout">Delete workout</button><div class="modal-actions" style="margin:0"><button class="btn" data-action="edit-workout">Edit</button><button class="btn" data-action="close-modal">Close</button></div></div></div></div>`;
  }
  if (state.modal === "history-edit") {
    const h = state.history.find(x=>x.id===state.selectedWorkoutId);
    if (!h) return "";
    return `<div class="modal-backdrop" data-modal-backdrop><form class="modal" id="history-edit-form" role="dialog" aria-modal="true" aria-labelledby="history-edit-title"><div class="section-head"><div><p class="eyebrow">${fmtDate(h.date)}</p><h2 id="history-edit-title">Edit ${esc(h.workout)} Session</h2></div><button type="button" class="icon-btn" data-action="back-to-history" data-modal-primary-focus aria-label="Close workout editor">×</button></div>
      <div class="form-grid"><label>Duration (minutes)<input name="duration" type="number" min="1" max="1440" step="1" value="${h.duration}" required></label></div>
      <div class="stack section">${(h.exercises||[]).map((ex,ei)=>`<div class="card compact"><strong>${esc(ex.name)}</strong><div class="sets-head"><span>Set</span><span>Load (${state.settings.units})</span><span>Reps</span><span></span></div>${(ex.sets||[]).map((s,si)=>`<div class="set-row"><span class="set-num">${si+1}</span><input class="set-input" type="number" inputmode="decimal" min="0" max="5000" step="any" name="weight-${ei}-${si}" value="${Math.round(unitWeight(s.weight)*10)/10}" aria-label="${esc(ex.name)} set ${si+1} load"><input class="set-input" type="number" inputmode="decimal" min="0" max="1000" step="any" name="reps-${ei}-${si}" value="${s.reps}" aria-label="${esc(ex.name)} set ${si+1} reps"><span></span></div>`).join("")}</div>`).join("")}</div>
      <div class="modal-actions"><button type="button" class="btn" data-action="back-to-history">Cancel</button><button class="btn primary" type="submit">Save changes</button></div></form></div>`;
  }
  return "";
}

function render() {
  document.body.classList.toggle("modal-open", Boolean(state.modal));
  if (state.loading) { app.innerHTML = `<main class="auth-page"><div class="brand">TRAIN</div><p class="subtle">Connecting your logbook…</p></main>`; return; }
  if (isSupabaseConfigured && !state.session) { renderAuth(); return; }
  if (state.view === "workout") app.innerHTML = renderWorkout();
  else if (state.view === "logbook") app.innerHTML = renderLogbook();
  else if (state.view === "food") { app.innerHTML = renderFood(); hydrateMealPhotos(); }
  else if (state.view === "progress") app.innerHTML = renderProgress();
  else if (state.view === "profile") app.innerHTML = renderProfile();
  else app.innerHTML = renderHome();
  updateTimer();
  if (state.modal) requestAnimationFrame(() => document.querySelector("[data-modal-primary-focus]")?.focus());
}
function updateTimer() {
  clearInterval(updateTimer.interval);
  const tick = () => {
    const el = document.querySelector("#timer");
    if (el && state.active) {
      const seconds = Math.floor((Date.now()-state.active.startedAt)/1000);
      el.textContent = `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
    }
    const rest = restTimer.tick();
    document.querySelectorAll("[data-rest-display]").forEach(display => {
      display.textContent = rest.status === "complete" ? (display.classList.contains("rest-time") ? "REST COMPLETE" : "DONE") : formatRestTime(rest.remainingSeconds);
    });
  };
  tick();
  if (state.view === "workout" || restTimer.snapshot().status === "running") updateTimer.interval = setInterval(tick,1000);
}

app.addEventListener("click", async event => {
  const backdrop = event.target.closest("[data-modal-backdrop]");
  if (backdrop && event.target === backdrop) {
    if (state.modal === "exercise-editor" && state.exerciseEditor?.scope === "program") {
      state.exerciseEditor = null;
      state.modal = "program-editor";
      render();
    } else closeModal();
    return;
  }
  const nav = event.target.closest("[data-nav]");
  if (nav) { state.modal = null; state.selectedWorkoutId = null; state.view = nav.dataset.nav; if (state.view === "food") { state.foodDate = localDate(new Date()); ensureFoodLoaded(); } render(); window.scrollTo({top:0,behavior:"smooth"}); return; }
  const viewDay = event.target.closest("[data-view-day]");
  if (viewDay) { state.previewDay=viewDay.dataset.viewDay; state.modal="day-preview"; render(); return; }
  const start = event.target.closest("[data-start]");
  if (start) {
    const name = state.active ? state.active.workout : start.dataset.start;
    try { if (!state.active) await createActive(name); }
    catch (error) { state.active = null; showToast(error.message || "Workout could not start"); return; }
    state.modal = null; state.view = "workout"; render(); window.scrollTo(0,0); return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  const restPreset = event.target.closest("[data-rest-preset]");
  if (restPreset) {
    primeRestAudio();
    restTimer.start(Number(restPreset.dataset.restPreset));
    render();
    return;
  }
  if (action === "open-routines") { openModal("routines"); return; }
  if (action === "close-modal") { closeModal(); return; }
  if (action === "open-rest-timer") { primeRestAudio(); openModal("rest-timer"); return; }
  if (action === "pause-rest-timer") { restTimer.pause(); render(); return; }
  if (action === "resume-rest-timer") { primeRestAudio(); restTimer.resume(); render(); return; }
  if (action === "add-rest-time") { restTimer.add(30); render(); return; }
  if (action === "restart-rest-timer") { primeRestAudio(); restTimer.restart(); render(); return; }
  if (action === "dismiss-rest-timer") { restTimer.dismiss(); if(state.modal==="rest-timer")closeModal();else render(); return; }
  if (action === "edit-program") { if(state.programError){showToast(state.programError);return;} state.modal="program-editor"; render(); return; }
  if (action === "add-program-exercise") { state.exerciseEditor={scope:"program",mode:"add",day:state.editDay}; state.modal="exercise-editor"; render(); return; }
  if (action === "add-active-exercise") { state.exerciseEditor={scope:"active",mode:"add"}; state.modal="exercise-editor"; render(); return; }
  if (action === "close-exercise-editor") { const back=state.exerciseEditor?.scope==="program"; state.exerciseEditor=null; state.modal=back?"program-editor":null; render(); return; }
  if (action === "cancel-workout") { if (state.workoutSaveStatus === "saving") return; if (confirm("Cancel this session? Logged sets will be discarded.")) { try { if (isSupabaseConfigured) await cancelRemoteWorkout(state.active.id); state.active=null; state.workoutSaveStatus="idle"; persist(); state.view="home"; render(); } catch(error) { showToast(error.message || "Workout could not be cancelled"); } } return; }
  if (action === "finish-workout") { await finishWorkout(); return; }
  if (action === "edit-profile") { state.modal="profile"; render(); return; }
  if (action === "toggle-units") { state.settings.units = state.settings.units === "kg" ? "lb" : "kg"; persist(); if(isSupabaseConfigured) await saveProfile(remoteUserId(), state.settings); render(); showToast(`Units changed to ${state.settings.units}`); return; }
  if (action === "toggle-reminders") { state.settings.reminders=!state.settings.reminders; persist(); if(isSupabaseConfigured) await saveProfile(remoteUserId(), state.settings); render(); return; }
  if (action === "toggle-auto-rest") { state.settings.autoRestTimer=!state.settings.autoRestTimer; persist(); render(); return; }
  if (action === "toggle-rest-alerts") { state.settings.restTimerAlerts=!state.settings.restTimerAlerts; if(state.settings.restTimerAlerts)primeRestAudio(); persist(); render(); return; }
  if (action === "export") { exportData(); return; }
  if (action === "sign-out") { restTimer.dismiss(); await signOut(); return; }
  if (action === "toggle-auth") { state.authMode = state.authMode === "signin" ? "signup" : "signin"; render(); return; }
  if (action === "reset-data") { if(confirm("Reset all app data and restore the demo history?")){restTimer.dismiss();localStorage.removeItem(STORE);location.reload();} return; }
  if (action === "edit-workout") { state.modal = "history-edit"; render(); return; }
  if (action === "back-to-history") { state.modal = "history"; render(); return; }
  if (action === "delete-workout") {
    const id = state.selectedWorkoutId;
    const workout = state.history.find(item => item.id === id);
    if (!workout) { closeModal(); return; }
    if (!confirm(`Delete this ${workout.workout} workout? This cannot be undone.`)) return;
    try {
      if (isSupabaseConfigured) await deleteWorkoutSession(id, remoteUserId());
      state.history = state.history.filter(item => item.id !== id);
      persist();
      closeModal();
      showToast("Workout deleted");
    } catch (error) { showToast(error.message || "Workout could not be deleted"); }
    return;
  }
  const check = event.target.closest("[data-check]");
  if (check) {
    const [ei,si]=check.dataset.check.split(":").map(Number);
    const set=state.active.exercises[ei].sets[si];
    if (set.done) {
      set.done=false;
      persist();
      scheduleSetSync(set);
      render();
      return;
    }
    primeRestAudio();
    clearTimeout(syncTimers.get(set.id));
    syncTimers.delete(set.id);
    const completion = completeSetAndMaybeStartTimer({
      set,
      save: () => isSupabaseConfigured ? updateRemoteSet(set.id, remoteSetPatch(set)) : Promise.resolve(),
      timer: restTimer,
      enabled: state.settings.autoRestTimer,
      durationSeconds: state.settings.autoRestDuration,
    });
    persist();
    render();
    const result = await completion;
    persist();
    if (!result.ok) showToast(result.error?.message || "Set could not sync. It was not marked complete.");
    render();
    return;
  }
  const add = event.target.closest("[data-add-set]");
  if (add) { const exercise=state.active.exercises[Number(add.dataset.addSet)]; const set={id:uuid(),setNumber:exercise.sets.length+1,weight:"",reps:"",done:false}; exercise.sets.push(set); persist(); if(isSupabaseConfigured) await insertRemoteSet(exercise.id,remoteUserId(),set); render(); return; }
  const period = event.target.closest("[data-period]");
  if (period) { state.period=period.dataset.period; render(); return; }
  const foodDay = event.target.closest("[data-food-day]");
  if (foodDay) {
    const next = new Date(state.foodDate + "T12:00:00");
    next.setDate(next.getDate() + Number(foodDay.dataset.foodDay));
    const nextDate = localDate(next);
    if (nextDate <= localDate(new Date())) { state.foodDate = nextDate; render(); }
    return;
  }
  const removeFood = event.target.closest("[data-remove-food]");
  if (removeFood) {
    const entry = state.food.find(e => e.id === removeFood.dataset.removeFood);
    if (!entry) return;
    if (!confirm(`Remove ${entry.name}?`)) return;
    try {
      if (isSupabaseConfigured) await deleteFoodLog(entry.id);
      if (isSupabaseConfigured && entry.photoPath) deleteMealPhoto(entry.photoPath).catch(() => {});
      state.food = state.food.filter(e => e.id !== entry.id);
      persist(); render(); showToast("Meal removed");
    } catch (error) { showToast(error.message || "Meal could not be removed"); }
    return;
  }
  const history = event.target.closest("[data-history]");
  if (history) { openHistoryModal(history.dataset.history); return; }
  const editDay = event.target.closest("[data-edit-day]");
  if (editDay) { state.editDay=editDay.dataset.editDay; render(); return; }
  const editProgram = event.target.closest("[data-edit-program-exercise]");
  if (editProgram) { state.exerciseEditor={scope:"program",mode:"edit",day:state.editDay,index:Number(editProgram.dataset.editProgramExercise)}; state.modal="exercise-editor"; render(); return; }
  const removeProgram = event.target.closest("[data-remove-program-exercise]");
  if (removeProgram) { const index=Number(removeProgram.dataset.removeProgramExercise); const ex=WORKOUTS[state.editDay].exercises[index]; if(confirm(`Remove ${ex[1]} from ${state.editDay}?`)){try{await deleteProgramExercise(ex[6]);WORKOUTS[state.editDay].exercises.splice(index,1);render();showToast("Exercise removed");}catch(error){showToast(error.message||"Exercise could not be removed");}} return; }
  const editActive = event.target.closest("[data-edit-active]");
  if (editActive) { state.exerciseEditor={scope:"active",mode:"edit",index:Number(editActive.dataset.editActive)}; state.modal="exercise-editor"; render(); return; }
  const removeActive = event.target.closest("[data-remove-active]");
  if (removeActive) { const index=Number(removeActive.dataset.removeActive); const ex=state.active.exercises[index]; if(confirm(`Remove ${ex.name} from this session?`)){try{if(isSupabaseConfigured)await deleteRemoteExercise(ex.id);state.active.exercises.splice(index,1);persist();render();showToast("Exercise removed from session");}catch(error){showToast(error.message||"Exercise could not be removed");}} return; }
});

app.addEventListener("input", event => {
  const field = event.target.closest("[data-field]");
  if (field && state.active) {
    const ex = state.active.exercises[Number(field.dataset.exercise)];
    const set = ex.sets[Number(field.dataset.set)];
    set[field.dataset.field] = field.value;
    persist();
    scheduleSetSync(set);
  }
  const notes = event.target.closest("[data-notes]");
  if (notes && state.active) { const exercise=state.active.exercises[Number(notes.dataset.notes)]; exercise.notes=notes.value; persist(); scheduleExerciseSync(exercise); }
  if (event.target.id === "history-search") { state.search=event.target.value; clearTimeout(app.searchTimer); app.searchTimer=setTimeout(render,180); }
});

app.addEventListener("change", event => {
  const restDefault = event.target.closest("[data-rest-default]");
  if (!restDefault) return;
  const seconds = Number(restDefault.value);
  if (!REST_PRESETS.includes(seconds)) return;
  state.settings.autoRestDuration = seconds;
  persist();
  showToast(`Automatic rest set to ${seconds} seconds`);
});

window.addEventListener("keydown", event => {
  if (event.key === "Escape" && state.modal) {
    event.preventDefault();
    if (state.modal === "exercise-editor" && state.exerciseEditor?.scope === "program") {
      state.exerciseEditor = null;
      state.modal = "program-editor";
      render();
    } else closeModal();
    return;
  }
  const history = event.target.closest?.("[data-history]");
  if (!state.modal && history && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openHistoryModal(history.dataset.history);
  }
});

app.addEventListener("submit", async event => {
  if (event.target.matches("[data-rest-timer-form]")) {
    event.preventDefault();
    primeRestAudio();
    const seconds = Number(new FormData(event.target).get("seconds"));
    if (!validateRestDuration(seconds)) {
      const error = event.target.closest(".rest-timer-card")?.querySelector(".rest-validation");
      if (error) error.textContent = "Enter a whole number from 5 to 1,800 seconds.";
      return;
    }
    restTimer.start(seconds);
    render();
    return;
  }
  if (event.target.id === "exercise-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    const exercise = {
      name: form.get("name").trim(), phase: form.get("phase"), targetSets: Number(form.get("targetSets")),
      targetReps: form.get("targetReps").trim(), rest: form.get("rest").trim(), cue: form.get("cue").trim(),
    };
    const editor = state.exerciseEditor;
    try {
      if (editor.scope === "program") {
        const workout = WORKOUTS[editor.day];
        if (editor.mode === "add") {
          const position = Math.max(0, ...workout.exercises.map((ex,index)=>Number(ex[7] ?? index+1))) + 1;
          const savedExercise = await addProgramExercise(workout.dayId, remoteUserId(), exercise, position);
          workout.exercises.push([exercise.phase,exercise.name,exercise.targetSets,exercise.targetReps,exercise.rest,exercise.cue,savedExercise.id,savedExercise.position]);
        } else {
          const current = workout.exercises[editor.index];
          await updateProgramExercise(current[6], exercise);
          workout.exercises[editor.index] = [exercise.phase,exercise.name,exercise.targetSets,exercise.targetReps,exercise.rest,exercise.cue,current[6],current[7]];
        }
        state.exerciseEditor=null; state.modal="program-editor"; render(); showToast("Workout program saved");
      } else {
        if (editor.mode === "add") {
          const position=Math.max(-1,...state.active.exercises.map((ex,index)=>Number(ex.position??index)))+1;
          const activeExercise={id:uuid(),position,...exercise,notes:"",sets:Array.from({length:exercise.targetSets},(_,index)=>({id:uuid(),setNumber:index+1,weight:"",reps:"",done:false}))};
          if(isSupabaseConfigured)await insertRemoteExercise(state.active.id,remoteUserId(),activeExercise,position);
          state.active.exercises.push(activeExercise);
        } else {
          const activeExercise=state.active.exercises[editor.index];
          Object.assign(activeExercise,exercise);
          if (exercise.targetSets > activeExercise.sets.length) {
            while(activeExercise.sets.length<exercise.targetSets){const set={id:uuid(),setNumber:activeExercise.sets.length+1,weight:"",reps:"",done:false};activeExercise.sets.push(set);if(isSupabaseConfigured)await insertRemoteSet(activeExercise.id,remoteUserId(),set);}
          } else if (exercise.targetSets < activeExercise.sets.length) {
            const removed=activeExercise.sets.splice(exercise.targetSets); if(isSupabaseConfigured)for(const set of removed)await deleteRemoteSet(set.id);
          }
          if(isSupabaseConfigured)await updateRemoteExerciseDetails(activeExercise.id,activeExercise);
        }
        state.exerciseEditor=null; state.modal=null; persist(); render(); showToast("Session exercise saved");
      }
    } catch(error) { showToast(error.message||"Exercise could not be saved"); }
    return;
  }
  if (event.target.id === "food-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const name = data.get("name").trim();
    const calories = Math.round(Number(data.get("calories")));
    if (!name || !Number.isFinite(calories) || calories < 0 || calories > 10000) { showToast("Enter a meal name and calories from 0 to 10,000."); return; }
    const macro = key => { const raw = data.get(key); const value = Number(raw); return raw !== "" && Number.isFinite(value) && value >= 0 ? Math.round(Math.min(value, 1000) * 10) / 10 : null; };
    const slotRaw = data.get("slot");
    const entry = {
      id: uuid(), date: state.foodDate, name, calories,
      protein: macro("protein"), carbs: macro("carbs"), fat: macro("fat"),
      slot: slotRaw ? Number(slotRaw) : null,
      time: data.get("time") || null,
      photoPath: null,
    };
    const submit = event.target.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const photo = event.target.querySelector('[name="photo"]')?.files?.[0];
      if (photo && isSupabaseConfigured) {
        const blob = await compressMealPhoto(photo);
        entry.photoPath = await uploadMealPhoto(remoteUserId(), entry.id, blob);
      }
      if (isSupabaseConfigured) await insertFoodLog(remoteUserId(), entry);
      state.food.push(entry);
      persist();
      render();
      showToast(isSupabaseConfigured ? "Meal logged and synced" : "Meal logged");
    } catch (error) { submit.disabled = false; showToast(error.message || "Meal could not be saved"); }
    return;
  }
  if (event.target.id === "history-edit-form") {
    event.preventDefault();
    const h = state.history.find(x=>x.id===state.selectedWorkoutId);
    if (!h) { closeModal(); return; }
    const data = new FormData(event.target);
    const duration = Math.round(Number(data.get("duration")));
    if (!Number.isFinite(duration) || duration < 1 || duration > 1440) { showToast("Enter a duration from 1 to 1,440 minutes."); return; }
    const changedSets = [];
    const exercises = (h.exercises||[]).map((ex,ei) => ({...ex, sets: (ex.sets||[]).map((set,si) => {
      const weightInput = event.target.elements[`weight-${ei}-${si}`];
      const repsInput = event.target.elements[`reps-${ei}-${si}`];
      const weight = weightInput.value === weightInput.defaultValue ? set.weight : Math.round(fromUnit(Number(weightInput.value) || 0) * 100) / 100;
      const reps = repsInput.value === repsInput.defaultValue ? set.reps : Number(repsInput.value) || 0;
      if (set.id && (weight !== set.weight || reps !== set.reps)) changedSets.push({id:set.id, patch:{weight_kg:weight, reps}});
      return {...set, weight, reps};
    })}));
    const volume = exercises.reduce((sum,ex)=>sum+ex.sets.reduce((s,set)=>s+set.weight*set.reps,0),0);
    try {
      if (isSupabaseConfigured) {
        for (const set of changedSets) await updateRemoteSet(set.id, set.patch);
        await updateWorkoutSessionDetails(h.id, duration, volume);
      }
      Object.assign(h, {duration, volume, exercises});
      persist();
      state.modal = "history";
      render();
      showToast(isSupabaseConfigured ? "Workout updated and synced" : "Workout updated");
    } catch(error) { showToast(error.message || "Workout could not be updated"); }
    return;
  }
  if (event.target.id === "auth-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const submit = event.target.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      if (state.authMode === "signup") {
        const result = await signUp(data.get("email"), data.get("password"), data.get("displayName"));
        if (!result.session) showToast("Check your email to confirm your account");
      } else await signIn(data.get("email"), data.get("password"));
    } catch (error) {
      showToast(error.message || "Authentication failed");
      submit.disabled = false;
    }
    return;
  }
  if (event.target.id !== "profile-form") return;
  event.preventDefault();
  const data = new FormData(event.target);
  state.settings.name = data.get("name").trim() || "Athlete";
  state.settings.bodyWeight = fromUnit(Number(data.get("bodyWeight")));
  state.modal = null; persist();
  try { if(isSupabaseConfigured) await saveProfile(remoteUserId(), state.settings); showToast("Profile updated"); }
  catch(error) { showToast(error.message || "Profile could not sync"); }
  render();
});

async function finishWorkout() {
  if (state.workoutSaveStatus === "saving") return;
  const active = state.active;
  if (!active) return;
  const completed = active.exercises.flatMap(ex=>ex.sets).filter(s=>s.done || (s.weight && s.reps));
  if (!completed.length) { showToast("Log at least one set before finishing"); return; }
  const exercises = active.exercises.map(ex => ({id:ex.id, name:ex.name, phase:ex.phase, notes:ex.notes, sets:ex.sets.filter(s=>s.weight||s.reps).map(s=>({id:s.id,weight:fromUnit(Number(s.weight)||0),reps:Number(s.reps)||0,done:s.done}))})).filter(ex=>ex.sets.length);
  const volume = exercises.reduce((sum,ex)=>sum+ex.sets.reduce((s,set)=>s+set.weight*set.reps,0),0);
  const duration = Math.max(1, Math.round((Date.now()-active.startedAt)/60000));
  state.workoutSaveStatus = "saving";
  render();
  try {
    if (isSupabaseConfigured) {
      await flushActiveWorkout(active);
      await finishRemoteWorkout(active.id, duration, volume);
    }
  }
  catch(error) {
    state.workoutSaveStatus = "error";
    render();
    showToast(error.message || "Workout could not sync. Please try again.");
    return;
  }
  state.history.push({id:active.id,workout:active.workout,date:new Date().toISOString(),duration,volume,bodyWeight:active.bodyWeight,muscles:WORKOUTS[active.workout].muscles,exercises});
  state.active=null; state.workoutSaveStatus="idle"; state.view="logbook"; persist(); render(); showToast(isSupabaseConfigured ? "Workout saved and synced" : "Workout saved");
}
function exportData() {
  const blob = new Blob([JSON.stringify({exportedAt:new Date().toISOString(),settings:state.settings,history:state.history},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download="train-logbook-backup.json"; a.click(); URL.revokeObjectURL(url); showToast("Data exported");
}

bootstrap();
