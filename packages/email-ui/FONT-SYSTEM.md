# Font System Documentation

## Overview

The email composer now includes a complete Google Fonts integration system that allows users to:

1. Select from popular Google Fonts
2. Automatically import fonts in generated emails
3. Generate proper HTML with DOCTYPE and font-face declarations

## Components

### 1. FontSelector Component

**Location:** `apps/web/components/campaigns/font-selector.tsx`

A dropdown component that fetches and displays available Google Fonts.

**Features:**

- Fetches fonts from Google Fonts API
- Falls back to popular fonts if API is unavailable
- Shows font preview in the dropdown
- Caches fonts for 24 hours

**Usage:**

```tsx
<FontSelector value={fontFamily} onChange={(font) => setFontFamily(font)} />
```

### 2. Google Fonts API Route

**Location:** `apps/web/app/api/google-fonts/route.ts`

Server-side API that fetches available fonts from Google Fonts API.

**Features:**

- Caches fonts for 24 hours to reduce API calls
- Prioritizes popular fonts (Inter, Roboto, etc.)
- Filters to show only sans-serif and serif fonts
- Returns fallback fonts if API key is not configured

**Configuration:**
Add to `.env`:

```env
GOOGLE_FONTS_API_KEY=your_api_key_here
```

Get your API key from: https://developers.google.com/fonts/docs/developer_api

### 3. Email Rendering System

**Location:** `apps/web/lib/render-email.ts`

Utilities for rendering emails with proper HTML structure and font imports.

**Functions:**

#### `renderEmail(options)`

Renders email content to proper HTML with DOCTYPE and font imports.

```typescript
const html = await renderEmail({
  content: jsonContent,
  previewText: "Email preview text",
  fontFamily: "Inter",
  fontWeights: [400, 600, 700],
});
```

#### `getGoogleFontsUrl(fontFamily, weights)`

Generates Google Fonts URL for given font family and weights.

```typescript
const url = getGoogleFontsUrl("Inter", [400, 600, 700]);
// Returns: https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap
```

#### `generateFontFaceCSS(fontFamily, weights)`

Generates @font-face CSS declarations for email.

```typescript
const css = generateFontFaceCSS("Inter", [400, 600, 700]);
```

## HTML Output Structure

The system generates proper HTML emails with the following structure:

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />

    <!-- Font imports -->
    <style>
      @font-face {
        font-family: "Inter";
        font-style: normal;
        font-weight: 400;
        mso-font-alt: "Helvetica";
        src: url(https://fonts.gstatic.com/s/inter/v18/...) format("woff2");
      }

      * {
        font-family: "Inter", Helvetica, Arial, sans-serif;
      }
    </style>
  </head>
  <body style="margin:0;">
    <!-- Email content -->
  </body>
</html>
```

## Integration with EmailComposer

The `EmailComposer` component has been updated to include:

1. **Font selector** - Allows users to choose a font
2. **Font state** - Stores selected font in `EmailContent`
3. **Preview integration** - Passes font info to preview dialog
4. **Render integration** - Uses font when generating HTML

**Updated EmailContent interface:**

```typescript
export interface EmailContent {
  subject: string;
  body: string;
  bodyJson?: any;
  mode: EmailMode;
  fontFamily?: string; // NEW
  fontWeights?: number[]; // NEW
}
```

## Preview System

The preview system has been updated to:

1. Accept font family and weights as props
2. Pass font info to the render API
3. Generate proper HTML with font imports

**Updated preview API:**

```typescript
POST /api/campaigns/preview
{
  "content": "...",
  "previewText": "...",
  "fontFamily": "Inter",
  "fontWeights": [400, 600, 700]
}
```

## Popular Fonts

The system prioritizes these popular fonts:

- Inter (default)
- Roboto
- Open Sans
- Lato
- Montserrat
- Poppins
- Raleway
- Ubuntu
- Nunito
- Playfair Display
- Source Sans Pro
- Merriweather
- PT Sans
- Noto Sans
- Oswald

## Fallback Behavior

If the Google Fonts API is unavailable or not configured:

1. The system returns the list of popular fonts
2. Font imports still work using Google Fonts CDN
3. No functionality is lost

## Email Client Compatibility

The font system is designed for maximum email client compatibility:

- Uses `@font-face` with WOFF2 format
- Includes fallback fonts (Helvetica, Arial, sans-serif)
- Uses `mso-font-alt` for Outlook compatibility
- Follows email HTML best practices

## Testing

To test the font system:

1. **Without API key:**
   - Font selector shows popular fonts
   - Fonts still load in preview
   - HTML generation works correctly

2. **With API key:**
   - Font selector shows 100+ fonts
   - Popular fonts appear first
   - Fonts are cached for 24 hours

3. **Preview:**
   - Select a font
   - Click Preview
   - Verify font is applied in preview
   - Check HTML source for proper font imports

## Future Enhancements

Potential improvements:

1. Font weight selector (currently defaults to 400, 600, 700)
2. Font preview in the editor itself
3. Custom font upload support
4. Font pairing suggestions
5. Font size presets
