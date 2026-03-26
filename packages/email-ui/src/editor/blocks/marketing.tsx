import { ShoppingCart, Package, Sparkles } from "lucide-react";
import type { BlockItem } from "../../core/blocks/types";

export const cartAbandonmentBlock: BlockItem = {
  title: "Cart Abandonment",
  description: "Remind customers of items left in cart",
  searchTerms: ["cart", "abandoned", "checkout", "shopping", "ecommerce"],
  icon: <ShoppingCart className="mly:h-4 mly:w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent([
        {
          type: "heading",
          attrs: { textAlign: "center", level: 1, showIfKey: null },
          content: [
            {
              type: "text",
              text: "You left something in your cart",
            },
          ],
        },
        { type: "spacer", attrs: { height: 16, showIfKey: null } },
        {
          type: "section",
          attrs: {
            borderRadius: 8,
            borderColor: "#e5e7eb",
            borderWidth: 1,
            padding: 16,
            showIfKey: null,
          },
          content: [
            {
              type: "columns",
              attrs: { showIfKey: null, gap: 16 },
              content: [
                {
                  type: "column",
                  attrs: {
                    columnId: "product-image",
                    width: "120px",
                    verticalAlign: "top",
                  },
                  content: [
                    {
                      type: "image",
                      attrs: {
                        src: "https://react.email/static/braun-classic-watch.jpg",
                        alt: "Product",
                        title: null,
                        width: "110",
                        height: "110",
                        alignment: "left",
                        externalLink: null,
                        isExternalLinkVariable: false,
                        isSrcVariable: false,
                        showIfKey: null,
                      },
                    },
                  ],
                },
                {
                  type: "column",
                  attrs: {
                    columnId: "product-details",
                    width: "auto",
                    verticalAlign: "middle",
                  },
                  content: [
                    {
                      type: "heading",
                      attrs: { textAlign: "left", level: 3, showIfKey: null },
                      content: [{ type: "text", text: "Classic Watch" }],
                    },
                    {
                      type: "paragraph",
                      attrs: { textAlign: "left", showIfKey: null },
                      content: [
                        {
                          type: "text",
                          marks: [
                            { type: "textStyle", attrs: { color: "#6b7280" } },
                          ],
                          text: "Quantity: 1",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "column",
                  attrs: {
                    columnId: "product-price",
                    width: "100px",
                    verticalAlign: "middle",
                  },
                  content: [
                    {
                      type: "heading",
                      attrs: { textAlign: "right", level: 3, showIfKey: null },
                      content: [{ type: "text", text: "$210.00" }],
                    },
                  ],
                },
              ],
            },
            { type: "spacer", attrs: { height: 16, showIfKey: null } },
            {
              type: "button",
              attrs: {
                text: "Complete Your Purchase",
                url: "https://example.com/checkout",
                isUrlVariable: false,
                alignment: "center",
                variant: "filled",
                borderRadius: 8,
                buttonColor: "#4f46e5",
                textColor: "#ffffff",
                showIfKey: null,
              },
            },
          ],
        },
      ])
      .run();
  },
};

export const singleProductBlock: BlockItem = {
  title: "Single Product",
  description: "Centered product showcase with CTA",
  searchTerms: ["product", "showcase", "item", "sale", "ecommerce"],
  icon: <Package className="mly:h-4 mly:w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent([
        {
          type: "image",
          attrs: {
            src: "https://react.email/static/braun-collection.jpg",
            alt: "Product",
            title: null,
            width: 600,
            height: 320,
            alignment: "center",
            externalLink: null,
            isExternalLinkVariable: false,
            isSrcVariable: false,
            showIfKey: null,
          },
        },
        { type: "spacer", attrs: { height: 32, showIfKey: null } },
        {
          type: "paragraph",
          attrs: { textAlign: "center", showIfKey: null },
          content: [
            {
              type: "text",
              marks: [
                { type: "textStyle", attrs: { color: "#4f46e5" } },
                { type: "bold" },
              ],
              text: "Classic Watches",
            },
          ],
        },
        { type: "spacer", attrs: { height: 8, showIfKey: null } },
        {
          type: "heading",
          attrs: { textAlign: "center", level: 1, showIfKey: null },
          content: [{ type: "text", text: "Elegant Comfort" }],
        },
        { type: "spacer", attrs: { height: 16, showIfKey: null } },
        {
          type: "paragraph",
          attrs: { textAlign: "center", showIfKey: null },
          content: [
            {
              type: "text",
              marks: [{ type: "textStyle", attrs: { color: "#6b7280" } }],
              text: "Dieter Rams' work has an outstanding quality which distinguishes it from the vast majority of industrial design of the entire 20th Century.",
            },
          ],
        },
        { type: "spacer", attrs: { height: 16, showIfKey: null } },
        {
          type: "paragraph",
          attrs: { textAlign: "center", showIfKey: null },
          content: [
            {
              type: "text",
              marks: [{ type: "bold" }],
              text: "$210.00",
            },
          ],
        },
        { type: "spacer", attrs: { height: 16, showIfKey: null } },
        {
          type: "button",
          attrs: {
            text: "Buy now",
            url: "https://example.com",
            isUrlVariable: false,
            alignment: "center",
            variant: "filled",
            borderRadius: 8,
            buttonColor: "#4f46e5",
            textColor: "#ffffff",
            showIfKey: null,
          },
        },
      ])
      .run();
  },
};

export const productShowcaseBlock: BlockItem = {
  title: "Product Showcase",
  description: "Hero section with products grid",
  searchTerms: ["products", "grid", "showcase", "collection", "ecommerce"],
  icon: <Sparkles className="mly:h-4 mly:w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent([
        {
          type: "section",
          attrs: {
            borderRadius: 8,
            backgroundColor: "#292524",
            padding: 24,
            showIfKey: null,
          },
          content: [
            {
              type: "columns",
              attrs: { showIfKey: null, gap: 24 },
              content: [
                {
                  type: "column",
                  attrs: {
                    columnId: "hero-text",
                    width: "auto",
                    verticalAlign: "middle",
                  },
                  content: [
                    {
                      type: "heading",
                      attrs: { textAlign: "left", level: 1, showIfKey: null },
                      content: [
                        {
                          type: "text",
                          marks: [
                            { type: "textStyle", attrs: { color: "#ffffff" } },
                          ],
                          text: "Coffee Storage",
                        },
                      ],
                    },
                    { type: "spacer", attrs: { height: 8, showIfKey: null } },
                    {
                      type: "paragraph",
                      attrs: { textAlign: "left", showIfKey: null },
                      content: [
                        {
                          type: "text",
                          marks: [
                            {
                              type: "textStyle",
                              attrs: { color: "rgba(255,255,255,0.6)" },
                            },
                          ],
                          text: "Keep your coffee fresher for longer with innovative technology.",
                        },
                      ],
                    },
                    { type: "spacer", attrs: { height: 12, showIfKey: null } },
                    {
                      type: "paragraph",
                      attrs: { textAlign: "left", showIfKey: null },
                      content: [
                        {
                          type: "text",
                          marks: [
                            {
                              type: "link",
                              attrs: {
                                href: "https://example.com",
                                target: "_blank",
                                rel: "noopener noreferrer nofollow",
                                class: "mly:no-underline",
                                isUrlVariable: false,
                              },
                            },
                            {
                              type: "textStyle",
                              attrs: { color: "rgba(255,255,255,0.8)" },
                            },
                            { type: "bold" },
                          ],
                          text: "Shop now →",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "column",
                  attrs: {
                    columnId: "hero-image",
                    width: "250px",
                    verticalAlign: "middle",
                  },
                  content: [
                    {
                      type: "image",
                      attrs: {
                        src: "https://react.email/static/coffee-bean-storage.jpg",
                        alt: "Coffee Storage",
                        title: null,
                        width: "250",
                        height: "250",
                        alignment: "center",
                        externalLink: null,
                        isExternalLinkVariable: false,
                        isSrcVariable: false,
                        showIfKey: null,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        { type: "spacer", attrs: { height: 24, showIfKey: null } },
        {
          type: "columns",
          attrs: { showIfKey: null, gap: 12 },
          content: [
            {
              type: "column",
              attrs: {
                columnId: "product-1",
                width: "auto",
                verticalAlign: "top",
              },
              content: [
                {
                  type: "image",
                  attrs: {
                    src: "https://react.email/static/braun-classic-watch.jpg",
                    alt: "Product 1",
                    title: null,
                    width: "180",
                    height: "180",
                    alignment: "center",
                    externalLink: null,
                    isExternalLinkVariable: false,
                    isSrcVariable: false,
                    showIfKey: null,
                  },
                },
                { type: "spacer", attrs: { height: 12, showIfKey: null } },
                {
                  type: "heading",
                  attrs: { textAlign: "left", level: 4, showIfKey: null },
                  content: [
                    { type: "text", text: "Auto-Sealing Vacuum Canister" },
                  ],
                },
                { type: "spacer", attrs: { height: 8, showIfKey: null } },
                {
                  type: "paragraph",
                  attrs: { textAlign: "left", showIfKey: null },
                  content: [
                    {
                      type: "text",
                      marks: [
                        { type: "textStyle", attrs: { color: "#6b7280" } },
                      ],
                      text: "A container that automatically creates an airtight seal.",
                    },
                  ],
                },
              ],
            },
            {
              type: "column",
              attrs: {
                columnId: "product-2",
                width: "auto",
                verticalAlign: "top",
              },
              content: [
                {
                  type: "image",
                  attrs: {
                    src: "https://react.email/static/braun-analogue-clock.jpg",
                    alt: "Product 2",
                    title: null,
                    width: "180",
                    height: "180",
                    alignment: "center",
                    externalLink: null,
                    isExternalLinkVariable: false,
                    isSrcVariable: false,
                    showIfKey: null,
                  },
                },
                { type: "spacer", attrs: { height: 12, showIfKey: null } },
                {
                  type: "heading",
                  attrs: { textAlign: "left", level: 4, showIfKey: null },
                  content: [{ type: "text", text: "3-Pack Vacuum Containers" }],
                },
                { type: "spacer", attrs: { height: 8, showIfKey: null } },
                {
                  type: "paragraph",
                  attrs: { textAlign: "left", showIfKey: null },
                  content: [
                    {
                      type: "text",
                      marks: [
                        { type: "textStyle", attrs: { color: "#6b7280" } },
                      ],
                      text: "Keep your coffee fresher for longer with this set.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
      .run();
  },
};
