// Type declarations for custom components
import type { ReactElement } from "react";
import type { BlockItem } from "@maily-to/core";

export const marketingComponent: {
  id: string;
  title: string;
  description: string;
  searchTerms: string[];
  icon: ReactElement;
  commands: BlockItem[];
};

export const pricingComponent: {
  id: string;
  title: string;
  description: string;
  searchTerms: string[];
  icon: ReactElement;
  commands: BlockItem[];
};

export const customComponents: Array<{
  id: string;
  title: string;
  description: string;
  searchTerms: string[];
  icon: ReactElement;
  commands: BlockItem[];
}>;
