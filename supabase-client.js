const config = window.TRAIN_CONFIG || {};
export const isSupabaseConfigured = Boolean(
  config.supabaseUrl &&
  config.supabasePublishableKey &&
  !config.supabaseUrl.includes("YOUR_PROJECT")
);

export const supabase = isSupabaseConfigured
  ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

function fail(error) {
  if (error) throw error;
}

export async function getAuthSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  fail(error);
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  fail(error);
  return data;
}

export async function signUp(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  fail(error);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  fail(error);
}

export async function loadProfile(user) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  fail(error);
  if (data) return data;
  const fallback = {
    id: user.id,
    display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Athlete",
    preferred_units: "kg",
    reminders_enabled: true,
  };
  const { data: created, error: createError } = await supabase.from("profiles").upsert(fallback).select().single();
  fail(createError);
  return created;
}

export async function saveProfile(userId, settings) {
  const row = {
    id: userId,
    display_name: settings.name,
    body_weight_kg: settings.bodyWeight || null,
    preferred_units: settings.units,
    reminders_enabled: settings.reminders,
  };
  const { error } = await supabase.from("profiles").upsert(row);
  fail(error);
}

const programSelect = `
  id, name, is_active,
  program_days (
    id, day_key, position, title, focus, duration_label,
    program_exercises (
      id, position, phase, exercise_name, target_sets, target_reps, rest_interval, cue
    )
  )
`;

export async function loadUserProgram(userId) {
  let { data, error } = await supabase
    .from("workout_programs")
    .select(programSelect)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  fail(error);
  if (!data) {
    const { error: seedError } = await supabase.rpc("seed_default_program", { target_user: userId });
    fail(seedError);
    const result = await supabase.from("workout_programs").select(programSelect).eq("user_id", userId).eq("is_active", true).maybeSingle();
    fail(result.error);
    data = result.data;
  }
  return data || null;
}

export async function addProgramExercise(dayId, userId, exercise, position) {
  const { data, error } = await supabase.from("program_exercises").insert({
    program_day_id: dayId,
    user_id: userId,
    position,
    phase: exercise.phase,
    exercise_name: exercise.name,
    target_sets: exercise.targetSets,
    target_reps: exercise.targetReps,
    rest_interval: exercise.rest,
    cue: exercise.cue || "",
  }).select().single();
  fail(error);
  return data;
}

export async function updateProgramExercise(exerciseId, exercise) {
  const { data, error } = await supabase.from("program_exercises").update({
    phase: exercise.phase,
    exercise_name: exercise.name,
    target_sets: exercise.targetSets,
    target_reps: exercise.targetReps,
    rest_interval: exercise.rest,
    cue: exercise.cue || "",
  }).eq("id", exerciseId).select().single();
  fail(error);
  return data;
}

export async function deleteProgramExercise(exerciseId) {
  const { error } = await supabase.from("program_exercises").delete().eq("id", exerciseId);
  fail(error);
}

const sessionSelect = `
  id, workout_key, status, started_at, completed_at, duration_minutes,
  body_weight_kg, total_volume_kg,
  exercise_logs (
    id, position, phase, exercise_name, target_sets, target_reps,
    rest_interval, cue, notes,
    set_logs ( id, set_number, weight_kg, reps, completed )
  )
`;

export async function loadWorkoutData(userId) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(sessionSelect)
    .eq("user_id", userId)
    .order("started_at", { ascending: false });
  fail(error);
  return data || [];
}

export async function createRemoteWorkout(active, userId) {
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      id: active.id,
      user_id: userId,
      workout_key: active.workout,
      started_at: new Date(active.startedAt).toISOString(),
      body_weight_kg: active.bodyWeight || null,
      status: "active",
    })
    .select("id")
    .single();
  fail(sessionError);

  const exerciseRows = active.exercises.map((exercise, position) => ({
    id: exercise.id,
    session_id: session.id,
    user_id: userId,
    position,
    phase: exercise.phase,
    exercise_name: exercise.name,
    target_sets: exercise.targetSets,
    target_reps: exercise.targetReps,
    rest_interval: exercise.rest,
    cue: exercise.cue,
    notes: exercise.notes,
  }));
  const { error: exerciseError } = await supabase.from("exercise_logs").insert(exerciseRows);
  fail(exerciseError);

  const setRows = active.exercises.flatMap(exercise => exercise.sets.map((set, index) => ({
    id: set.id,
    exercise_log_id: exercise.id,
    user_id: userId,
    set_number: index + 1,
    weight_kg: null,
    reps: null,
    completed: false,
  })));
  const { error: setsError } = await supabase.from("set_logs").insert(setRows);
  fail(setsError);
}

export async function updateRemoteSet(setId, patch) {
  const { error } = await supabase.from("set_logs").update(patch).eq("id", setId);
  fail(error);
}

export async function insertRemoteSet(exerciseId, userId, set) {
  const { error } = await supabase.from("set_logs").insert({
    id: set.id,
    exercise_log_id: exerciseId,
    user_id: userId,
    set_number: set.setNumber,
    weight_kg: null,
    reps: null,
    completed: false,
  });
  fail(error);
}

export async function insertRemoteExercise(sessionId, userId, exercise, position) {
  const { error } = await supabase.from("exercise_logs").insert({
    id: exercise.id,
    session_id: sessionId,
    user_id: userId,
    position,
    phase: exercise.phase,
    exercise_name: exercise.name,
    target_sets: exercise.targetSets,
    target_reps: exercise.targetReps,
    rest_interval: exercise.rest,
    cue: exercise.cue || "",
    notes: exercise.notes || "",
  });
  fail(error);
  const rows = exercise.sets.map((set, index) => ({
    id: set.id,
    exercise_log_id: exercise.id,
    user_id: userId,
    set_number: index + 1,
    weight_kg: null,
    reps: null,
    completed: false,
  }));
  const { error: setsError } = await supabase.from("set_logs").insert(rows);
  fail(setsError);
}

export async function deleteRemoteExercise(exerciseId) {
  const { error } = await supabase.from("exercise_logs").delete().eq("id", exerciseId);
  fail(error);
}

export async function updateRemoteExercise(exerciseId, notes) {
  const { error } = await supabase.from("exercise_logs").update({ notes }).eq("id", exerciseId);
  fail(error);
}

export async function updateRemoteExerciseDetails(exerciseId, exercise) {
  const { error } = await supabase.from("exercise_logs").update({
    phase: exercise.phase,
    exercise_name: exercise.name,
    target_sets: exercise.targetSets,
    target_reps: exercise.targetReps,
    rest_interval: exercise.rest,
    cue: exercise.cue || "",
  }).eq("id", exerciseId);
  fail(error);
}

export async function deleteRemoteSet(setId) {
  const { error } = await supabase.from("set_logs").delete().eq("id", setId);
  fail(error);
}

export async function finishRemoteWorkout(sessionId, duration, volume) {
  const { error } = await supabase.from("workout_sessions").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    duration_minutes: duration,
    total_volume_kg: volume,
  }).eq("id", sessionId);
  fail(error);
}

export async function updateWorkoutSessionDetails(sessionId, duration, volume) {
  const { error } = await supabase.from("workout_sessions").update({
    duration_minutes: duration,
    total_volume_kg: volume,
  }).eq("id", sessionId);
  fail(error);
}

export async function cancelRemoteWorkout(sessionId) {
  const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);
  fail(error);
}

export async function loadFoodLogs(userId) {
  const { data, error } = await supabase
    .from("food_logs")
    .select("id, eaten_on, name, calories, protein_g, carbs_g, fat_g")
    .eq("user_id", userId)
    .order("eaten_on", { ascending: true })
    .order("created_at", { ascending: true });
  fail(error);
  return data || [];
}

export async function insertFoodLog(userId, entry) {
  const { error } = await supabase.from("food_logs").insert({
    id: entry.id,
    user_id: userId,
    eaten_on: entry.date,
    name: entry.name,
    calories: entry.calories,
    protein_g: entry.protein,
    carbs_g: entry.carbs,
    fat_g: entry.fat,
  });
  fail(error);
}

export async function deleteFoodLog(entryId) {
  const { error } = await supabase.from("food_logs").delete().eq("id", entryId);
  fail(error);
}

export async function deleteWorkoutSession(sessionId, userId) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("id");
  fail(error);
  if (!data?.length) throw new Error("Workout not found or you do not have permission to delete it.");
}
