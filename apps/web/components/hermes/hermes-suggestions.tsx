"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HermesSuggestion {
  label: string;
  message: string;
}

const DEFAULT_SUGGESTIONS: HermesSuggestion[] = [
  { label: "📋 Mes groupes", message: "Liste tous mes groupes de contacts." },
  { label: "📣 Mes campagnes", message: "Montre mes campagnes récentes." },
  {
    label: "✉️ Composer un email",
    message: "Aide-moi à composer un email de prospection.",
  },
  {
    label: "🔍 Rechercher un contact",
    message: "Je veux chercher un contact.",
  },
];

interface HermesSuggestionsProps {
  suggestions?: HermesSuggestion[];
  onSelect: (message: string) => void;
  className?: string;
}

export function HermesSuggestions({
  suggestions = DEFAULT_SUGGESTIONS,
  onSelect,
  className,
}: HermesSuggestionsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-muted-foreground px-4 text-center text-xs">
        Commencez par une action ou posez une question à Hermès.
      </p>
      <div className="flex flex-wrap justify-center gap-1.5 px-2">
        {suggestions.map((s) => (
          <Button
            key={s.label}
            variant="outline"
            size="sm"
            className="h-7 rounded-full text-xs"
            onClick={() => onSelect(s.message)}
          >
            {s.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
