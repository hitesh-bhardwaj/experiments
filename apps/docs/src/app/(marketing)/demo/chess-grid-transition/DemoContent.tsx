"use client";

import type { ReactNode } from "react";
import ChessGridTransition from "@/components/chess-grid-transition/ChessGridTransition";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type { RegistryLike } from "@/components/remixer-panel/types";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function DemoContent({
  children,
  registry,
}: {
  children: ReactNode;
  registry: RegistryLike;
}) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values) => (
        <ChessGridTransition {...values}>
          <DemoHeader />
          {children}
        </ChessGridTransition>
      )}
      copyCodeOptions={{
        includeDemoHeader: false,
        propsVariableName: "chessGridTransitionProps",
      }}
    />
  );
}
