type AriaProps = Record<string, string | boolean | undefined>;

/**
 * Merge multiple aria prop objects, with later values overriding earlier ones.
 * Useful for combining default aria props with component-specific overrides.
 */
export function mergeAriaProps(...sources: (AriaProps | undefined | null)[]): AriaProps {
  const result: AriaProps = {};
  for (const source of sources) {
    if (source) {
      Object.assign(result, source);
    }
  }
  return result;
}

/**
 * Common aria attribute sets for reuse.
 */
export const aria = {
  close: { "aria-label": "Fermer" },
  menu: { "aria-label": "Menu" },
  openMenu: { "aria-label": "Ouvrir le menu" },
  closeMenu: { "aria-label": "Fermer le menu" },
  settings: { "aria-label": "Paramètres" },
  search: { "aria-label": "Rechercher" },
  themeToggle: (isDark: boolean) => ({
    "aria-label": `Basculer vers le thème ${isDark ? "clair" : "sombre"}`,
  }),
  orgSwitcher: { "aria-label": "Changer d'organisation" },
  localeSwitcher: { "aria-label": "Changer de langue" },
} as const;
