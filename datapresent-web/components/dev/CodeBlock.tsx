"use client";

interface CodeBlockProps {
  /** Label shown in the header (e.g. "SVG" or "React Component"). */
  label: string;
  /** Raw code displayed in the block. */
  code: string;
  /** Optional badge on the right of the header. */
  language?: string | undefined;
  /** Whether the copy action already succeeded (shows "Copied!"). */
  copied: boolean;
  /** Called when the copy button is clicked. */
  onCopy: () => void;
}

/**
 * CodeBlock — read-only code display with a copy-to-clipboard button.
 * Used by the dev-only /dev/logos page to expose SVG and React snippets.
 */
export function CodeBlock({ label, code, language, copied, onCopy }: CodeBlockProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-zinc-300">{label}</span>
          {language && (
            <span className="text-[10px] font-mono text-zinc-500 truncate">{language}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className={
            copied
              ? "px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 text-white transition-colors"
              : "px-2.5 py-1 text-xs font-semibold rounded-md bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          }
        >
          {copied ? "\u2713 Copied" : "Copy"}
        </button>
      </div>

      {/* Code */}
      <pre className="max-h-64 overflow-auto p-3 text-xs leading-relaxed text-zinc-200 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}
