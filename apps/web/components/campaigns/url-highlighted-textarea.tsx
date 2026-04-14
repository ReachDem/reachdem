"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UrlHighlightedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

interface DetectedUrl {
  url: string;
  start: number;
  end: number;
  isSecure: boolean;
}

export function UrlHighlightedTextarea({
  value,
  onChange,
  disabled = false,
  placeholder,
  className,
  id,
}: UrlHighlightedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [detectedUrls, setDetectedUrls] = useState<DetectedUrl[]>([]);

  useEffect(() => {
    detectCompleteUrls(value);
  }, [value]);

  // Sync scroll between textarea and highlight layer
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const detectCompleteUrls = (text: string) => {
    // Detect URLs followed by space or at end of text
    const urlPattern =
      /((?:https?:\/\/|www\.|[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,})(?:[^\s]*))/g;

    const urls: DetectedUrl[] = [];
    let match;

    while ((match = urlPattern.exec(text)) !== null) {
      const url = match[1];
      const start = match.index;
      const end = start + url.length;

      // Check if it's followed by space or end of string (complete URL)
      const isComplete = end === text.length || /\s/.test(text[end]);

      if (isComplete) {
        const isHttp = url.startsWith("http://");
        const isHttps = url.startsWith("https://");

        urls.push({
          url,
          start,
          end,
          isSecure: !isHttp, // Only HTTP is insecure, everything else is secure
        });
      }
    }

    setDetectedUrls(urls);
  };

  const renderHighlightedText = () => {
    if (detectedUrls.length === 0) {
      return <span className="whitespace-pre-wrap">{value}</span>;
    }

    let lastIndex = 0;
    const parts: React.ReactNode[] = [];

    detectedUrls.forEach((urlInfo, index) => {
      // Add text before URL
      if (urlInfo.start > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {value.substring(lastIndex, urlInfo.start)}
          </span>
        );
      }

      // Add highlighted URL
      const urlElement = (
        <span
          key={`url-${index}`}
          className={cn(
            "rounded-sm px-1 py-0.5",
            urlInfo.isSecure
              ? "bg-blue-500/20 text-blue-600 dark:bg-blue-500/30 dark:text-blue-400"
              : "bg-red-500/20 text-red-600 dark:bg-red-500/30 dark:text-red-400"
          )}
        >
          {urlInfo.url}
        </span>
      );

      if (!urlInfo.isSecure) {
        parts.push(
          <span
            key={`url-wrapper-${index}`}
            className="inline-flex items-center gap-1"
          >
            {urlElement}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="inline h-3 w-3 text-red-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Ce lien n'est pas protégé (HTTP). Utilisez HTTPS.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        );
      } else {
        parts.push(urlElement);
      }

      lastIndex = urlInfo.end;
    });

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(<span key="text-end">{value.substring(lastIndex)}</span>);
    }

    return <span className="whitespace-pre-wrap">{parts}</span>;
  };

  return (
    <div className="relative">
      {/* Hidden highlight layer */}
      <div
        ref={highlightRef}
        className={cn(
          "pointer-events-none absolute inset-0 overflow-auto rounded-md border border-transparent px-3 py-2 text-sm leading-normal break-words whitespace-pre-wrap",
          className
        )}
        style={{
          color: "transparent",
          caretColor: "transparent",
        }}
      >
        {renderHighlightedText()}
      </div>

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        disabled={disabled}
        placeholder={placeholder}
        className={cn("caret-foreground relative bg-transparent", className)}
        style={{
          color: "inherit",
        }}
      />
    </div>
  );
}
