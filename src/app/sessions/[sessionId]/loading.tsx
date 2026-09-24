import { DetailSkeleton } from "@/features/navigation/app-tab-skeleton";
import { LoadingTransition } from "@/features/navigation/page-transition";

export default function Loading() {
  return <LoadingTransition><DetailSkeleton /></LoadingTransition>;
}
