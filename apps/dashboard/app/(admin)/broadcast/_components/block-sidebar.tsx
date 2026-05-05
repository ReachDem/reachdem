"use client";

import { useState } from "react";
import { useCurrentEditor } from "@tiptap/react";
import {
  IconTypography,
  IconH1,
  IconClick,
  IconQuote,
  IconCode,
  IconList,
  IconListNumbers,
  IconTable,
  IconLayoutRows,
  IconPhoto,
  IconBrandYoutube,
  IconLine,
  IconSpacingVertical,
  IconColumns2,
  IconColumns3,
  IconLayoutBoard,
  IconContainer,
  IconBrandFacebook,
  IconFileText,
  IconHtml,
  IconVariable,
  IconSignature,
  IconAlertCircle,
  IconClock,
  IconDiscount2,
  IconChartBar,
  IconPhotoScan,
  IconSticker,
  IconSearch,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface BlockItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (editor: any) => void;
}

const BLOCKS: { category: string; items: BlockItem[] }[] = [
  {
    category: "CONTENT",
    items: [
      {
        label: "Text",
        icon: IconTypography,
        action: (e) => e?.chain().focus().setParagraph().run(),
      },
      {
        label: "Heading",
        icon: IconH1,
        action: (e) => e?.chain().focus().setHeading({ level: 1 }).run(),
      },
      {
        label: "Button",
        icon: IconClick,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({
              type: "button",
              attrs: { text: "Click me", url: "#" },
            })
            .run(),
      },
      {
        label: "Quote",
        icon: IconQuote,
        action: (e) => e?.chain().focus().setBlockquote().run(),
      },
      {
        label: "Code",
        icon: IconCode,
        action: (e) => e?.chain().focus().setCodeBlock().run(),
      },
      {
        label: "Bullet List",
        icon: IconList,
        action: (e) => e?.chain().focus().toggleBulletList().run(),
      },
      {
        label: "Numbered",
        icon: IconListNumbers,
        action: (e) => e?.chain().focus().toggleOrderedList().run(),
      },
      {
        label: "Countdown",
        icon: IconClock,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({
              type: "section",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "[Countdown]" }],
                },
              ],
            })
            .run(),
      },
      {
        label: "Table",
        icon: IconTable,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({
              type: "section",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "[Table]" }],
                },
              ],
            })
            .run(),
      },
      {
        label: "Hero",
        icon: IconLayoutRows,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({
              type: "section",
              content: [
                {
                  type: "heading",
                  attrs: { level: 1 },
                  content: [{ type: "text", text: "Hero Title" }],
                },
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Hero description" }],
                },
              ],
            })
            .run(),
      },
      {
        label: "Coupon",
        icon: IconDiscount2,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({
              type: "section",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "[Coupon Code]" }],
                },
              ],
            })
            .run(),
      },
      {
        label: "Progress",
        icon: IconChartBar,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({
              type: "section",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "[Progress Bar]" }],
                },
              ],
            })
            .run(),
      },
      {
        label: "Image + Text",
        icon: IconPhotoScan,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({ type: "columns", attrs: { cols: 2 } })
            .run(),
      },
    ],
  },
  {
    category: "MEDIA",
    items: [
      {
        label: "Image",
        icon: IconPhoto,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({ type: "image", attrs: { src: "", alt: "" } })
            .run(),
      },
      {
        label: "Logo",
        icon: IconSticker,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({ type: "logo", attrs: { src: "" } })
            .run(),
      },
      {
        label: "Video",
        icon: IconBrandYoutube,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({ type: "video", attrs: { src: "" } })
            .run(),
      },
    ],
  },
  {
    category: "LAYOUT",
    items: [
      {
        label: "Divider",
        icon: IconLine,
        action: (e) => e?.chain().focus().setHorizontalRule().run(),
      },
      {
        label: "Spacer",
        icon: IconSpacingVertical,
        action: (e) =>
          e?.chain().focus().insertContent({ type: "spacer" }).run(),
      },
      {
        label: "2 Columns",
        icon: IconColumns2,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({ type: "columns", attrs: { cols: 2 } })
            .run(),
      },
      {
        label: "Container",
        icon: IconContainer,
        action: (e) =>
          e?.chain().focus().insertContent({ type: "section" }).run(),
      },
      {
        label: "3 Columns",
        icon: IconColumns3,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({ type: "columns", attrs: { cols: 3 } })
            .run(),
      },
      {
        label: "4 Columns",
        icon: IconLayoutBoard,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({ type: "columns", attrs: { cols: 4 } })
            .run(),
      },
    ],
  },
  {
    category: "UTILITY",
    items: [
      {
        label: "Social Links",
        icon: IconBrandFacebook,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({
              type: "section",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "[Social Links]" }],
                },
              ],
            })
            .run(),
      },
      {
        label: "Footer",
        icon: IconFileText,
        action: (e) =>
          e?.chain().focus().insertContent({ type: "footer" }).run(),
      },
      {
        label: "HTML",
        icon: IconHtml,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({
              type: "htmlBlock",
              attrs: { content: "<p>Custom HTML</p>" },
            })
            .run(),
      },
      {
        label: "Variable",
        icon: IconVariable,
        action: (e) =>
          e?.chain().focus().insertContent("{{variable_name}}").run(),
      },
      {
        label: "Signature",
        icon: IconSignature,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({
              type: "section",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "[Signature]" }],
                },
              ],
            })
            .run(),
      },
      {
        label: "Alert",
        icon: IconAlertCircle,
        action: (e) =>
          e
            ?.chain()
            .focus()
            .insertContent({
              type: "section",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "[Alert message]" }],
                },
              ],
            })
            .run(),
      },
    ],
  },
];

export function BlockSidebar() {
  const { editor } = useCurrentEditor();
  const [search, setSearch] = useState("");

  const filteredBlocks = search.trim()
    ? BLOCKS.map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((g) => g.items.length > 0)
    : BLOCKS;

  return (
    <div className="border-border bg-card flex h-full w-56 shrink-0 flex-col overflow-hidden border-r">
      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <IconSearch
            size={14}
            className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border py-1.5 pr-3 pl-8 text-xs focus:ring-1 focus:outline-none"
          />
        </div>
      </div>

      {/* Blocks */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {filteredBlocks.map((group) => (
          <div key={group.category} className="mb-3">
            <p className="text-muted-foreground mb-1.5 px-1 text-[10px] font-semibold tracking-wider uppercase">
              {group.category}
            </p>
            <div className="grid grid-cols-2 gap-1">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => item.action(editor)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md border border-transparent px-1 py-2 text-center transition-colors",
                    "hover:border-border hover:bg-muted/60",
                    "text-foreground/70 hover:text-foreground"
                  )}
                >
                  <item.icon size={18} className="shrink-0" />
                  <span className="line-clamp-1 text-[10px] leading-tight">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
