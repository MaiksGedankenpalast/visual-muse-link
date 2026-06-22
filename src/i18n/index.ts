import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";

const STORAGE_KEY = "mindark.lang";
const initialLang =
  (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY)) || "de";

i18n.use(initReactI18next).init({
  lng: initialLang,
  fallbackLng: "de",
  resources: {
    en: { translation: en as Record<string, string> },
    de: { translation: {} },
  },
  interpolation: { escapeValue: false },
  // Use natural German strings as keys
  keySeparator: false,
  nsSeparator: false,
  // When a key has no translation, return the key itself (= German default)
  parseMissingKeyHandler: (key) => key,
  returnEmptyString: false,
});

export const setLang = (lang: "de" | "en") => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }
  i18n.changeLanguage(lang);
};

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLang;
}

export default i18n;