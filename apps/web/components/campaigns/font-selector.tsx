"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface GoogleFont {
  family: string;
  variants: string[];
  category: string;
}

interface FontSelectorProps {
  value?: string;
  onChange: (font: string) => void;
}

const EMAIL_SAFE_FONTS = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Courier New",
] as const;

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
  "Times New Roman",
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
  const [open, setOpen] = useState(false);
  const emailSafeFonts = EMAIL_SAFE_FONTS.map((family) => ({
    family,
    variants: ["400", "600", "700"],
    category: "system",
  }));
  const allFonts = [
    ...emailSafeFonts,
    ...fonts.filter(
      (font) =>
        !EMAIL_SAFE_FONTS.includes(
          font.family as (typeof EMAIL_SAFE_FONTS)[number]
        )
    ),
  ];

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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={loading}
            style={{
              fontFamily: value ? `'${value}', sans-serif` : "inherit",
            }}
          >
            {value
              ? allFonts.find((font) => font.family === value)?.family || value
              : loading
                ? "Loading..."
                : "Select font"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search font..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>No font found.</CommandEmpty>
              <CommandGroup>
                {allFonts.map((font) => (
                  <CommandItem
                    key={font.family}
                    value={font.family}
                    onSelect={() => {
                      onChange(font.family);
                      setOpen(false);
                    }}
                    style={{
                      fontFamily:
                        font.category === "system" || fontsLoaded
                          ? `'${font.family}', sans-serif`
                          : "inherit",
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === font.family ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {font.family}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
