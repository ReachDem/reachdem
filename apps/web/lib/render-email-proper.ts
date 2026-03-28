import { Maily } from "@maily-to/render";
import type { JSONContent } from "@tiptap/core";

export interface RenderEmailOptions {
  content: JSONContent;
  previewText?: string;
  fontFamily?: string;
  fontWeights?: number[];
}

/**
 * Extracts all image URLs from email content
 */
function extractImageUrls(content: JSONContent): string[] {
  const images: string[] = [];

  function traverse(node: JSONContent) {
    if (node.type === "image" && node.attrs?.src) {
      images.push(node.attrs.src);
    }
    if (node.type === "logo" && node.attrs?.src) {
      images.push(node.attrs.src);
    }
    if (node.type === "inlineImage" && node.attrs?.src) {
      images.push(node.attrs.src);
    }
    if (node.content) {
      node.content.forEach(traverse);
    }
  }

  traverse(content);
  return [...new Set(images)];
}

/**
 * Generates preload links for images
 */
function generatePreloadLinks(imageUrls: string[]): string {
  return imageUrls
    .map((url) => `<link rel="preload" as="image" href="${url}" />`)
    .join("\n");
}

/**
 * Renders email content using Maily class directly
 */
export async function renderEmailProper({
  content,
  previewText = "",
  fontFamily = "Inter",
  fontWeights = [400, 600, 700],
}: RenderEmailOptions): Promise<string> {
  try {
    // Extract image URLs for preloading
    const imageUrls = extractImageUrls(content);

    // Create Maily instance
    const maily = new Maily(content);

    // Set preview text
    if (previewText) {
      maily.setPreviewText(previewText);
    }

    // Set theme with font
    maily.setTheme({
      font: {
        fontFamily: fontFamily,
        fallbackFontFamily: "sans-serif" as const,
      },
    });

    // Render to HTML
    const html = await maily.render({ pretty: false });

    // Inject preload links for images
    if (imageUrls.length > 0) {
      const preloadLinks = generatePreloadLinks(imageUrls);
      return html.replace(/<head>/, `<head>\n${preloadLinks}`);
    }

    return html;
  } catch (error) {
    console.error("Error rendering email with Maily:", error);
    throw error;
  }
}
