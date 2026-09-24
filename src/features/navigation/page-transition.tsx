import { ViewTransition, type ReactNode } from "react";

// Tag a <Link> with one of these so the page knows how to animate:
// forward = going deeper (slides left), back = returning (slides right),
// tab = switching between primary tabs (crossfade). Untagged navigations,
// including the browser back gesture and server-action redirects, don't animate.
export const navForward = ["nav-forward"];
export const navBack = ["nav-back"];
export const navTab = ["nav-tab"];

const exitByType = {
  "nav-back": "nav-back",
  "nav-forward": "nav-forward",
  "nav-tab": "nav-tab",
  default: "none",
};
// Pages usually arrive after the loading skeleton, in a separate untyped
// transition (the Suspense reveal), so untyped entries fade in.
const enterByType = { ...exitByType, default: "page-reveal" };

/** Wrap each page's content (not the layout: layouts persist, so they never enter or exit). */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition default="none" enter={enterByType} exit={exitByType}>
      {children}
    </ViewTransition>
  );
}

/** Wrap a route's loading skeleton so it fades out as the real page arrives. */
export function LoadingTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition default="none" exit="page-reveal-out">
      {children}
    </ViewTransition>
  );
}
