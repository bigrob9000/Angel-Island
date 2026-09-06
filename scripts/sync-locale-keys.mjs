/**
 * Merge new translation keys from en.json into each locale file.
 * Existing locale strings are preserved; only missing keys are filled from overrides or en.
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const messagesDir = join(root, "messages");

function deepMerge(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], value);
    } else if (!(key in result)) {
      result[key] = value;
    }
  }
  return result;
}

function flatten(obj, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

function unflatten(flat) {
  const result = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split(".");
    let cursor = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (cursor[part] !== undefined && typeof cursor[part] !== "object") {
        cursor[part] = { title: cursor[part] };
      }
      cursor[part] ??= {};
      cursor = cursor[part];
    }
    const leaf = parts[parts.length - 1];
    if (cursor[leaf] !== undefined && typeof cursor[leaf] === "object" && typeof value === "string") {
      cursor[leaf].title ??= value;
      continue;
    }
    cursor[leaf] = value;
  }
  return result;
}

const en = JSON.parse(readFileSync(join(messagesDir, "en.json"), "utf8"));
const enFlat = flatten(en);

const overridesPath = join(messagesDir, "locale-overrides.json");
const overrides = JSON.parse(readFileSync(overridesPath, "utf8"));

for (const file of readdirSync(messagesDir).filter((f) => f.endsWith(".json") && f !== "en.json" && !f.includes("patch") && f !== "locale-overrides.json")) {
  const locale = file.replace(".json", "");
  const localePath = join(messagesDir, file);
  const localeData = JSON.parse(readFileSync(localePath, "utf8"));
  const localeFlat = flatten(localeData);
  const localeOverrides = overrides[locale] ?? {};

  for (const [path, enValue] of Object.entries(enFlat)) {
    if (path in localeFlat) continue;
    localeFlat[path] = localeOverrides[path] ?? enValue;
  }

  writeFileSync(localePath, `${JSON.stringify(unflatten(localeFlat), null, 2)}\n`, "utf8");
  console.log(`Updated ${file}`);
}

console.log("Done.");
