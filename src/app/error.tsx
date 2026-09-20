"use client";

import Link from "next/link";
import { useEffect } from "react";

import {
  RouteState,
  routeStateStyles,
} from "@/features/ui/route-state";

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
      title="That set didn’t complete."
      description="The page stopped before your training data could load. Try it again, or return to Today and reopen what you need."
      actions={
        <>
          <button type="button" onClick={retry}>Try again</button>
          <Link href="/">Return to Today</Link>
        </>
      }
    >
      <p className={routeStateStyles.assurance} role="status">
        Nothing was changed by this failed load.
      </p>
    </RouteState>
  );
}
