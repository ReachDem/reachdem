import { ShoppingCart, CreditCard } from "lucide-react";
import {
  cartAbandonmentBlock,
  singleProductBlock,
  productShowcaseBlock,
} from "./marketing";
import { singlePlanBlock, comparisonPricingBlock } from "./pricing";

// Marketing component with sub-commands
export const marketingComponent = {
  id: "marketing",
  title: "Marketing",
  description: "Add pre-designed marketing blocks",
  searchTerms: ["marketing", "ecommerce", "product", "cart", "showcase"],
  icon: <ShoppingCart className="mly:h-4 mly:w-4" />,
  commands: [cartAbandonmentBlock, singleProductBlock, productShowcaseBlock],
};

// Pricing component with sub-commands
export const pricingComponent = {
  id: "pricing",
  title: "Pricing",
  description: "Add pre-designed pricing blocks",
  searchTerms: ["pricing", "plan", "subscription", "compare"],
  icon: <CreditCard className="mly:h-4 mly:w-4" />,
  commands: [singlePlanBlock, comparisonPricingBlock],
};

// Export all custom components
export const customComponents = [marketingComponent, pricingComponent];
