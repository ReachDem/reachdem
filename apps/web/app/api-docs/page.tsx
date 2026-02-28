"use client";

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import { useEffect } from 'react';

// Swagger UI is entirely client-side, dynamic import avoids Next.js hydration issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
    // Suppress legacy lifecycle warnings from swagger-ui-react inside React 19 StrictMode
    useEffect(() => {
        const originalError = console.error;
        console.error = (...args) => {
            if (typeof args[0] === 'string' && args[0].includes('UNSAFE_componentWillReceiveProps')) {
                return;
            }
            originalError.apply(console, args);
        };
        return () => {
            console.error = originalError;
        };
    }, []);

    return (
        <div className="bg-white min-h-screen">
            <div className="max-w-7xl mx-auto py-8">
                <SwaggerUI url="/openapi.yaml" />
            </div>
        </div>
    );
}
