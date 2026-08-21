// Audit i18n: find missing translation keys by scanning useTranslations + t() calls.
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DIRS = ["app", "components"];
const MESSAGES = {
  fr: JSON.parse(fs.readFileSync(path.join(ROOT, "messages/fr.json"), "utf8")),
  en: JSON.parse(fs.readFileSync(path.join(ROOT, "messages/en.json"), "utf8")),
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.test\.|\.spec\./.test(e.name)) out.push(p);
  }
  return out;
}

const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const missing = new Map(); // locale -> Set(key)

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  // Find namespaces: const t = useTranslations("ns") or getTranslations("ns")
  const nsMatches = [
    ...src.matchAll(/(?:useTranslations|getTranslations)\(\s*["'`]([^"'`]+)["'`]\s*\)/g),
  ];
  // Root translator: const t = useTranslations() -> keys are absolute
  const hasRootT = /(?:useTranslations|getTranslations)\(\s*\)/.test(src);

  // Collect t("key") / t('key') calls
  const tCalls = [...src.matchAll(/\bt\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);

  const namespaces = nsMatches.map((m) => m[1]);
  for (const key of tCalls) {
    if (key.includes("${")) continue; // dynamic template keys - skip
    let fullKey;
    if (hasRootT && namespaces.length === 0) {
      fullKey = key;
    } else if (namespaces.length > 0) {
      // assume first namespace is the primary one for this file
      fullKey = namespaces[0] + "." + key;
    } else continue;

    // skip keys that already start with a known top-level ns when root t used with dotted path
    for (const locale of Object.keys(MESSAGES)) {
      const parts = fullKey.split(".");
      let node = MESSAGES[locale];
      let ok = true;
      for (const part of parts) {
        if (node && typeof node === "object" && part in node) node = node[part];
        else {
          ok = false;
          break;
        }
      }
      if (!ok) {
        if (!missing.has(locale)) missing.set(locale, new Set());
        missing.get(locale).add(fullKey);
      }
    }
  }
}

for (const [locale, keys] of missing) {
  console.log(`\n=== MISSING in ${locale} (${keys.size}) ===`);
  [...keys].sort().forEach((k) => console.log(" ", k));
}
if (missing.size === 0) console.log("No missing keys found.");
