import { GridDots } from "@/components/grid-dots";

export default function WorkspaceLoading() {
  return (
    <div className="sticky top-0 flex h-screen w-full items-center justify-center">
      <GridDots size={56} squareSize={8} className="text-primary" />
    </div>
  );
}
