"use client";

interface LogoPreviewProps {
  /** Raw SVG markup for the logo icon (rendered via data: URI). */
  svg: string;
  /** Display height of the icon in px (width follows the viewBox ratio). */
  size?: number;
  /** When true, renders the "DataPresent" wordmark beside the icon. */
  lockup?: boolean;
  /** Wordmark text (defaults to "DataPresent"). */
  wordmark?: string;
}

/**
 * Renders a developer-authored SVG string as an <img> data URI.
 * Safe by construction: input is a compile-time constant from the dev-only
 * logos page (never user input), and `data:` URIs are explicitly allowed
 * by the app CSP (`img-src ... data: blob:`).
 */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * LogoPreview — renders a logo SVG side-by-side on light and dark
 * backgrounds, so contrast can be judged in both themes at a glance.
 */
export function LogoPreview({
  svg,
  size = 64,
  lockup = false,
  wordmark = "DataPresent",
}: LogoPreviewProps) {
  const icon = (
    <img
      src={svgDataUri(svg)}
      alt=""
      aria-hidden="true"
      className="flex-shrink-0"
      style={{ height: size, width: "auto" }}
    />
  );

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border">
      {/* Light background */}
      <div className="relative flex items-center justify-center gap-3 bg-white py-8 px-3 min-h-[120px]">
        <span className="absolute top-1.5 left-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Light
        </span>
        {icon}
        {lockup && (
          <span
            className="text-xl font-bold text-[#1e4d0f]"
            style={{ fontFamily: "var(--font-fraunces), Fraunces, serif" }}
          >
            {wordmark}
          </span>
        )}
      </div>

      {/* Dark background */}
      <div className="relative flex items-center justify-center gap-3 bg-[#0a1505] py-8 px-3 min-h-[120px]">
        <span className="absolute top-1.5 left-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Dark
        </span>
        {icon}
        {lockup && (
          <span
            className="text-xl font-bold text-[#e8f5df]"
            style={{ fontFamily: "var(--font-fraunces), Fraunces, serif" }}
          >
            {wordmark}
          </span>
        )}
      </div>
    </div>
  );
}
