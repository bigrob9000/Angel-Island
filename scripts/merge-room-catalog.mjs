import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const messagesDir = join(root, "messages");

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
    cursor[parts[parts.length - 1]] = value;
  }
  return result;
}

const en = JSON.parse(readFileSync(join(messagesDir, "en.json"), "utf8"));
const enFlat = flatten(en);
const catalogOverrides = JSON.parse(
  readFileSync(join(messagesDir, "room-catalog-overrides.json"), "utf8"),
);

for (const locale of Object.keys(catalogOverrides)) {
  const localePath = join(messagesDir, `${locale}.json`);
  const localeData = JSON.parse(readFileSync(localePath, "utf8"));
  const localeFlat = flatten(localeData);

  for (const [path, enValue] of Object.entries(enFlat)) {
    if (!path.startsWith("rooms.catalog.")) continue;
    if (path in localeFlat) continue;
    localeFlat[path] = catalogOverrides[locale][path] ?? enValue;
  }

  writeFileSync(localePath, `${JSON.stringify(unflatten(localeFlat), null, 2)}\n`, "utf8");
  console.log(`Updated ${locale}.json catalog`);
}

// Fill catalog for other locales from English
for (const file of ["ar", "hi", "it", "ja", "ko", "nl", "pl", "pt", "ru", "tr", "zh"]) {
  const localePath = join(messagesDir, `${file}.json`);
  const localeData = JSON.parse(readFileSync(localePath, "utf8"));
  const localeFlat = flatten(localeData);

  for (const [path, enValue] of Object.entries(enFlat)) {
    if (!path.startsWith("rooms.catalog.")) continue;
    if (path in localeFlat) continue;
    localeFlat[path] = enValue;
  }

  writeFileSync(localePath, `${JSON.stringify(unflatten(localeFlat), null, 2)}\n`, "utf8");
  console.log(`Updated ${file}.json catalog (en fallback)`);
}

console.log("Done.");
