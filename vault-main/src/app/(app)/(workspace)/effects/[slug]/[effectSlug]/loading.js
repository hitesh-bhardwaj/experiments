import { RouteLoading } from "@/components/ui/RouteLoading";

// The dot grid, with scrolling locked while it shows (see RouteLoading).
export default function EffectSubDetailLoading() {
  return <RouteLoading className="absolute inset-x-0 top-0 flex h-screen items-center justify-center" />;
}
