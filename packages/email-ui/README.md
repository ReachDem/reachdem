# @reachdem/email-ui

Package d'éditeur d'emails pour ReachDem, basé sur maily.to et TipTap.

## 📦 Contenu du package

### Structure

```
packages/email-ui/
├── src/
│   ├── core/              # Code source complet de maily.to
│   │   ├── blocks/        # Blocks de base (button, image, etc.)
│   │   ├── editor/        # Éditeur TipTap avec extensions
│   │   └── extensions/    # Extensions slash-command, etc.
│   ├── editor/            # Nos customisations
│   │   ├── blocks/        # Nos blocks personnalisés
│   │   │   ├── marketing.tsx  # Blocks marketing
│   │   │   ├── pricing.tsx    # Blocks pricing
│   │   │   └── index.tsx      # Export des composants
│   │   └── default-slash-commands.tsx  # Commandes slash complètes
│   └── templates/         # Templates React Email
│       ├── marketing/     # Templates marketing
│       ├── features/      # Templates features
│       └── pricing/       # Templates pricing
└── dist/                  # Build output
```

## 🎨 Composants disponibles

### Blocks de base (maily.to)

- Text, Headings (H1, H2, H3)
- Lists (Bullet, Ordered)
- Images (Image, Logo, Inline Image)
- Layout (Columns, Section, Repeat, Divider, Spacer)
- Interactive (Button, Link Card)
- Typography (Blockquote, Footer, Hard Break)

### Components (menu slash "/")

#### Headers

- Logo with Text (Horizontal)
- Logo with Text (Vertical)
- Logo with Cover Image

#### Footers

- Footer Copyright
- Footer Community Feedback CTA
- Footer Company Signature

#### Marketing ⭐ (Nouveau)

- **Cart Abandonment**: Tableau de produits avec checkout
- **Single Product**: Showcase produit centré avec CTA
- **Product Showcase**: Hero section + grille de produits

#### Pricing ⭐ (Nouveau)

- **Single Plan**: Carte pricing avec features
- **Comparison Pricing**: Comparaison 2 plans côte à côte

## 🚀 Utilisation

### Installation

```bash
pnpm add @reachdem/email-ui
```

### Dans votre composant

```typescript
import { Editor, DEFAULT_SLASH_COMMANDS } from '@reachdem/email-ui';

function EmailComposer() {
  return (
    <Editor
      blocks={DEFAULT_SLASH_COMMANDS}
      config={{
        hasMenuBar: false,
        contentClassName: "mx-auto max-w-[calc(600px+80px)] px-10 pb-10",
      }}
      onCreate={(editor) => {
        console.log('Editor ready', editor);
      }}
      onUpdate={(editor) => {
        const html = editor.getHTML();
        const json = editor.getJSON();
        // Sauvegarder le contenu
      }}
    />
  );
}
```

## 🎯 Fonctionnalités

### ✅ Implémenté

- ✅ Éditeur WYSIWYG complet
- ✅ Tous les blocks de base de maily.to
- ✅ Templates marketing (3 variantes)
- ✅ Templates pricing (2 variantes)
- ✅ Menu slash avec sous-menus
- ✅ Export HTML/JSON
- ✅ Édition complète de tous les éléments
- ✅ Responsive design
- ✅ Preview en temps réel

### 🚧 En cours

- 🚧 Upload d'images vers S3
- 🚧 Système de variables
- 🚧 Rendu HTML optimisé

### 📋 Planifié

- 📋 Preview multi-devices
- 📋 Tracking automatique
- 📋 A/B testing markers
- 📋 Auto-save
- 📋 Collaboration temps réel

## 🔧 Configuration

### Variables d'environnement

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
```

### Upload d'images

```typescript
// API route: /api/upload-image
const formData = new FormData();
formData.append("file", file);

const response = await fetch("/api/upload-image", {
  method: "POST",
  body: formData,
});

const { url } = await response.json();
```

## 📚 Documentation

### Créer un nouveau block

```typescript
// packages/email-ui/src/editor/blocks/custom.tsx
import type { BlockItem } from '../../core/blocks/types';

export const myCustomBlock: BlockItem = {
  title: 'My Custom Block',
  description: 'Description of my block',
  searchTerms: ['custom', 'block'],
  icon: <MyIcon className="mly:h-4 mly:w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: 'paragraph',
        content: [{ type: 'text', text: 'My custom content' }],
      })
      .run();
  },
};
```

### Ajouter au menu slash

```typescript
// packages/email-ui/src/editor/default-slash-commands.tsx
import { myCustomBlock } from "./blocks/custom";

export const DEFAULT_SLASH_COMMANDS: BlockGroupItem[] = [
  {
    title: "Components",
    commands: [
      // ... autres commandes
      myCustomBlock,
    ],
  },
];
```

## 🎨 Personnalisation

### Couleurs de marque

```typescript
const brandColors = {
  primary: "#4f46e5",
  secondary: "#6366f1",
  accent: "#818cf8",
};

// Utiliser dans les blocks
buttonColor: brandColors.primary;
```

### Styles personnalisés

```css
/* apps/web/styles/email-editor.css */
.editor-content {
  background: white;
  min-height: 400px;
}
```

## 🔗 Intégrations

### Avec React Email

```typescript
import { render } from '@react-email/components';
import { MyTemplate } from './templates/my-template';

const html = render(<MyTemplate {...props} />);
```

### Avec maily.to render

```typescript
import { render } from "@maily-to/render";

const html = await render(editorContent, {
  inlineCss: true,
  minify: true,
});
```

## 📖 Ressources

- [Maily.to Documentation](https://maily.to/docs)
- [TipTap Documentation](https://tiptap.dev)
- [React Email](https://react.email)
- [Améliorations planifiées](./IMPROVEMENTS.md)

## 🤝 Contribution

Pour ajouter de nouveaux templates ou blocks:

1. Créer le block dans `src/editor/blocks/`
2. L'ajouter dans `default-slash-commands.tsx`
3. Rebuild le package: `pnpm build`
4. Tester dans l'app web

## 📝 License

Private - ReachDem
