"use client";

import { useEffect, useRef } from "react";
import "swagger-ui-dist/swagger-ui.css";

export default function ApiDocs() {
  const swaggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // dynamically load swagger-ui-dist bundle to run completely client-side
    import("swagger-ui-dist/swagger-ui-bundle").then((swaggerUI) => {
      const SwaggerUIBundle = swaggerUI.default || (swaggerUI as any);
      SwaggerUIBundle({
        url: "/openapi.yaml",
        domNode: swaggerRef.current,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset,
        ],
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl py-8">
        <div ref={swaggerRef} />
      </div>
    </div>
  );
}
