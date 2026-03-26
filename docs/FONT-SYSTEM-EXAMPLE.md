# Exemple d'utilisation du système de polices

## Exemple complet: Créer un email avec une police personnalisée

### 1. Configuration initiale (optionnelle)

Ajouter la clé API Google Fonts dans `.env`:

```env
GOOGLE_FONTS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 2. Utiliser le compositeur d'email

```tsx
"use client";

import { useState } from "react";
import {
  EmailComposer,
  EmailContent,
} from "@/components/campaigns/email-composer";

export function CreateEmailPage() {
  const [emailContent, setEmailContent] = useState<EmailContent>({
    subject: "Bienvenue chez ReachDem!",
    body: "",
    bodyJson: null,
    mode: "visual",
    fontFamily: "Montserrat", // Police personnalisée
    fontWeights: [400, 600, 700],
  });

  const handleSave = async () => {
    // Sauvegarder l'email
    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailContent),
    });

    if (response.ok) {
      console.log("Email sauvegardé!");
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-2xl font-bold">Créer un email</h1>

      <EmailComposer value={emailContent} onChange={setEmailContent} />

      <div className="mt-6">
        <button
          onClick={handleSave}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Sauvegarder
        </button>
      </div>
    </div>
  );
}
```

### 3. Générer le HTML pour l'envoi

```tsx
import { renderEmail } from "@/lib/render-email";

async function sendEmail(emailContent: EmailContent, recipient: string) {
  // Générer le HTML avec la police personnalisée
  const html = await renderEmail({
    content: emailContent.bodyJson,
    previewText: "Découvrez nos nouveautés",
    fontFamily: emailContent.fontFamily || "Inter",
    fontWeights: emailContent.fontWeights || [400, 600, 700],
  });

  // Envoyer l'email
  await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: recipient,
      subject: emailContent.subject,
      html,
    }),
  });
}
```

### 4. HTML généré (exemple)

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width" />

    <!-- Import de la police Montserrat -->
    <style>
      @font-face {
        font-family: "Montserrat";
        font-style: normal;
        font-weight: 400;
        mso-font-alt: "Helvetica";
        src: url(https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2)
          format("woff2");
      }

      @font-face {
        font-family: "Montserrat";
        font-style: normal;
        font-weight: 600;
        mso-font-alt: "Helvetica";
        src: url(https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wdhyzbi.woff2)
          format("woff2");
      }

      @font-face {
        font-family: "Montserrat";
        font-style: normal;
        font-weight: 700;
        mso-font-alt: "Helvetica";
        src: url(https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wdhyzbi.woff2)
          format("woff2");
      }

      * {
        font-family: "Montserrat", Helvetica, Arial, sans-serif;
      }
    </style>
  </head>
  <body style="margin:0;background-color:#ffffff;">
    <table
      border="0"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      align="center"
    >
      <tbody>
        <tr>
          <td>
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="max-width:600px;margin:0 auto;"
            >
              <tbody>
                <tr>
                  <td>
                    <h1
                      style="font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:36px;font-weight:700;color:#111827;"
                    >
                      Bienvenue chez ReachDem!
                    </h1>
                    <p
                      style="font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;"
                    >
                      Nous sommes ravis de vous accueillir dans notre
                      communauté.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
```

## Exemple: Utiliser différentes polices pour différentes sections

```tsx
// Créer un email avec plusieurs styles de polices
const emailWithMixedFonts = {
  subject: "Newsletter Mensuelle",
  mode: "visual" as const,
  fontFamily: "Inter", // Police principale
  fontWeights: [400, 600, 700],
  bodyJson: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [
          {
            type: "text",
            text: "Newsletter Mensuelle",
            // La police Inter sera appliquée
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Découvrez nos dernières actualités",
          },
        ],
      },
    ],
  },
};
```

## Exemple: API de prévisualisation

```typescript
// Prévisualiser un email avec une police personnalisée
async function previewEmail(content: any, fontFamily: string) {
  const response = await fetch("/api/campaigns/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: JSON.stringify(content),
      previewText: "Texte de prévisualisation",
      fontFamily,
      fontWeights: [400, 600, 700],
    }),
  });

  const { html } = await response.json();
  return html;
}

// Utilisation
const html = await previewEmail(emailContent.bodyJson, "Playfair Display");
```

## Exemple: Récupérer les polices disponibles

```typescript
async function getAvailableFonts() {
  const response = await fetch("/api/google-fonts");
  const { fonts } = await response.json();

  return fonts.map((font: any) => ({
    label: font.family,
    value: font.family,
    category: font.category,
  }));
}

// Utilisation dans un composant
const fonts = await getAvailableFonts();
console.log(fonts);
// [
//   { label: 'Inter', value: 'Inter', category: 'sans-serif' },
//   { label: 'Roboto', value: 'Roboto', category: 'sans-serif' },
//   ...
// ]
```

## Exemple: Tester le rendu HTML

```typescript
import { renderEmail } from "@/lib/render-email";

describe("Email Rendering", () => {
  it("should render email with custom font", async () => {
    const content = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Hello World" }],
        },
      ],
    };

    const html = await renderEmail({
      content,
      fontFamily: "Montserrat",
      fontWeights: [400, 700],
    });

    // Vérifier que la police est importée
    expect(html).toContain("font-family: 'Montserrat'");
    expect(html).toContain("@font-face");
    expect(html).toContain("<!DOCTYPE html");
  });
});
```

## Exemple: Personnalisation avancée

```typescript
import { generateFontFaceCSS, getGoogleFontsUrl } from "@/lib/render-email";

// Générer le CSS pour plusieurs polices
const headingFont = generateFontFaceCSS("Playfair Display", [700]);
const bodyFont = generateFontFaceCSS("Inter", [400, 600]);

const customCSS = `
  ${headingFont}
  ${bodyFont}
  
  h1, h2, h3 {
    font-family: 'Playfair Display', serif !important;
  }
  
  p, span, div {
    font-family: 'Inter', sans-serif !important;
  }
`;

// Utiliser dans un template personnalisé
const customTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>${customCSS}</style>
</head>
<body>
  <h1>Titre élégant</h1>
  <p>Texte lisible</p>
</body>
</html>
`;
```

## Bonnes pratiques

### 1. Choisir la bonne police

```typescript
// ✅ Bon: Police lisible et professionnelle
const goodFont = {
  fontFamily: "Inter",
  fontWeights: [400, 600, 700],
};

// ❌ Mauvais: Police trop décorative
const badFont = {
  fontFamily: "Pacifico", // Difficile à lire en paragraphe
  fontWeights: [400],
};
```

### 2. Limiter les poids de police

```typescript
// ✅ Bon: 2-3 poids suffisent
const efficientWeights = [400, 700]; // Regular et Bold

// ❌ Mauvais: Trop de poids ralentissent le chargement
const tooManyWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
```

### 3. Toujours inclure des fallbacks

```typescript
// ✅ Bon: Fallbacks inclus automatiquement
const html = await renderEmail({
  content,
  fontFamily: "Montserrat",
});
// Génère: font-family: 'Montserrat', Helvetica, Arial, sans-serif;

// Le système ajoute automatiquement les fallbacks
```

### 4. Tester sur différents clients

```typescript
// Tester le rendu sur:
const emailClients = [
  "Gmail (web)",
  "Gmail (mobile)",
  "Outlook 2016",
  "Outlook 365",
  "Apple Mail",
  "Yahoo Mail",
];

// Certains clients peuvent ne pas supporter les polices web
// Les fallbacks garantissent une bonne lisibilité
```
