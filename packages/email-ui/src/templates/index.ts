// Marketing Templates
export * from "./marketing/cart-abandonment";
export * from "./marketing/single-product";
export * from "./marketing/product-showcase";

// Features Templates
export * from "./features/simple-modern";
export * from "./features/three-column";

// Pricing Templates
export * from "./pricing/single-plan";
export * from "./pricing/comparison";

// Template Registry
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  preview: string;
}

export const templateRegistry: Record<string, TemplateMetadata[]> = {
  marketing: [
    {
      id: "cart-abandonment",
      name: "Cart Abandonment",
      description: "Remind customers of items left in cart",
      category: "marketing",
      preview: "https://react.email/static/braun-classic-watch.jpg",
    },
    {
      id: "single-product",
      name: "Single Product",
      description: "Centered product showcase with image and CTA",
      category: "marketing",
      preview: "https://react.email/static/braun-collection.jpg",
    },
    {
      id: "product-showcase",
      name: "Product Showcase",
      description: "Hero section with featured products grid",
      category: "marketing",
      preview: "https://react.email/static/coffee-bean-storage.jpg",
    },
  ],
  features: [
    {
      id: "simple-modern",
      name: "Simple Modern Features",
      description: "Clean feature list with icons and dividers",
      category: "features",
      preview: "https://react.email/static/heart-icon.png",
    },
    {
      id: "three-column",
      name: "Three Column Features",
      description: "Feature grid with centered icons and text",
      category: "features",
      preview: "https://react.email/static/rocket-icon.png",
    },
  ],
  pricing: [
    {
      id: "single-plan",
      name: "Single Plan Pricing",
      description: "Focused pricing card with features list",
      category: "pricing",
      preview: "https://react.email/static/braun-collection.jpg",
    },
    {
      id: "comparison",
      name: "Comparison Pricing",
      description: "Side-by-side pricing plans comparison",
      category: "pricing",
      preview: "https://react.email/static/braun-collection.jpg",
    },
  ],
};
