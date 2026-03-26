"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GoogleFont {
  family: string;
  variants: string[];
  category: string;
}

interface FontSelectorProps {
  value?: string;
  onChange: (font: string) => void;
}

const POPULAR_FONTS = [
  // Les Incontournables (Sans-Serif)
  "Inter",
  "Roboto",
  "Montserrat",
  "Open Sans",
  "Poppins",
  "Lato",
  "DM Sans",
  "Raleway",
  "Nunito",
  "Manrope",

  // Les Élégantes (Serif)
  "Playfair Display",
  "Lora",
  "Merriweather",
  "Libre Baskerville",
  "Cormorant",

  // Les Modernes et Alternatives
  "Space Grotesk",
  "Plus Jakarta Sans",
  "Bricolage Grotesque",
  "Syne",
  "Work Sans",

  // Autres populaires
  "Ubuntu",
  "PT Sans",
  "Noto Sans",
  "Oswald",
  "Source Sans Pro",
];

export function FontSelector({ value = "Inter", onChange }: FontSelectorProps) {
  const [fonts, setFonts] = useState<GoogleFont[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    fetchGoogleFonts();
  }, []);

  // Load Google Fonts dynamically
  useEffect(() => {
    if (fonts.length > 0 && !fontsLoaded) {
      loadGoogleFonts(fonts);
    }
  }, [fonts, fontsLoaded]);

  const fetchGoogleFonts = async () => {
    try {
      const response = await fetch("/api/google-fonts");
      const data = await response.json();
      setFonts(data.fonts || []);
    } catch (error) {
      console.error("Failed to fetch Google Fonts:", error);
      // Fallback to popular fonts
      setFonts(
        POPULAR_FONTS.map((family) => ({
          family,
          variants: ["400", "600", "700"],
          category: "sans-serif",
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleFonts = (fontsToLoad: GoogleFont[]) => {
    // Create a link element to load Google Fonts
    // Load up to 30 fonts to include all popular ones
    const fontFamilies = fontsToLoad
      .slice(0, 30)
      .map((font) => {
        const family = font.family.replace(/ /g, "+");
        return `family=${family}:wght@400;600;700`;
      })
      .join("&");

    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
    link.rel = "stylesheet";

    link.onload = () => {
      setFontsLoaded(true);
    };

    document.head.appendChild(link);
  };

  return (
    <div className="w-[200px]">
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Loading..." : "Select font"} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {fonts.map((font) => (
            <SelectItem
              key={font.family}
              value={font.family}
              style={{
                fontFamily: fontsLoaded
                  ? `'${font.family}', sans-serif`
                  : "inherit",
              }}
            >
              {font.family}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
