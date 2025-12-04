"use client";

import { useState } from "react";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface Endpoint {
  method: HttpMethod;
  path: string;
  description: string;
  auth: boolean;
  params?: { name: string; type: string; required: boolean; description: string }[];
  body?: { name: string; type: string; required: boolean; description: string }[];
  response: string;
}

const endpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/api/workspaces",
    description: "Récupère tous les workspaces où l'utilisateur est membre",
    auth: true,
    response: `{
  "workspaces": [
    {
      "id": "uuid",
      "name": "Mon Workspace",
      "slug": "mon-workspace",
      "ownerId": "user-uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "_count": { "members": 1, "contacts": 0 }
    }
  ]
}`,
  },
  {
    method: "POST",
    path: "/api/workspaces",
    description: "Crée un nouveau workspace (max 3 par utilisateur)",
    auth: true,
    body: [
      { name: "name", type: "string", required: true, description: "Nom du workspace (min 2 caractères)" },
      { name: "slug", type: "string", required: true, description: "Slug URL (lowercase, chiffres, tirets uniquement)" },
    ],
    response: `{
  "workspace": {
    "id": "uuid",
    "name": "Mon Workspace",
    "slug": "mon-workspace",
    "ownerId": "user-uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}`,
  },
  {
    method: "GET",
    path: "/api/workspaces/[workspaceId]/contacts",
    description: "Récupère les contacts d'un workspace (max 100)",
    auth: true,
    params: [
      { name: "workspaceId", type: "string", required: true, description: "ID du workspace" },
      { name: "q", type: "string", required: false, description: "Recherche par email, téléphone ou nom" },
    ],
    response: `{
  "contacts": [
    {
      "id": "uuid",
      "workspaceId": "workspace-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "whatsapp": null,
      "attributes": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}`,
  },
  {
    method: "POST",
    path: "/api/workspaces/[workspaceId]/contacts",
    description: "Crée un nouveau contact dans un workspace",
    auth: true,
    params: [
      { name: "workspaceId", type: "string", required: true, description: "ID du workspace" },
    ],
    body: [
      { name: "firstName", type: "string", required: false, description: "Prénom" },
      { name: "lastName", type: "string", required: false, description: "Nom de famille" },
      { name: "email", type: "string", required: false, description: "Email (au moins un contact requis)" },
      { name: "phone", type: "string", required: false, description: "Téléphone (au moins un contact requis)" },
      { name: "whatsapp", type: "string", required: false, description: "WhatsApp (au moins un contact requis)" },
      { name: "attributes", type: "object", required: false, description: "Attributs personnalisés (JSON)" },
    ],
    response: `{
  "contact": {
    "id": "uuid",
    "workspaceId": "workspace-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": null,
    "whatsapp": null,
    "attributes": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}`,
  },
];

const methodColors: Record<HttpMethod, string> = {
  GET: "bg-green-500",
  POST: "bg-blue-500",
  PUT: "bg-yellow-500",
  DELETE: "bg-red-500",
};

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-4 p-4 hover:bg-zinc-900/50 transition-colors text-left"
      >
        <span className={`${methodColors[endpoint.method]} px-3 py-1 rounded text-xs font-bold text-white`}>
          {endpoint.method}
        </span>
        <code className="text-zinc-300 font-mono text-sm flex-1">{endpoint.path}</code>
        {endpoint.auth && (
          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">🔒 Auth</span>
        )}
        <svg
          className={`w-5 h-5 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-950 space-y-4">
          <p className="text-zinc-400">{endpoint.description}</p>

          {endpoint.params && endpoint.params.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-2">Paramètres</h4>
              <div className="space-y-2">
                {endpoint.params.map((param) => (
                  <div key={param.name} className="flex items-start gap-2 text-sm">
                    <code className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">{param.name}</code>
                    <span className="text-zinc-500">{param.type}</span>
                    {param.required && <span className="text-red-400 text-xs">requis</span>}
                    <span className="text-zinc-500">— {param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.body && endpoint.body.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-2">Corps de la requête (JSON)</h4>
              <div className="space-y-2">
                {endpoint.body.map((field) => (
                  <div key={field.name} className="flex items-start gap-2 text-sm">
                    <code className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">{field.name}</code>
                    <span className="text-zinc-500">{field.type}</span>
                    {field.required && <span className="text-red-400 text-xs">requis</span>}
                    <span className="text-zinc-500">— {field.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-2">Réponse</h4>
            <pre className="bg-zinc-900 border border-zinc-800 rounded p-3 overflow-x-auto text-xs text-zinc-300">
              {endpoint.response}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📡 API Documentation</h1>
          <p className="text-zinc-400">
            Documentation des endpoints API disponibles pour ReachDem.
          </p>
        </div>

        {/* Auth Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold mb-2">🔐 Authentification</h2>
          <p className="text-zinc-400 text-sm mb-3">
            Toutes les routes marquées avec 🔒 nécessitent une session active via Better-Auth.
            Le cookie de session est automatiquement envoyé par le navigateur.
          </p>
          <div className="text-sm text-zinc-500">
            <p>• Connectez-vous via <code className="bg-zinc-800 px-1 rounded">/login</code></p>
            <p>• Ou créez un compte via <code className="bg-zinc-800 px-1 rounded">/signup</code></p>
          </div>
        </div>

        {/* Business Rules */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold mb-2">📋 Règles métier</h2>
          <div className="text-sm text-zinc-400 space-y-2">
            <div>
              <h3 className="text-zinc-300 font-medium">Workspaces</h3>
              <ul className="list-disc list-inside ml-2 text-zinc-500">
                <li>Un utilisateur peut posséder max 3 workspaces</li>
                <li>Un utilisateur peut appartenir à plusieurs workspaces</li>
                <li>Le créateur devient automatiquement OWNER</li>
              </ul>
            </div>
            <div>
              <h3 className="text-zinc-300 font-medium">Contacts</h3>
              <ul className="list-disc list-inside ml-2 text-zinc-500">
                <li>Les contacts sont liés à un workspace spécifique</li>
                <li>Au moins un moyen de contact requis (email, phone, ou whatsapp)</li>
                <li>Seuls les membres du workspace peuvent gérer les contacts</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold mb-4">🛠️ Endpoints</h2>
          
          <h3 className="text-lg text-zinc-400 mt-6 mb-3">Workspaces</h3>
          {endpoints.filter(e => !e.path.includes("contacts")).map((endpoint, i) => (
            <EndpointCard key={i} endpoint={endpoint} />
          ))}

          <h3 className="text-lg text-zinc-400 mt-6 mb-3">Contacts</h3>
          {endpoints.filter(e => e.path.includes("contacts")).map((endpoint, i) => (
            <EndpointCard key={i} endpoint={endpoint} />
          ))}
        </div>

        {/* Error Codes */}
        <div className="mt-12 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">⚠️ Codes d'erreur</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-mono">400</span>
              <span className="text-zinc-400">Validation échouée / Limite atteinte</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono">401</span>
              <span className="text-zinc-400">Non authentifié</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-mono">403</span>
              <span className="text-zinc-400">Accès interdit au workspace</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-zinc-500/20 text-zinc-400 px-2 py-0.5 rounded font-mono">500</span>
              <span className="text-zinc-400">Erreur serveur</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-zinc-600 text-sm">
          ReachDem API v1.0 • {new Date().toLocaleDateString("fr-FR")}
        </div>
      </div>
    </div>
  );
}
