"use client";

import Link from "next/link";
import { useEffect } from "react";

import { RouteState, routeStateStyles } from "@/features/ui/route-state";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <RouteState
      status="Couldn’t load this page"
      title="This page didn’t load."
      description="Something went wrong while loading your training data. Try again, or return to Today."
      actions={
        <>
          <button type="button" onClick={retry}>
            Try again
          </button>
          <Link href="/">Return to Today</Link>
        </>
      }
    >
      <p className={routeStateStyles.assurance} role="status">
        Your data wasn’t changed.
      </p>
    </RouteState>
  );
}
