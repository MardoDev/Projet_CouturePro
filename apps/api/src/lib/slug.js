/// RG4 — slug lisible et URL-safe. Normalisation simple, sans dépendance
/// externe : minuscules, accents retirés, tout ce qui n'est pas
/// alphanumérique devient un tiret, tirets superflus nettoyés.
const COMBINING_DIACRITICS = new RegExp("[̀-ͯ]", "g");

function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = { slugify };
