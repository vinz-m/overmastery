import type { Metadata } from "next";

export const metadata: Metadata = { title: "Training session" };

export default function SessionsLayout({ children }: LayoutProps<"/sessions">) {
  return children;
}
