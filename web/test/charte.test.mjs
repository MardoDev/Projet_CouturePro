import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const configPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "tailwind.config.ts",
);

test("la charte C.D.P (couleurs + polices) est centralisée dans tailwind.config.ts", async () => {
  const config = await readFile(configPath, "utf8");

  for (const color of ["#E8A898", "#C97D6A", "#C9A46A", "#FDF6F0"]) {
    assert.match(
      config,
      new RegExp(color, "i"),
      `couleur de charte manquante: ${color}`,
    );
  }

  assert.match(config, /Georgia/, "police de titre (Georgia) manquante");
  assert.match(config, /Calibri/, "police de corps (Calibri) manquante");
});
