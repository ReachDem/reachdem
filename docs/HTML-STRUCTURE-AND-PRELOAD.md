# Structure HTML et Preload des Assets

## Vue d'ensemble

Le système génère maintenant une structure HTML complète et standard dès le départ, et injecte progressivement des liens de preload pour optimiser le chargement des images.

## Structure HTML de base

### HTML initial (éditeur vide)

Même quand l'éditeur est vide, la structure HTML complète est générée:

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <style>
      * {
        font-family: "Inter", Helvetica, Arial, sans-serif;
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
              style="max-width:600px;margin:0 auto;padding:16px;"
            >
              <tbody>
                <tr>
                  <td>
                    <!-- Email content goes here -->
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

## Injection progressive des preload links

### Détection automatique des images

Le système parcourt le contenu JSON de l'email et détecte automatiquement:

- Images (`type: 'image'`)
- Logos (`type: 'logo'`)
- Images inline (`type: 'inlineImage'`)

### Génération des liens de preload

Pour chaque image détectée, un lien de preload est généré:

```html
<link rel="preload" as="image" href="https://example.com/image.jpg" />
```

### Exemple avec images

Quand l'utilisateur ajoute des images, les preload links sont automatiquement injectés:

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <link
      rel="preload"
      as="image"
      href="https://react.email/static/coffee-bean-storage.jpg"
    />
    <link
      rel="preload"
      as="image"
      href="https://react.email/static/atmos-vacuum-canister.jpg"
    />
    <link
      rel="preload"
      as="image"
      href="https://react.email/static/vacuum-canister-clear-glass-bundle.jpg"
    />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <style>
      * {
        font-family: "Inter", Helvetica, Arial, sans-serif;
      }
    </style>
  </head>
  <body style="margin:0;background-color:#ffffff;">
    <!-- Email content with images -->
  </body>
</html>
```

## Fonctionnement technique

### 1. Initialisation

Quand l'éditeur est créé, la structure HTML de base est générée:

```typescript
// Dans EmailComposer
useEffect(() => {
  if (!value.body || value.body.trim() === "") {
    const baseHtml = generateBaseHtmlStructure(value.fontFamily || "Inter");
    onChange({ ...value, body: baseHtml });
  }
}, []);
```

### 2. Extraction des images

Lors du rendu, les images sont extraites du contenu JSON:

```typescript
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
```

### 3. Génération des preload links

Les liens sont générés et injectés dans le `<head>`:

```typescript
function generatePreloadLinks(imageUrls: string[]): string {
  return imageUrls
    .map((url) => `<link rel="preload" as="image" href="${url}" />`)
    .join("\n");
}

// Injection dans le HTML
if (imageUrls.length > 0) {
  const preloadLinks = generatePreloadLinks(imageUrls);
  return html.replace(/<head>/, `<head>\n${preloadLinks}`);
}
```

## Avantages

### Performance

- **Chargement anticipé**: Les images commencent à se charger avant d'être affichées
- **Rendu plus rapide**: Moins de temps d'attente pour l'utilisateur
- **Meilleure expérience**: Pas de "flash" d'images qui apparaissent progressivement

### SEO et accessibilité

- **Structure sémantique**: HTML valide et bien structuré
- **Meta tags appropriés**: Optimisation pour les clients email
- **Compatibilité**: Fonctionne sur tous les clients email modernes

### Maintenance

- **Automatique**: Pas besoin de gérer manuellement les preload links
- **Déduplication**: Les images en double ne sont preloadées qu'une fois
- **Évolutif**: Facile d'ajouter d'autres types d'assets

## Cas d'usage

### Email marketing avec plusieurs images

```typescript
const emailContent = {
  type: "doc",
  content: [
    {
      type: "image",
      attrs: { src: "https://example.com/hero.jpg" },
    },
    {
      type: "image",
      attrs: { src: "https://example.com/product1.jpg" },
    },
    {
      type: "image",
      attrs: { src: "https://example.com/product2.jpg" },
    },
  ],
};

// Génère automatiquement 3 preload links
```

### Email avec logo

```typescript
const emailContent = {
  type: "doc",
  content: [
    {
      type: "logo",
      attrs: { src: "https://example.com/logo.png" },
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Welcome!" }],
    },
  ],
};

// Génère 1 preload link pour le logo
```

### Email sans images

```typescript
const emailContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      content: [{ type: "text", text: "Hello" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Text only email" }],
    },
  ],
};

// Aucun preload link généré
// Structure HTML de base uniquement
```

## Configuration

### Personnaliser la structure de base

Vous pouvez modifier la fonction `generateBaseHtmlStructure` dans `apps/web/lib/render-email.ts`:

```typescript
export function generateBaseHtmlStructure(
  fontFamily: string = "Inter",
  preloadLinks: string = ""
): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
<head>
${preloadLinks}
<meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
<!-- Ajoutez vos meta tags personnalisés ici -->
</head>
<body>
  <!-- Personnalisez la structure du body -->
</body>
</html>`;
}
```

### Ajouter d'autres types d'assets

Pour preloader d'autres types d'assets (fonts, CSS, etc.):

```typescript
// Dans extractImageUrls, ajouter:
function extractAssetUrls(content: JSONContent): {
  images: string[];
  fonts: string[];
  stylesheets: string[];
} {
  // Logique d'extraction
}

// Puis générer les preload links appropriés:
function generateAllPreloadLinks(assets: any): string {
  const imageLinks = assets.images.map(
    (url) => `<link rel="preload" as="image" href="${url}" />`
  );

  const fontLinks = assets.fonts.map(
    (url) => `<link rel="preload" as="font" href="${url}" crossorigin />`
  );

  const styleLinks = assets.stylesheets.map(
    (url) => `<link rel="preload" as="style" href="${url}" />`
  );

  return [...imageLinks, ...fontLinks, ...styleLinks].join("\n");
}
```

## Tests

### Tester la structure de base

```typescript
import { generateBaseHtmlStructure } from "@/lib/render-email";

test("generates base HTML structure", () => {
  const html = generateBaseHtmlStructure("Inter");

  expect(html).toContain("<!DOCTYPE html");
  expect(html).toContain('<html dir="ltr" lang="en">');
  expect(html).toContain("<head>");
  expect(html).toContain("<body");
  expect(html).toContain("font-family: 'Inter'");
});
```

### Tester l'extraction des images

```typescript
import { renderEmail } from "@/lib/render-email";

test("extracts and preloads images", async () => {
  const content = {
    type: "doc",
    content: [
      {
        type: "image",
        attrs: { src: "https://example.com/test.jpg" },
      },
    ],
  };

  const html = await renderEmail({ content });

  expect(html).toContain(
    '<link rel="preload" as="image" href="https://example.com/test.jpg"'
  );
});
```

### Tester la déduplication

```typescript
test("deduplicates image URLs", async () => {
  const content = {
    type: "doc",
    content: [
      { type: "image", attrs: { src: "https://example.com/test.jpg" } },
      { type: "image", attrs: { src: "https://example.com/test.jpg" } }, // Duplicate
    ],
  };

  const html = await renderEmail({ content });

  // Should only have one preload link
  const matches = html.match(/rel="preload"/g);
  expect(matches?.length).toBe(1);
});
```

## Bonnes pratiques

### 1. Optimiser les images

- Utiliser des formats modernes (WebP avec fallback)
- Compresser les images avant upload
- Utiliser des CDN pour l'hébergement

### 2. Limiter le nombre d'images

- Maximum 10-15 images par email
- Trop d'images ralentissent le chargement
- Considérer des sprites pour les petites icônes

### 3. URLs absolues

- Toujours utiliser des URLs complètes (https://)
- Éviter les chemins relatifs
- Vérifier que les images sont accessibles publiquement

### 4. Fallbacks

- Toujours inclure un texte alternatif (alt)
- Prévoir un design qui fonctionne sans images
- Certains clients bloquent les images par défaut

## Dépannage

### Les preload links ne sont pas générés

- Vérifier que les images ont un attribut `src`
- Vérifier que le type de nœud est correct (`image`, `logo`, `inlineImage`)
- Vérifier les logs de la console pour les erreurs

### Les images ne se chargent pas plus vite

- Vérifier que les URLs sont correctes
- Vérifier que le serveur d'images supporte les preload
- Tester avec des outils de performance (Lighthouse)

### Structure HTML invalide

- Vérifier que le DOCTYPE est présent
- Valider le HTML avec un validateur W3C
- Tester dans différents clients email

## Ressources

- [HTML Email Best Practices](https://www.campaignmonitor.com/css/)
- [Resource Hints (Preload)](https://www.w3.org/TR/resource-hints/)
- [Email Client CSS Support](https://www.caniemail.com/)
- [XHTML 1.0 Specification](https://www.w3.org/TR/xhtml1/)
