import Link from "next/link";

import { RouteState } from "@/features/ui/route-state";

export default function NotFound() {
  return (
    <RouteState
      status="Page not found"
      title="Nothing lives at this address."
      description="The link may be old, or the workout it pointed to was removed."
      actions={<Link href="/">Return to Today</Link>}
    />
  );
}
