import { useLanguageStore } from '../store/languageStore';
import { t, getFieldTranslation, camelCaseToTitleCase } from '../i18n/i18n';

/**
 * Custom hook for translation
 * Automatically uses the current language from the store
 * Returns a translate function that takes a key and returns the translated string
 */
export const useTranslation = () => {
  const language = useLanguageStore((state) => state.language);

  return {
    t: (key: string) => t(key, language),
    language,
    getFieldTranslation: (fieldName: string) => getFieldTranslation(fieldName, language),
    camelCaseToTitleCase,
  };
};
