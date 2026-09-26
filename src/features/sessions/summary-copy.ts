export function sessionSummaryLead({
  baselines,
  improved,
}: {
  baselines: number;
  improved: number;
}) {
  if (improved > 0) {
    return {
      headline: "The work showed up in the numbers.",
      label: `${improved === 1 ? "exercise" : "exercises"} improved since last time`,
      metric: improved,
    };
  }

  if (baselines > 0) {
    return {
      headline: "Now you have a number to beat next time.",
      label: `${baselines === 1 ? "exercise" : "exercises"} logged for the first time`,
      metric: baselines,
    };
  }

  return {
    headline: "Workout saved. Keep building.",
    label: "exercises improved since last time",
    metric: 0,
  };
}
