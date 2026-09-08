import type { Metadata } from "next";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressLayout({ children }: LayoutProps<"/progress">) {
  return children;
}
