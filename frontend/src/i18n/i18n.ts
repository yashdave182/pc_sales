import en from "./en.json";
import hi from "./hi.json";
import gu from "./gu.json";

export type Language = "en" | "hi" | "gu";

export const languages: Record<Language, string> = {
  en: "English",
  hi: "हिंदी",
  gu: "ગુજરાતી",
};

export const translations: Record<Language, any> = {
  en,
  hi,
  gu,
};

/**
 * Get translation value from nested object using dot notation
 * Example: "dashboard.title" or "common.save"
 * Falls back to English if key not found in specified language
 * Falls back to key itself if not found in English either
 */
export const getTranslation = (key: string, language: Language): string => {
  const parts = key.split(".");
  let current: any = translations[language];

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      // If translation not found, try English as fallback
      if (language !== "en") {
        return getTranslation(key, "en");
      }
      // If still not found, return the key itself
      return key;
    }
  }

  return typeof current === "string" ? current : key;
};

/**
 * Convert camelCase field name to i18n key and translate
 * Example: "customerName" -> looks for "fields.customerName"
 * Falls back to converting camelCase to Title Case if not found
 */
export const getFieldTranslation = (
  fieldName: string,
  language: Language,
): string => {
  const fieldKey = `fields.${fieldName}`;
  const translation = getTranslation(fieldKey, language);

  if (translation !== fieldKey) {
    return translation;
  }

  // If not found in translations, convert camelCase to Title Case
  return camelCaseToTitleCase(fieldName);
};

/**
 * Convert camelCase to Title Case
 * Example: "customerName" -> "Customer Name"
 */
export const camelCaseToTitleCase = (str: string): string => {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
};

/**
 * Main translation function - use throughout the app
 * Supports:
 * - Dot notation: t("dashboard.title", language)
 * - Field names: t("customerName", language) - auto-converts to field translation
 * - Fallback: Returns key if translation not found
 */
export const t = (key: string, language: Language): string => {
  if (!key.includes(".")) {
    const fieldTranslation = getFieldTranslation(key, language);
    if (fieldTranslation !== camelCaseToTitleCase(key)) {
      return fieldTranslation;
    }
    // Try as direct key too
    const directTranslation = getTranslation(key, language);
    if (directTranslation !== key) {
      return directTranslation;
    }
    return fieldTranslation;
  }

  return getTranslation(key, language);
};
