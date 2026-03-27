/* ---------------------------------------------------
   i18n: lightweight internationalization

   Usage:
   - Add data-i18n="key" to any element for text content
   - Add data-i18n-html="key" to any element for HTML content
   - Translations are loaded from lang/[code].json
   - Language preference is saved in localStorage
   --------------------------------------------------- */

const I18N = {
  current: null,
  cache: {},
  defaultLang: "en",
  supportedLangs: ["en"],

  /* Detect initial language: saved > browser > default */
  detect() {
    const saved = localStorage.getItem("kharos-lang");
    if (saved && this.supportedLangs.includes(saved)) return saved;

    const browser = (navigator.language || "").slice(0, 2);
    if (this.supportedLangs.includes(browser)) return browser;

    return this.defaultLang;
  },

  /* Fetch and cache a language file */
  async load(lang) {
    if (this.cache[lang]) return this.cache[lang];

    try {
      const res = await fetch(`lang/${lang}.json`);
      const data = await res.json();
      this.cache[lang] = data;
      return data;
    } catch (e) {
      console.warn(`i18n: could not load lang/${lang}.json`, e);
      return null;
    }
  },

  /* Apply translations to the DOM */
  apply(translations) {
    if (!translations) return;

    // Text content
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (translations[key] !== undefined) {
        el.textContent = translations[key];
      }
    });

    // HTML content (for elements with <br>, <span>, etc.)
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (translations[key] !== undefined) {
        el.innerHTML = translations[key];
      }
    });

    // Update page title and meta
    const meta = translations._meta;
    if (meta) {
      const isSpot = document.body.hasAttribute("data-page") && document.body.getAttribute("data-page") === "spot";
      const titleKey = isSpot ? "title_spot" : "title_home";
      const descKey = isSpot ? "description_spot" : "description_home";

      if (meta[titleKey]) document.title = meta[titleKey];

      const descTag = document.querySelector('meta[name="description"]');
      if (descTag && meta[descKey]) descTag.setAttribute("content", meta[descKey]);
    }

    // Update html lang attribute
    document.documentElement.setAttribute("lang", this.current);

    // Update toggle button text
    const toggleBtn = document.getElementById("langToggle");
    if (toggleBtn) {
      toggleBtn.textContent = this.current === "en" ? "FR" : "EN";
    }
  },

  /* Switch to a language */
  async setLang(lang) {
    if (!this.supportedLangs.includes(lang)) return;
    this.current = lang;
    localStorage.setItem("kharos-lang", lang);
    const translations = await this.load(lang);
    this.apply(translations);
  },

  /* Toggle between languages */
  toggle() {
    const next = this.current === "en" ? "fr" : "en";
    this.setLang(next);
  },

  /* Initialize */
  async init() {
    this.current = this.detect();
    const translations = await this.load(this.current);
    this.apply(translations);

    // Bind toggle button
    const toggleBtn = document.getElementById("langToggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => this.toggle());
    }
  },
};

// Auto-init when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => I18N.init());
} else {
  I18N.init();
}
