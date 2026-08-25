"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import { CodeBlock } from "@/components/dev/CodeBlock";
import { LogoPreview, svgDataUri } from "@/components/dev/LogoPreview";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

/**
 * /dev/logos — dev-only logo design chooser for DataPresent.
 *
 * Shows multiple logo concepts (icon-only + lockup with wordmark),
 * each exportable as raw SVG or ready-to-paste React component.
 *
 * Blocked in production by proxy (/dev/* -> 404) and local notFound() guard.
 */

interface LogoConcept {
  id: string;
  name: string;
  description: string;
  useCases: string[];
  svg: string;
  react: string;
}

const GREEN_DARK = "#1e4d0f";
const GREEN_BRIGHT = "#5cb82a";
const GREEN_LIGHT = "#9edb7b";

const REACT_WRAPPER_NOTE =
  "// Replace the logo content in header.tsx (app-logo-mark + app-logo-text)\n";

const LOGO_CONCEPTS: LogoConcept[] = [
  {
    id: "current",
    name: "Current (reference)",
    description:
      "The current logo: a chart with axes and zigzag data line on a green square. Clean and recognizable, works well at small sizes.",
    useCases: ["Reference"],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" fill="none">
  <rect width="34" height="34" rx="8" fill="${GREEN_DARK}"/>
  <path d="M7 7v20h20" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M11 23l5-10 5 5 5-7" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
    react: `${REACT_WRAPPER_NOTE}
// In header.tsx, the logo is already this SVG.
// Current inline SVG:
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
  <path d="M3 3v18h18" />
  <path d="M7 16l4-8 4 4 4-6" />
</svg>`,
  },
  {
    id: "diamond",
    name: "Diamond Chart",
    description:
      "A diamond-shaped data point on a chart axis. Premium feel, strong geometric identity. Works as favicon and app icon.",
    useCases: ["Favicon", "App icon", "Sidebar"],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" fill="none">
  <rect width="34" height="34" rx="8" fill="${GREEN_DARK}"/>
  <path d="M7 27V7h20" stroke="${GREEN_LIGHT}" stroke-width="2" stroke-linecap="round"/>
  <path d="M17 10l7 7-7 7-7-7z" fill="${GREEN_BRIGHT}"/>
  <path d="M17 14v6" stroke="${GREEN_DARK}" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M14 17h6" stroke="${GREEN_DARK}" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,
    react: `${REACT_WRAPPER_NOTE}
export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 34 34" fill="none" aria-hidden="true" className="w-[34px] h-[34px] flex-shrink-0">
        <rect width="34" height="34" rx="8" fill="${GREEN_DARK}" />
        <path d="M7 27V7h20" stroke="${GREEN_LIGHT}" strokeWidth="2" strokeLinecap="round" />
        <path d="M17 10l7 7-7 7-7-7z" fill="${GREEN_BRIGHT}" />
        <path d="M17 14v6" stroke="${GREEN_DARK}" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 17h6" stroke="${GREEN_DARK}" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="app-logo-text hidden sm:inline">DataPresent</span>
    </span>
  );
}`,
  },
  {
    id: "upward",
    name: "Upward Trend",
    description:
      "An upward-trending arrow inside the green square. Conveys growth, progress, and data-driven insights. Professional and modern.",
    useCases: ["Marketing", "Landing", "OG image"],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" fill="none">
  <rect width="34" height="34" rx="8" fill="${GREEN_DARK}"/>
  <path d="M8 24l7-7 4 4L26 11" stroke="${GREEN_BRIGHT}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M20 11h6v6" stroke="${GREEN_BRIGHT}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
    react: `${REACT_WRAPPER_NOTE}
export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 34 34" fill="none" aria-hidden="true" className="w-[34px] h-[34px] flex-shrink-0">
        <rect width="34" height="34" rx="8" fill="${GREEN_DARK}" />
        <path d="M8 24l7-7 4 4L26 11" stroke="${GREEN_BRIGHT}" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 11h6v6" stroke="${GREEN_BRIGHT}" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="app-logo-text hidden sm:inline">DataPresent</span>
    </span>
  );
}`,
  },
  {
    id: "bars",
    name: "Data Bars",
    description:
      "Three ascending bar chart columns. Universal data/presentation metaphor. Highly readable at 16px favicon size.",
    useCases: ["Favicon", "App icon", "Navbar"],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" fill="none">
  <rect width="34" height="34" rx="8" fill="${GREEN_DARK}"/>
  <rect x="7" y="18" width="5" height="9" rx="1.5" fill="${GREEN_LIGHT}" opacity="0.6"/>
  <rect x="14.5" y="12" width="5" height="15" rx="1.5" fill="${GREEN_BRIGHT}"/>
  <rect x="22" y="7" width="5" height="20" rx="1.5" fill="${GREEN_LIGHT}"/>
</svg>`,
    react: `${REACT_WRAPPER_NOTE}
export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 34 34" fill="none" aria-hidden="true" className="w-[34px] h-[34px] flex-shrink-0">
        <rect width="34" height="34" rx="8" fill="${GREEN_DARK}" />
        <rect x="7" y="18" width="5" height="9" rx="1.5" fill="${GREEN_LIGHT}" opacity="0.6" />
        <rect x="14.5" y="12" width="5" height="15" rx="1.5" fill="${GREEN_BRIGHT}" />
        <rect x="22" y="7" width="5" height="20" rx="1.5" fill="${GREEN_LIGHT}" />
      </svg>
      <span className="app-logo-text hidden sm:inline">DataPresent</span>
    </span>
  );
}`,
  },
];

function MiniIcon({ svg, size }: { svg: string; size: number }) {
  return (
    <img
      src={svgDataUri(svg)}
      alt=""
      aria-hidden="true"
      className="flex-shrink-0"
      style={{ height: size, width: "auto" }}
    />
  );
}

function SmallSizesRow({ svg }: { svg: string }) {
  const panels = [
    { bg: "bg-white", caption: "text-zinc-400", label: "Light" },
    { bg: "bg-[#0a1505]", caption: "text-zinc-500", label: "Dark" },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-t-0 border-border">
      {panels.map((p) => (
        <div
          key={p.label}
          className={`relative flex items-center justify-center gap-3 ${p.bg} py-3 px-3`}
        >
          <MiniIcon svg={svg} size={26} />
          <MiniIcon svg={svg} size={16} />
          <span
            className={`absolute top-1 left-2 text-[9px] font-medium uppercase tracking-wider ${p.caption}`}
          >
            26 / 16 px
          </span>
        </div>
      ))}
    </div>
  );
}

function LogoCard({
  concept,
  index,
  copiedId,
  copy,
}: {
  concept: LogoConcept;
  index: number;
  copiedId: string | null;
  copy: (id: string, value: string) => void;
}) {
  const [tab, setTab] = useState<"svg" | "react">("svg");
  const activeCode = tab === "svg" ? concept.svg : concept.react;
  const copyId = `${concept.id}-${tab}`;

  return (
    <article className="border border-border rounded-xl overflow-hidden bg-surface shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-muted border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            <span className="text-muted-foreground font-mono mr-2">
              #{String(index + 1).padStart(2, "0")}
            </span>
            {concept.name}
          </h3>
          <div className="flex flex-wrap gap-1 justify-end">
            {concept.useCases.map((useCase) => (
              <span
                key={useCase}
                className="text-[10px] font-medium text-muted-foreground bg-border/50 px-2 py-0.5 rounded-full whitespace-nowrap"
              >
                {useCase}
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          {concept.description}
        </p>
      </div>

      {/* Previews */}
      <div className="p-4 space-y-0">
        <LogoPreview svg={concept.svg} size={52} lockup />
        <SmallSizesRow svg={concept.svg} />
      </div>

      {/* Code tabs */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex gap-0.5 rounded-md border border-border bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setTab("svg")}
              className={
                tab === "svg"
                  ? "px-3 py-1 text-xs font-semibold rounded-md bg-surface text-foreground shadow-sm transition-colors"
                  : "px-3 py-1 text-xs font-semibold rounded-md text-muted-foreground hover:text-foreground transition-colors"
              }
              aria-pressed={tab === "svg"}
            >
              SVG
            </button>
            <button
              type="button"
              onClick={() => setTab("react")}
              className={
                tab === "react"
                  ? "px-3 py-1 text-xs font-semibold rounded-md bg-surface text-foreground shadow-sm transition-colors"
                  : "px-3 py-1 text-xs font-semibold rounded-md text-muted-foreground hover:text-foreground transition-colors"
              }
              aria-pressed={tab === "react"}
            >
              React
            </button>
          </div>
        </div>
        <CodeBlock
          label={tab === "svg" ? "logo.svg" : "Logo.tsx"}
          language={tab === "react" ? "TSX" : undefined}
          code={activeCode}
          copied={copiedId === copyId}
          onCopy={() => copy(copyId, activeCode)}
        />
      </div>
    </article>
  );
}

export default function DevLogosPage() {
  const { copiedId, copy } = useCopyToClipboard();

  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header hideAuth />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold bg-red-500 text-white px-2.5 py-1 rounded-md uppercase tracking-wider">
                Dev Only
              </span>
              <h1 className="app-heading app-heading-xl">Logos — DataPresent</h1>
            </div>
            <p className="text-muted-foreground max-w-3xl">
              Logo design concepts, each displayed on light and dark backgrounds at multiple sizes
              (navbar 26px, favicon 16px), exportable as <strong>SVG</strong> or{" "}
              <strong>React component</strong> ready to paste.
            </p>

            {/* Palette */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              {[
                { color: GREEN_DARK, name: "Forest (primary)" },
                { color: GREEN_BRIGHT, name: "Grass (accent)" },
                { color: GREEN_LIGHT, name: "Lime (secondary)" },
              ].map((swatch) => (
                <div key={swatch.color} className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-md border border-border inline-block"
                    style={{ backgroundColor: swatch.color }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-muted-foreground">
                    {swatch.name}{" "}
                    <code className="bg-muted px-1 rounded">{swatch.color}</code>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Concepts */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-16">
            {LOGO_CONCEPTS.map((concept, i) => (
              <LogoCard
                key={concept.id}
                concept={concept}
                index={i}
                copiedId={copiedId}
                copy={(id, value) => void copy(id, value)}
              />
            ))}
          </section>

          {/* Notes */}
          <section className="border-t border-border pt-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Once a logo is chosen
            </h2>
            <div className="bg-surface rounded-xl border border-border p-6 text-sm text-muted-foreground space-y-2">
              <p>
                <span className="font-medium text-foreground">Files to update:</span>{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  components/layout/header.tsx
                </code>{" "}
                (inline SVG),
                <code className="text-xs bg-muted px-1 rounded ml-1">app/favicon.ico</code>,
                <code className="text-xs bg-muted px-1 rounded ml-1">
                  app/[locale]/page.tsx
                </code>{" "}
                (landing),
                <code className="text-xs bg-muted px-1 rounded ml-1">
                  app/[locale]/(auth)/login/page.tsx
                </code>
                ,
                <code className="text-xs bg-muted px-1 rounded ml-1">
                  app/[locale]/(auth)/signup/page.tsx
                </code>
                .
              </p>
              <p>
                <span className="font-medium text-foreground">Palette:</span> Forest{" "}
                <code className="text-xs bg-muted px-1 rounded">#1e4d0f</code> + Grass{" "}
                <code className="text-xs bg-muted px-1 rounded">#5cb82a</code>, Lime{" "}
                <code className="text-xs bg-muted px-1 rounded">#9edb7b</code>.
              </p>
              <p>
                <span className="font-medium text-foreground">Access:</span> this route is blocked
                in production by proxy (
                <code className="text-xs bg-muted px-1 rounded">/dev/*</code> → 404) and a{" "}
                <code className="text-xs bg-muted px-1 rounded">notFound()</code> guard.
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
