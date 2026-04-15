import * as React from "react";
import { Shader6 } from "@/components/shader6";

export function VisualSplashBackground() {
  return (
    <div className="bg-muted relative hidden w-1/2 items-center justify-center overflow-hidden p-12 md:flex">
      <div className="absolute inset-0 z-0">
        <Shader6 />
      </div>
      <div className="from-primary/20 via-background/80 to-primary/5 absolute inset-0 z-[5] bg-gradient-to-br" />
    </div>
  );
}
