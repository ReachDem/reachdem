"use client";

import { useState, useRef } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Wand2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

// Type for Monaco editor instance
type MonacoEditor = Parameters<
  NonNullable<React.ComponentProps<typeof Editor>["onMount"]>
>[0];

interface CodeEditorWithFormatProps {
  value: string;
  onChange: (value: string) => void;
  language: "html" | "tsx";
  placeholder?: string;
  disabled?: boolean;
}

export function CodeEditorWithFormat({
  value,
  onChange,
  language,
  placeholder,
  disabled = false,
}: CodeEditorWithFormatProps) {
  const [isFormatting, setIsFormatting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const handleEditorDidMount = (editor: MonacoEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const handleFormat = async () => {
    if (!value || value.trim().length === 0) {
      toast.error("No code to format");
      return;
    }

    if (!editorRef.current) {
      toast.error("Editor not ready");
      return;
    }

    setIsFormatting(true);
    try {
      // Use Monaco's built-in formatter
      await editorRef.current.getAction("editor.action.formatDocument")?.run();
      toast.success("Code formatted successfully");
    } catch (error) {
      console.error("Format error:", error);
      toast.error("Failed to format code");
    } finally {
      setIsFormatting(false);
    }
  };

  const handleCopy = async () => {
    if (!value || value.trim().length === 0) {
      toast.error("No code to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  const monacoLanguage = language === "tsx" ? "typescript" : "html";

  return (
    <div className="space-y-2">
      {/* Header with actions */}
      <div className="border-input bg-muted/50 flex items-center justify-between rounded-t-md border border-b-0 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium uppercase">
            {language}
          </span>
          <span className="text-muted-foreground text-xs">
            {value.length} characters
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            disabled={disabled || isFormatting || !value}
            className="h-7 gap-1.5 px-2 text-xs"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {isFormatting ? "Formatting..." : "Format"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={disabled || !value}
            className="h-7 gap-1.5 px-2 text-xs"
          >
            {isCopied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="border-input overflow-hidden rounded-b-md border">
        <Editor
          height="400px"
          language={monacoLanguage}
          value={value}
          onChange={(newValue) => onChange(newValue || "")}
          onMount={handleEditorDidMount}
          theme="vs-light"
          options={{
            readOnly: disabled,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            wrappingIndent: "indent",
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: false,
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            glyphMargin: false,
            padding: { top: 10, bottom: 10 },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            snippetSuggestions: "inline",
          }}
          loading={
            <div className="flex h-[400px] items-center justify-center">
              <div className="text-muted-foreground text-sm">
                Loading editor...
              </div>
            </div>
          }
        />
      </div>

      <div className="flex items-center justify-between">
        {placeholder && !value && (
          <p className="text-muted-foreground text-xs">{placeholder}</p>
        )}
        <p className="text-muted-foreground text-xs">
          Press{" "}
          <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs">
            Shift+Alt+F
          </kbd>{" "}
          to format code
        </p>
      </div>
    </div>
  );
}
