"use client";

import { useId, useState } from "react";

import { Collapsible } from "@/features/ui/disclosure";

import styles from "./home.module.css";

export type WorkoutPreviewRow = { id: string; name: string; result: string };

// Enough to preview the session without turning the card into the full plan.
const previewLimit = 5;

/**
 * The suggested workout's exercises with the last result for each. Longer
 * plans expand in place rather than scrolling inside the card: a scroll area
 * nested in the page traps the thumb on a phone, and a plan is never long
 * enough to need one.
 */
export function WorkoutPreview({ rows }: { rows: WorkoutPreviewRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const restId = useId();
  const shown = rows.slice(0, previewLimit);
  const rest = rows.slice(previewLimit);

  return (
    <div className={styles.workoutPreview}>
      <ol aria-label="Exercises and your last result">
        {shown.map((row) => (
          <PreviewRow key={row.id} row={row} />
        ))}
      </ol>
      {rest.length > 0 && (
        <>
          <Collapsible id={restId} open={expanded}>
            <ol aria-label="More exercises">
              {rest.map((row) => (
                <PreviewRow key={row.id} row={row} />
              ))}
            </ol>
          </Collapsible>
          <button
            aria-controls={restId}
            aria-expanded={expanded}
            className={styles.previewToggle}
            onClick={() => setExpanded((open) => !open)}
            type="button"
          >
            {expanded ? "Show less" : `Show ${rest.length} more`}
          </button>
        </>
      )}
    </div>
  );
}

function PreviewRow({ row }: { row: WorkoutPreviewRow }) {
  return (
    <li>
      <span>{row.name}</span>
      <small>{row.result}</small>
    </li>
  );
}
