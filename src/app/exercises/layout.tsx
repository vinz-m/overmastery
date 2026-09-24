import type { Metadata } from "next";

export const metadata: Metadata = { title: "Exercise library" };

export default function ExercisesLayout({
  children,
}: LayoutProps<"/exercises">) {
  return children;
}
