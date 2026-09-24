export type SetStatus = "completed" | "planned" | "skipped";

export type SetPlanInput = {
  isPlanned: boolean;
  position: number;
  reps: number | null;
  status: SetStatus;
};

export type SetSlot = SetPlanInput & {
  synthetic: boolean;
};

export type SetPlanProjection = {
  completedTotal: number;
  extra: {
    completed: number;
    open: number;
    total: number;
  };
  extraSlots: SetSlot[];
  planned: {
    completed: number;
    open: number;
    skipped: number;
    total: number;
  };
  plannedSlots: SetSlot[];
};

export function canAddExtraSet(
  sets: Array<Pick<SetPlanInput, "isPlanned" | "status">>,
) {
  return !sets.some((set) => !set.isPlanned && set.status === "planned");
}

/**
 * Builds the one canonical view of today's set plan.
 *
 * Template-backed slots never disappear. A legacy missing row is projected as
 * skipped so the intended target remains visible instead of silently shrinking.
 * User-added sets live outside the plan and are reported as extras.
 */
export function projectSetPlan(
  sets: SetPlanInput[],
  targetSets: number,
): SetPlanProjection {
  const plannedTotal = Math.max(0, targetSets);
  const plannedByPosition = new Map(
    sets.filter((set) => set.isPlanned).map((set) => [set.position, set]),
  );
  const unusedPlanned = sets
    .filter((set) => set.isPlanned && set.position >= plannedTotal)
    .sort((left, right) => left.position - right.position);

  const plannedSlots = Array.from({ length: plannedTotal }, (_, position) => {
    const stored = plannedByPosition.get(position) ?? unusedPlanned.shift();
    return stored
      ? { ...stored, synthetic: false }
      : {
          isPlanned: true,
          position,
          reps: null,
          status: "skipped" as const,
          synthetic: true,
        };
  });
  const extraSlots = sets
    .filter((set) => !set.isPlanned && set.status !== "skipped")
    .sort((left, right) => left.position - right.position)
    .map((set) => ({ ...set, synthetic: false }));

  const planned = {
    completed: countStatus(plannedSlots, "completed"),
    open: countStatus(plannedSlots, "planned"),
    skipped: countStatus(plannedSlots, "skipped"),
    total: plannedTotal,
  };
  const extra = {
    completed: countStatus(extraSlots, "completed"),
    open: countStatus(extraSlots, "planned"),
    total: extraSlots.length,
  };

  return {
    completedTotal: planned.completed + extra.completed,
    extra,
    extraSlots,
    planned,
    plannedSlots,
  };
}

export function planTokens(plan: SetPlanProjection) {
  return plan.plannedSlots.map((slot) => {
    if (slot.status === "skipped") return "×";
    if (slot.status === "planned") return "—";
    return slot.reps === null ? "✓" : String(slot.reps);
  });
}

export function planOutcomeLabel(plan: SetPlanProjection) {
  const parts = [
    plan.planned.total > 0
      ? `${plan.planned.completed}/${plan.planned.total} done`
      : "Open plan",
  ];
  if (plan.planned.skipped > 0) {
    parts.push(`${plan.planned.skipped} skipped`);
  }
  if (plan.planned.open > 0) {
    parts.push(`${plan.planned.open} open`);
  }
  if (plan.extra.completed > 0) {
    parts.push(`+${plan.extra.completed} extra`);
  }
  if (plan.extra.open > 0) {
    parts.push(`${plan.extra.open} extra open`);
  }
  return parts.join(" · ");
}

export function removalActionLabel({ isPlanned }: { isPlanned: boolean }) {
  return isPlanned ? "Skip planned set" : "Remove extra set";
}

function countStatus(slots: SetSlot[], status: SetStatus) {
  return slots.filter((slot) => slot.status === status).length;
}
