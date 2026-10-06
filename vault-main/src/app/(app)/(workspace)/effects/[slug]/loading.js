import { GridDots } from "@/components/grid-dots";

export default function EffectDetailLoading() {
  return (
    <div className="absolute inset-x-0 top-0 flex h-screen items-center justify-center">
      <GridDots size={56} squareSize={8} className="text-primary" />
    </div>
  );
}
