/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Assign a contact to a touch-point program.
 * Creates the contact_programs record and generates the first task from position 1.
 */
export async function assignProgram(contactId: string, programId: string) {
  const supabase = createAdminClient();

  // Check if already assigned and active
  const { data: existing } = await supabase
    .from("contact_programs")
    .select("id, is_active")
    .eq("contact_id", contactId)
    .eq("program_id", programId)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) {
    return { error: "Contact is already assigned to this program" };
  }

  // Create the contact_programs record
  const { data: assignment, error: assignError } = await supabase
    .from("contact_programs")
    .insert({
      contact_id: contactId,
      program_id: programId,
      current_step_position: 1,
      is_active: true,
    })
    .select()
    .single();

  if (assignError) {
    return { error: assignError.message };
  }

  // Look up the first step (position = 1)
  const { data: firstStep, error: stepError } = await supabase
    .from("program_steps")
    .select("*")
    .eq("program_id", programId)
    .eq("position", 1)
    .single();

  if (stepError || !firstStep) {
    return { error: "Program has no steps defined" };
  }

  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (firstStep.delay_days || 0));

  // Create the first task
  const { data: task, error: taskError } = await supabase
    .from("touch_point_tasks")
    .insert({
      contact_program_id: assignment.id,
      program_step_id: firstStep.id,
      contact_id: contactId,
      activity_type: firstStep.activity_type,
      label: firstStep.label,
      due_date: dueDate.toISOString().split("T")[0],
      status: "pending",
    })
    .select()
    .single();

  if (taskError) {
    return { error: taskError.message };
  }

  return { assignment, task };
}

/**
 * Complete a touch-point task.
 * Updates the task, creates an activity record, then generates the next task.
 */
export async function completeTask(taskId: string, notes?: string) {
  const supabase = createAdminClient();

  // Fetch the task
  const { data: task, error: fetchError } = await supabase
    .from("touch_point_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (fetchError || !task) {
    return { error: "Task not found" };
  }

  if (task.status !== "pending") {
    return { error: "Task is not pending" };
  }

  // Create an activity record
  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .insert({
      type: task.activity_type,
      contact_id: task.contact_id,
      notes: notes || null,
      activity_date: new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (activityError) {
    return { error: activityError.message };
  }

  // Update task to completed
  const { error: updateError } = await supabase
    .from("touch_point_tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      notes: notes || null,
      activity_id: activity.id,
    })
    .eq("id", taskId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Generate the next task
  const result = await generateNextTask(task.contact_program_id);

  return { ok: true, activity, nextTask: result.task || null };
}

/**
 * Skip a touch-point task.
 * Updates the task status and generates the next task.
 */
export async function skipTask(taskId: string, notes?: string) {
  const supabase = createAdminClient();

  // Fetch the task
  const { data: task, error: fetchError } = await supabase
    .from("touch_point_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (fetchError || !task) {
    return { error: "Task not found" };
  }

  if (task.status !== "pending") {
    return { error: "Task is not pending" };
  }

  // Update task to skipped
  const { error: updateError } = await supabase
    .from("touch_point_tasks")
    .update({
      status: "skipped",
      skipped_at: new Date().toISOString(),
      notes: notes || null,
    })
    .eq("id", taskId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Generate the next task
  const result = await generateNextTask(task.contact_program_id);

  return { ok: true, nextTask: result.task || null };
}

/**
 * Generate the next task for a contact_program assignment.
 * If the program is cycling and no more steps exist, wraps back to position 1.
 * If the program is not cycling and no more steps, deactivates the assignment.
 */
export async function generateNextTask(contactProgramId: string) {
  const supabase = createAdminClient();

  // Fetch the contact_programs record with program info
  const { data: cp, error: cpError } = await supabase
    .from("contact_programs")
    .select("*, programs(*)")
    .eq("id", contactProgramId)
    .single();

  if (cpError || !cp) {
    return { error: "Contact program assignment not found" };
  }

  const program = cp.programs as any;
  const currentPosition = cp.current_step_position as number;

  // Fetch all steps for this program ordered by position
  const { data: steps, error: stepsError } = await supabase
    .from("program_steps")
    .select("*")
    .eq("program_id", cp.program_id)
    .order("position", { ascending: true });

  if (stepsError || !steps || steps.length === 0) {
    return { error: "No steps found for program" };
  }

  // Find the next step
  const nextStep = steps.find((s: any) => s.position === currentPosition + 1);

  if (nextStep) {
    // Create the next task
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (nextStep.delay_days || 0));

    const { data: task, error: taskError } = await supabase
      .from("touch_point_tasks")
      .insert({
        contact_program_id: contactProgramId,
        program_step_id: nextStep.id,
        contact_id: cp.contact_id,
        activity_type: nextStep.activity_type,
        label: nextStep.label,
        due_date: dueDate.toISOString().split("T")[0],
        status: "pending",
      })
      .select()
      .single();

    if (taskError) {
      return { error: taskError.message };
    }

    // Update current step position
    await supabase
      .from("contact_programs")
      .update({ current_step_position: nextStep.position })
      .eq("id", contactProgramId);

    return { task };
  }

  // No next step found
  if (program.is_cycling) {
    // Wrap back to position 1
    const firstStep = steps.find((s: any) => s.position === 1);

    if (!firstStep) {
      return { error: "No step at position 1 to cycle back to" };
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (firstStep.delay_days || 0));

    const { data: task, error: taskError } = await supabase
      .from("touch_point_tasks")
      .insert({
        contact_program_id: contactProgramId,
        program_step_id: firstStep.id,
        contact_id: cp.contact_id,
        activity_type: firstStep.activity_type,
        label: firstStep.label,
        due_date: dueDate.toISOString().split("T")[0],
        status: "pending",
      })
      .select()
      .single();

    if (taskError) {
      return { error: taskError.message };
    }

    // Reset current step position to 1
    await supabase
      .from("contact_programs")
      .update({ current_step_position: 1 })
      .eq("id", contactProgramId);

    return { task };
  }

  // Program is not cycling — deactivate the assignment
  await supabase
    .from("contact_programs")
    .update({ is_active: false })
    .eq("id", contactProgramId);

  return { completed: true };
}
