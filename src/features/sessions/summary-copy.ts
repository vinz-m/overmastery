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
      headline: "Baseline recorded. Now you have something to beat.",
      label: `${baselines === 1 ? "exercise baseline" : "exercise baselines"} recorded`,
      metric: baselines,
    };
  }

  return {
    headline: "Session recorded. Keep building.",
    label: "exercises improved since last time",
    metric: 0,
  };
}
