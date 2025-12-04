"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    workspaceName: "",
    workspaceSlug: "",
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({
      workspaceName: name,
      workspaceSlug: generateSlug(name),
    });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      workspaceSlug: generateSlug(e.target.value),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.workspaceName,
          slug: formData.workspaceSlug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la création");
      }

      // Succès - rediriger vers le dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? "w-8 bg-white" : s < step ? "w-2 bg-white" : "w-2 bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="text-6xl mb-4">👋</div>
            <h1 className="text-3xl font-bold">Bienvenue sur ReachDem</h1>
            <p className="text-zinc-400 text-lg">
              Engagez votre communauté politique comme jamais auparavant.
            </p>
            <div className="space-y-3 text-left bg-zinc-900 rounded-xl p-6 mt-8">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <span className="text-zinc-300">Gérez vos contacts et supporters</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📧</span>
                <span className="text-zinc-300">Envoyez des campagnes ciblées</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📱</span>
                <span className="text-zinc-300">Communiquez via WhatsApp, SMS, Email</span>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-zinc-200 transition-colors mt-6"
            >
              Commencer →
            </button>
          </div>
        )}

        {/* Step 2: Create Workspace */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="text-5xl mb-4">🏢</div>
              <h1 className="text-2xl font-bold">Créez votre espace de travail</h1>
              <p className="text-zinc-400 mt-2">
                Un workspace regroupe vos contacts et campagnes.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-8">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Nom de l'espace
                </label>
                <input
                  type="text"
                  value={formData.workspaceName}
                  onChange={handleNameChange}
                  placeholder="Ex: Campagne Électorale 2025"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                  required
                  minLength={2}
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  URL de l'espace
                </label>
                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden focus-within:border-zinc-600 transition-colors">
                  <span className="text-zinc-500 pl-4 text-sm">reachdem.com/</span>
                  <input
                    type="text"
                    value={formData.workspaceSlug}
                    onChange={handleSlugChange}
                    placeholder="mon-espace"
                    className="flex-1 bg-transparent px-2 py-3 text-white placeholder:text-zinc-600 focus:outline-none"
                    required
                    minLength={2}
                    pattern="[a-z0-9-]+"
                  />
                </div>
                <p className="text-xs text-zinc-600 mt-1">
                  Lettres minuscules, chiffres et tirets uniquement
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-zinc-800 text-white font-semibold py-3 px-6 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  ← Retour
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !formData.workspaceName || !formData.workspaceSlug}
                  className="flex-1 bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Création..." : "Créer →"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3 would be success/redirect - handled by router.push */}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
