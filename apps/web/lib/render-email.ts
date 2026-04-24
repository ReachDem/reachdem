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
  return [...new Set(images)]; // Remove duplicates
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
 * Generates Google Fonts URL for given font family and weights
 */
export function getGoogleFontsUrl(
  fontFamily: string,
  weights: number[] = [400, 600, 700]
): string {
  const family = fontFamily.replace(/ /g, "+");
  const weightsStr = weights.join(";");

  return `https://fonts.googleapis.com/css2?family=${family}:wght@${weightsStr}&display=swap`;
}

/**
 * Generates font-face CSS for email
 */
export function generateFontFaceCSS(
  fontFamily: string,
  weights: number[] = [400, 600, 700]
): string {
  const fontUrl = getGoogleFontsUrl(fontFamily, weights);

  return `
@import url('${fontUrl}');

* {
  font-family: '${fontFamily}', Helvetica, Arial, sans-serif !important;
}

body, p, h1, h2, h3, h4, h5, h6, span, div, td, th {
  font-family: '${fontFamily}', Helvetica, Arial, sans-serif !important;
}
`;
}

/**
 * Generates base HTML structure for email
 */
export function generateBaseHtmlStructure(
  fontFamily: string = "Inter",
  preloadLinks: string = "",
  fontCSS: string = "",
  bodyContent: string = ""
): string {
  const defaultFontCSS = fontCSS || generateFontFaceCSS(fontFamily);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
<head>
${preloadLinks}
<meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="viewport" content="width=device-width" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<style>
${defaultFontCSS}

body {
  margin: 0;
  padding: 0;
  background-color: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

table {
  border-collapse: collapse;
  border-spacing: 0;
}

img {
  border: 0;
  outline: none;
  text-decoration: none;
  display: block;
  max-width: 100%;
  height: auto;
  object-fit: cover;
}

/* Maily.to specific styles */
.mly-editor-content {
  font-family: '${fontFamily}', Helvetica, Arial, sans-serif;
}

.mly-editor-content p {
  margin: 0 0 20px 0;
  font-size: 15px;
  line-height: 26.25px;
  color: #374151;
}

.mly-editor-content h1 {
  margin: 0 0 12px 0;
  font-size: 36px;
  line-height: 40px;
  font-weight: 800;
  color: #111827;
}

.mly-editor-content h2 {
  margin: 0 0 12px 0;
  font-size: 30px;
  line-height: 36px;
  font-weight: 700;
  color: #111827;
}

.mly-editor-content h3 {
  margin: 0 0 12px 0;
  font-size: 24px;
  line-height: 38px;
  font-weight: 600;
  color: #111827;
}

.mly-editor-content a {
  color: #111827;
  font-weight: 500;
  text-decoration: none;
}

.mly-editor-content ul,
.mly-editor-content ol {
  margin: 0 0 20px 0;
  padding-left: 26px;
}

.mly-editor-content li {
  margin: 8px 0;
  padding-left: 6px;
}

.mly-editor-content blockquote {
  border-left: 4px solid #D1D5DB;
  padding-left: 16px;
  margin: 20px 0;
  color: #374151;
}

.mly-editor-content code {
  background-color: #EFEFEF;
  color: #111827;
  padding: 2px 4px;
  border-radius: 6px;
  font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.mly-editor-content hr {
  margin: 32px 0;
  border: none;
  border-top: 1px solid #EAEAEA;
}

@media only screen and (max-width: 600px) {
  .container {
    width: 100% !important;
    max-width: 100% !important;
  }
  
  img {
    width: 100% !important;
    height: auto !important;
  }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center" style="background-color:#ffffff;">
    <tbody>
      <tr>
        <td align="center" style="padding:0;">
          <table class="container" align="center" width="640" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:600px;margin:0 auto;padding:0;">
            <tbody>
              <tr>
                <td style="padding:0;">
                  <div class="mly-editor-content">
                    ${bodyContent || "<!-- Email content goes here -->"}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}

/**
 * Extracts and cleans maily.to specific classes from HTML
 * Since we're applying styles via .mly-editor-content wrapper, we don't need the mly: classes
 */
function cleanMailyClasses(htmlContent: string): string {
  // Remove mly: prefixed classes since we're using .mly-editor-content wrapper
  // This regex matches class attributes and removes mly: prefixed classes
  return htmlContent.replace(/class="([^"]*)"/g, (match, classes) => {
    const cleanedClasses = classes
      .split(" ")
      .filter((cls: string) => !cls.startsWith("mly:"))
      .join(" ")
      .trim();

    return cleanedClasses ? `class="${cleanedClasses}"` : "";
  });
}

/**
 * Wraps TipTap HTML content in proper email structure
 */
export function wrapContentInEmailStructure(
  htmlContent: string,
  fontFamily: string = "Inter",
  fontWeights: number[] = [400, 600, 700]
): string {
  // Extract images from HTML
  const imageRegex = /<img[^>]+src="([^">]+)"/g;

  const images: string[] = [];
  let match;

  while ((match = imageRegex.exec(htmlContent)) !== null) {
    images.push(match[1]);
  }

  const uniqueImages = [...new Set(images)];
  const preloadLinks =
    uniqueImages.length > 0 ? generatePreloadLinks(uniqueImages) : "";
  const fontCSS = generateFontFaceCSS(fontFamily, fontWeights);

  // If the content already looks like a full HTML document (contains <html> or <!doctype html>),
  // do not wrap it again to prevent nested HTML tags
  const lowercaseContent = htmlContent.trim().toLowerCase();
  if (
    lowercaseContent.startsWith("<!doctype html") ||
    lowercaseContent.includes("<html")
  ) {
    const styleInjection = `\n${preloadLinks}\n<style>\n${fontCSS}\n</style>\n`;
    if (lowercaseContent.includes("</head>")) {
      return htmlContent.replace(/<\/head>/i, `${styleInjection}</head>`);
    }
    // Fallback if no <head> exists
    return htmlContent.replace(
      /(<html[^>]*>)/i,
      `$1\n<head>${styleInjection}</head>`
    );
  }

  // Clean maily.to classes since we're using wrapper styles
  const processedContent = cleanMailyClasses(htmlContent);

  return generateBaseHtmlStructure(
    fontFamily,
    preloadLinks,
    fontCSS,
    processedContent
  );
}
