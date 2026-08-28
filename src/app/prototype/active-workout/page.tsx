import { Suspense } from "react";
import { ActiveWorkoutPrototype } from "./prototype";

export default function ActiveWorkoutPrototypePage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[#c7cecb]" />}>
      <ActiveWorkoutPrototype />
    </Suspense>
  );
}
