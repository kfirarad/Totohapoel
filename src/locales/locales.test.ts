import { test, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Every key must exist in every language. Plural forms differ per language (Hebrew has _two,
// English doesn't), so keys are compared with their plural suffix stripped.
const dir = import.meta.dir;
const languages = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const namespaces = [...new Set(languages.flatMap((lng) => readdirSync(join(dir, lng)).filter((f) => f.endsWith(".json"))))];

const PLURAL = /_(zero|one|two|few|many|other)$/;

const keysOf = (value: unknown, prefix = ""): string[] =>
  value && typeof value === "object"
    ? Object.entries(value).flatMap(([k, v]) => keysOf(v, prefix ? `${prefix}.${k}` : k))
    : [prefix.replace(PLURAL, "")];

const load = (lng: string, ns: string): Set<string> => {
  try {
    return new Set(keysOf(JSON.parse(readFileSync(join(dir, lng, ns), "utf8"))));
  } catch {
    return new Set();
  }
};

test("there are at least two languages", () => {
  expect(languages).toContain("he");
  expect(languages).toContain("en");
});

for (const ns of namespaces) {
  test(`${ns}: every language has the same keys`, () => {
    const byLanguage = Object.fromEntries(languages.map((lng) => [lng, load(lng, ns)]));
    const all = new Set(Object.values(byLanguage).flatMap((keys) => [...keys]));
    const missing = Object.fromEntries(
      languages.map((lng) => [lng, [...all].filter((k) => !byLanguage[lng].has(k)).sort()])
    );
    expect(missing).toEqual(Object.fromEntries(languages.map((lng) => [lng, []])));
  });
}

test("plural keys always have an _other form", () => {
  for (const lng of languages) {
    for (const ns of namespaces) {
      const raw = (() => {
        try {
          return JSON.parse(readFileSync(join(dir, lng, ns), "utf8"));
        } catch {
          return {};
        }
      })();
      const flat = (value: unknown, prefix = ""): string[] =>
        value && typeof value === "object"
          ? Object.entries(value).flatMap(([k, v]) => flat(v, prefix ? `${prefix}.${k}` : k))
          : [prefix];
      const keys = new Set(flat(raw));
      for (const key of keys) {
        if (PLURAL.test(key)) expect(keys.has(key.replace(PLURAL, "_other")), `${lng}/${ns}: ${key}`).toBe(true);
      }
    }
  }
});
