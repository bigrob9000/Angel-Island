/**
 * One-off helper: merge i18n patch into en.json (run with: node scripts/build-en-json.mjs)
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const enPath = join(root, "messages", "en.json");
const patchPath = join(root, "messages", "en.patch.json");

const en = JSON.parse(readFileSync(enPath, "utf8"));
const patch = JSON.parse(readFileSync(patchPath, "utf8"));

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object"
    ) {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

writeFileSync(enPath, `${JSON.stringify(deepMerge(en, patch), null, 2)}\n`, "utf8");
console.log("Merged en.patch.json into en.json");
