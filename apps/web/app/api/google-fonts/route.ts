import { NextResponse } from "next/server";

// Cache fonts for 24 hours
let cachedFonts: any = null;
let cacheTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

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

export async function GET() {
  try {
    // Check cache
    const now = Date.now();
    if (cachedFonts && now - cacheTime < CACHE_DURATION) {
      return NextResponse.json({ fonts: cachedFonts });
    }

    const apiKey = process.env.GOOGLE_FONTS_API_KEY;

    if (!apiKey) {
      // Return popular fonts as fallback
      const fallbackFonts = POPULAR_FONTS.map((family) => ({
        family,
        variants: ["400", "600", "700"],
        category: "sans-serif",
      }));

      return NextResponse.json({ fonts: fallbackFonts });
    }

    // Fetch from Google Fonts API
    const response = await fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch from Google Fonts API");
    }

    const data = await response.json();

    // Filter and format fonts
    const fonts = data.items
      .filter((font: any) => {
        // Prioritize popular fonts and sans-serif/serif fonts
        return (
          POPULAR_FONTS.includes(font.family) ||
          font.category === "sans-serif" ||
          font.category === "serif"
        );
      })
      .slice(0, 100) // Limit to 100 fonts
      .map((font: any) => ({
        family: font.family,
        variants: font.variants,
        category: font.category,
      }));

    // Sort to put popular fonts first
    fonts.sort((a: any, b: any) => {
      const aIndex = POPULAR_FONTS.indexOf(a.family);
      const bIndex = POPULAR_FONTS.indexOf(b.family);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });

    // Update cache
    cachedFonts = fonts;
    cacheTime = now;

    return NextResponse.json({ fonts });
  } catch (error) {
    console.error("Error fetching Google Fonts:", error);

    // Return popular fonts as fallback
    const fallbackFonts = POPULAR_FONTS.map((family) => ({
      family,
      variants: ["400", "600", "700"],
      category: "sans-serif",
    }));

    return NextResponse.json({ fonts: fallbackFonts });
  }
}
