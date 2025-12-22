import { useEffect, useState } from "react";
import { useLanguageStore } from "../store/languageStore";
import {
  translationService,
  type Language,
} from "../services/translationService";

/**
 * Custom hook for automatic translation
 * Translates any text dynamically based on selected language
 *
 * Usage:
 * const { t } = useTranslation();
 * <h1>{t('Welcome Back!')}</h1>
 * <p>{t('Here is some dynamic text')}</p>
 */
export const useTranslation = () => {
  const language = useLanguageStore((state) => state.language);
  const [translationCache, setTranslationCache] = useState<Map<string, string>>(
    new Map(),
  );

  /**
   * Translate text to current language
   * This function caches translations in component state for instant re-renders
   */
  const t = (text: string | undefined | null): string => {
    // Handle null/undefined
    if (!text) return "";

    // Return as-is for English
    if (language === "en") {
      return text;
    }

    // Check component-level cache first for instant rendering
    const cacheKey = `${text}-${language}`;
    const cached = translationCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Start async translation (will update on next render)
    translationService.translate(text, language).then((translation) => {
      setTranslationCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(cacheKey, translation);
        return newCache;
      });
    });

    // Return original text while translation is in progress
    return text;
  };

  /**
   * Synchronous translation for already cached texts
   * Useful when you need the translation immediately
   */
  const tSync = (text: string): string => {
    if (!text || language === "en") return text;

    const cacheKey = `${text}-${language}`;
    return translationCache.get(cacheKey) || text;
  };

  /**
   * Translate and return a promise (for async operations)
   */
  const tAsync = async (text: string): Promise<string> => {
    if (!text || language === "en") return text;
    return translationService.translate(text, language);
  };

  /**
   * Translate multiple texts at once
   */
  const tBatch = async (texts: string[]): Promise<string[]> => {
    if (language === "en") return texts;
    return translationService.translateBatch(texts, language);
  };

  /**
   * Clear translation cache when language changes
   */
  useEffect(() => {
    setTranslationCache(new Map());
  }, [language]);

  /**
   * Preload common translations when language changes
   */
  useEffect(() => {
    if (language !== "en") {
      translationService.preloadCommonTranslations(language);
    }
  }, [language]);

  return {
    t, // Main translation function (auto-translates any text)
    tSync, // Synchronous translation (only cached)
    tAsync, // Async translation (returns promise)
    tBatch, // Batch translation
    language, // Current language
  };
};

/**
 * Hook for translating on mount (useful for static content)
 */
export const useTranslateOnMount = (texts: string[]) => {
  const { language, tBatch } = useTranslation();
  const [translations, setTranslations] = useState<string[]>(texts);

  useEffect(() => {
    if (language === "en") {
      setTranslations(texts);
    } else {
      tBatch(texts).then(setTranslations);
    }
  }, [language, texts.join(",")]);

  return translations;
};
