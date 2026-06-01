/**
 * Chart color helpers that read CSS custom properties.
 * Ensures chart colors adapt to light/dark theme automatically.
 */

const CHART_VAR_KEYS = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--chart-6",
];

/**
 * Return the array of chart colors by reading CSS custom properties
 * from the document root. Falls back to --chart-N defined in globals.css.
 */
export function getChartColors(): string[] {
  if (typeof document === "undefined") {
    // SSR / build-time fallback
    return ["#7AC94A", "#5CB82A", "#2E6E18", "#9EDB7B", "#E8F5DF", "#6366f1"];
  }

  const style = getComputedStyle(document.documentElement);
  return CHART_VAR_KEYS.map((key) => style.getPropertyValue(key).trim() || getFallback(key));
}

function getFallback(varKey: string): string {
  const fallbacks: Record<string, string> = {
    "--chart-1": "#7AC94A",
    "--chart-2": "#5CB82A",
    "--chart-3": "#2E6E18",
    "--chart-4": "#9EDB7B",
    "--chart-5": "#E8F5DF",
    "--chart-6": "#6366f1",
  };
  return fallbacks[varKey] || "#6366f1";
}
