import { CreditCard, LayoutGrid } from "lucide-react";
import type { BlockItem } from "../../core/blocks/types";

export const singlePlanBlock: BlockItem = {
  title: "Single Plan Pricing",
  description: "Focused pricing card with features",
  searchTerms: ["pricing", "plan", "subscription", "offer"],
  icon: <CreditCard className="mly:h-4 mly:w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent([
        {
          type: "section",
          attrs: {
            borderRadius: 12,
            borderColor: "#d1d5db",
            borderWidth: 1,
            padding: 28,
            showIfKey: null,
          },
          content: [
            {
              type: "paragraph",
              attrs: { textAlign: "left", showIfKey: null },
              content: [
                {
                  type: "text",
                  marks: [
                    { type: "textStyle", attrs: { color: "#4f46e5" } },
                    { type: "bold" },
                  ],
                  text: "EXCLUSIVE OFFER",
                },
              ],
            },
            { type: "spacer", attrs: { height: 16, showIfKey: null } },
            {
              type: "paragraph",
              attrs: { textAlign: "left", showIfKey: null },
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "$12",
                },
                {
                  type: "text",
                  marks: [{ type: "textStyle", attrs: { color: "#6b7280" } }],
                  text: " / month",
                },
              ],
            },
            { type: "spacer", attrs: { height: 16, showIfKey: null } },
            {
              type: "paragraph",
              attrs: { textAlign: "left", showIfKey: null },
              content: [
                {
                  type: "text",
                  marks: [{ type: "textStyle", attrs: { color: "#374151" } }],
                  text: "We've handcrafted the perfect plan tailored specifically for your needs. Unlock premium features at an unbeatable value.",
                },
              ],
            },
            { type: "spacer", attrs: { height: 24, showIfKey: null } },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      attrs: { textAlign: "left", showIfKey: null },
                      content: [
                        {
                          type: "text",
                          marks: [
                            { type: "textStyle", attrs: { color: "#6b7280" } },
                          ],
                          text: "Manage up to 25 premium products",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      attrs: { textAlign: "left", showIfKey: null },
                      content: [
                        {
                          type: "text",
                          marks: [
                            { type: "textStyle", attrs: { color: "#6b7280" } },
                          ],
                          text: "Grow your audience with 10,000 subscribers",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      attrs: { textAlign: "left", showIfKey: null },
                      content: [
                        {
                          type: "text",
                          marks: [
                            { type: "textStyle", attrs: { color: "#6b7280" } },
                          ],
                          text: "Make data-driven decisions with advanced analytics",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      attrs: { textAlign: "left", showIfKey: null },
                      content: [
                        {
                          type: "text",
                          marks: [
                            { type: "textStyle", attrs: { color: "#6b7280" } },
                          ],
                          text: "Priority support with 24-hour response time",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      attrs: { textAlign: "left", showIfKey: null },
                      content: [
                        {
                          type: "text",
                          marks: [
                            { type: "textStyle", attrs: { color: "#6b7280" } },
                          ],
                          text: "Seamless integration with your favorite tools",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            { type: "spacer", attrs: { height: 24, showIfKey: null } },
            {
              type: "button",
              attrs: {
                text: "Claim Your Special Offer",
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
            { type: "spacer", attrs: { height: 24, showIfKey: null } },
            { type: "horizontalRule" },
            { type: "spacer", attrs: { height: 16, showIfKey: null } },
            {
              type: "paragraph",
              attrs: { textAlign: "center", showIfKey: null },
              content: [
                {
                  type: "text",
                  marks: [{ type: "textStyle", attrs: { color: "#9ca3af" } }],
                  text: "Limited time offer - Upgrade now and save 20%",
                },
              ],
            },
            { type: "spacer", attrs: { height: 8, showIfKey: null } },
            {
              type: "paragraph",
              attrs: { textAlign: "center", showIfKey: null },
              content: [
                {
                  type: "text",
                  marks: [{ type: "textStyle", attrs: { color: "#9ca3af" } }],
                  text: "No credit card required. 14-day free trial available.",
                },
              ],
            },
          ],
        },
      ])
      .run();
  },
};

export const comparisonPricingBlock: BlockItem = {
  title: "Comparison Pricing",
  description: "Side-by-side plans comparison",
  searchTerms: ["pricing", "compare", "plans", "tiers"],
  icon: <LayoutGrid className="mly:h-4 mly:w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent([
        {
          type: "heading",
          attrs: { textAlign: "center", level: 2, showIfKey: null },
          content: [{ type: "text", text: "Choose the right plan for you" }],
        },
        { type: "spacer", attrs: { height: 12, showIfKey: null } },
        {
          type: "paragraph",
          attrs: { textAlign: "center", showIfKey: null },
          content: [
            {
              type: "text",
              marks: [{ type: "textStyle", attrs: { color: "#6b7280" } }],
              text: "Choose an affordable plan with top features to engage audiences, build loyalty, and boost sales.",
            },
          ],
        },
        { type: "spacer", attrs: { height: 32, showIfKey: null } },
        {
          type: "columns",
          attrs: { showIfKey: null, gap: 20 },
          content: [
            {
              type: "column",
              attrs: {
                columnId: "plan-hobby",
                width: "auto",
                verticalAlign: "top",
              },
              content: [
                {
                  type: "section",
                  attrs: {
                    borderRadius: 8,
                    borderColor: "#d1d5db",
                    borderWidth: 1,
                    padding: 24,
                    showIfKey: null,
                  },
                  content: [
                    {
                      type: "paragraph",
                      attrs: { textAlign: "left", showIfKey: null },
                      content: [
                        {
                          type: "text",
                          marks: [
                            { type: "textStyle", attrs: { color: "#6366f1" } },
                            { type: "bold" },
                          ],
                          text: "Hobby",
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
                          marks: [{ type: "bold" }],
                          text: "$29",
                        },
                        {
                          type: "text",
                          marks: [
                            { type: "textStyle", attrs: { color: "#6b7280" } },
                          ],
                          text: " / month",
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
                            { type: "textStyle", attrs: { color: "#6b7280" } },
                          ],
                          text: "The perfect plan for getting started.",
                        },
                      ],
                    },
                    { type: "spacer", attrs: { height: 24, showIfKey: null } },
                    {
                      type: "bulletList",
                      content: [
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              attrs: { textAlign: "left", showIfKey: null },
                              content: [
                                {
                                  type: "text",
                                  marks: [
                                    {
                                      type: "textStyle",
                                      attrs: { color: "#6b7280" },
                                    },
                                  ],
                                  text: "25 products",
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              attrs: { textAlign: "left", showIfKey: null },
                              content: [
                                {
                                  type: "text",
                                  marks: [
                                    {
                                      type: "textStyle",
                                      attrs: { color: "#6b7280" },
                                    },
                                  ],
                                  text: "Up to 10,000 subscribers",
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              attrs: { textAlign: "left", showIfKey: null },
                              content: [
                                {
                                  type: "text",
                                  marks: [
                                    {
                                      type: "textStyle",
                                      attrs: { color: "#6b7280" },
                                    },
                                  ],
                                  text: "Advanced analytics",
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              attrs: { textAlign: "left", showIfKey: null },
                              content: [
                                {
                                  type: "text",
                                  marks: [
                                    {
                                      type: "textStyle",
                                      attrs: { color: "#6b7280" },
                                    },
                                  ],
                                  text: "24-hour support response time",
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    { type: "spacer", attrs: { height: 24, showIfKey: null } },
                    {
                      type: "button",
                      attrs: {
                        text: "Get started today",
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
                  ],
                },
              ],
            },
            {
              type: "column",
              attrs: {
                columnId: "plan-enterprise",
                width: "auto",
                verticalAlign: "top",
              },
              content: [
                {
                  type: "section",
                  attrs: {
                    borderRadius: 8,
                    backgroundColor: "#1f2937",
                    padding: 24,
                    showIfKey: null,
                  },
                  content: [
                    {
                      type: "paragraph",
                      attrs: { textAlign: "left", showIfKey: null },
                      content: [
                        {
                          type: "text",
                          marks: [
                            { type: "textStyle", attrs: { color: "#818cf8" } },
                            { type: "bold" },
                          ],
                          text: "Enterprise",
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
                            { type: "textStyle", attrs: { color: "#ffffff" } },
                            { type: "bold" },
                          ],
                          text: "$99",
                        },
                        {
                          type: "text",
                          marks: [
                            { type: "textStyle", attrs: { color: "#d1d5db" } },
                          ],
                          text: " / month",
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
                            { type: "textStyle", attrs: { color: "#d1d5db" } },
                          ],
                          text: "Dedicated support and enterprise ready.",
                        },
                      ],
                    },
                    { type: "spacer", attrs: { height: 24, showIfKey: null } },
                    {
                      type: "bulletList",
                      content: [
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              attrs: { textAlign: "left", showIfKey: null },
                              content: [
                                {
                                  type: "text",
                                  marks: [
                                    {
                                      type: "textStyle",
                                      attrs: { color: "#d1d5db" },
                                    },
                                  ],
                                  text: "Unlimited products",
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              attrs: { textAlign: "left", showIfKey: null },
                              content: [
                                {
                                  type: "text",
                                  marks: [
                                    {
                                      type: "textStyle",
                                      attrs: { color: "#d1d5db" },
                                    },
                                  ],
                                  text: "Unlimited subscribers",
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              attrs: { textAlign: "left", showIfKey: null },
                              content: [
                                {
                                  type: "text",
                                  marks: [
                                    {
                                      type: "textStyle",
                                      attrs: { color: "#d1d5db" },
                                    },
                                  ],
                                  text: "Advanced analytics",
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              attrs: { textAlign: "left", showIfKey: null },
                              content: [
                                {
                                  type: "text",
                                  marks: [
                                    {
                                      type: "textStyle",
                                      attrs: { color: "#d1d5db" },
                                    },
                                  ],
                                  text: "Dedicated support representative",
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              attrs: { textAlign: "left", showIfKey: null },
                              content: [
                                {
                                  type: "text",
                                  marks: [
                                    {
                                      type: "textStyle",
                                      attrs: { color: "#d1d5db" },
                                    },
                                  ],
                                  text: "Marketing automations",
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              attrs: { textAlign: "left", showIfKey: null },
                              content: [
                                {
                                  type: "text",
                                  marks: [
                                    {
                                      type: "textStyle",
                                      attrs: { color: "#d1d5db" },
                                    },
                                  ],
                                  text: "Custom integrations",
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    { type: "spacer", attrs: { height: 24, showIfKey: null } },
                    {
                      type: "button",
                      attrs: {
                        text: "Get started today",
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
