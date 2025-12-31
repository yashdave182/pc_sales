/**
 * Automatic Translation Service
 * Provides real-time translation for all text in the application
 * Uses a translation cache to avoid repeated API calls
 */

export type Language = 'en' | 'hi' | 'gu';

interface TranslationCache {
  [key: string]: {
    [lang in Language]?: string;
  };
}

// Translation cache stored in localStorage
const CACHE_KEY = 'translation_cache';
const CACHE_EXPIRY_KEY = 'translation_cache_expiry';
const CACHE_EXPIRY_DAYS = 30;

class TranslationService {
  private cache: TranslationCache = {};
  private pendingTranslations: Map<string, Promise<string>> = new Map();

  constructor() {
    this.loadCache();
  }

  /**
   * Load translation cache from localStorage
   */
  private loadCache(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);

      if (cached && expiry) {
        const expiryDate = new Date(expiry);
        if (expiryDate > new Date()) {
          this.cache = JSON.parse(cached);
        } else {
          this.clearCache();
        }
      }
    } catch (error) {
      console.error('Failed to load translation cache:', error);
    }
  }

  /**
   * Save translation cache to localStorage
   */
  private saveCache(): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + CACHE_EXPIRY_DAYS);
      localStorage.setItem(CACHE_EXPIRY_KEY, expiryDate.toISOString());
    } catch (error) {
      console.error('Failed to save translation cache:', error);
    }
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache = {};
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
  }

  /**
   * Get translation from cache
   */
  private getFromCache(text: string, targetLang: Language): string | null {
    const cacheKey = text.toLowerCase().trim();
    return this.cache[cacheKey]?.[targetLang] || null;
  }

  /**
   * Store translation in cache
   */
  private storeInCache(text: string, targetLang: Language, translation: string): void {
    const cacheKey = text.toLowerCase().trim();

    if (!this.cache[cacheKey]) {
      this.cache[cacheKey] = {};
    }

    this.cache[cacheKey][targetLang] = translation;
    this.saveCache();
  }

  /**
   * Translate text using MyMemory Translation API (Free, no API key needed)
   */
  private async translateWithAPI(text: string, targetLang: Language): Promise<string> {
    const sourceLang = 'en';

    // Map language codes
    const langMap: { [key in Language]: string } = {
      en: 'en',
      hi: 'hi',
      gu: 'gu',
    };

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${langMap[targetLang]}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        return data.responseData.translatedText;
      }

      throw new Error('Translation failed');
    } catch (error) {
      console.error('Translation API error:', error);
      // Fallback to original text
      return text;
    }
  }

  /**
   * Translate text with local dictionary fallback
   */
  private translateWithDictionary(text: string, targetLang: Language): string {
    const commonTranslations: { [key: string]: { [lang in Language]?: string } } = {
      // Common UI words
      'dashboard': { hi: 'डैशबोर्ड', gu: 'ડેશબોર્ડ' },
      'customers': { hi: 'ग्राहक', gu: 'ગ્રાહકો' },
      'sales': { hi: 'बिक्री', gu: 'વેચાણ' },
      'payments': { hi: 'भुगतान', gu: 'ચૂકવણી' },
      'demos': { hi: 'डेमो', gu: 'પ્રદર્શન' },
      'distributors': { hi: 'वितरक', gu: 'વિતરણકર્તાઓ' },
      'reports': { hi: 'रिपोर्ट', gu: 'અહેવાલો' },
      'data import': { hi: 'डेटा आयात', gu: 'ડેટા આયાત' },

      // Actions
      'add': { hi: 'जोड़ें', gu: 'ઉમેરો' },
      'edit': { hi: 'संपादित करें', gu: 'સંપાદિત કરો' },
      'delete': { hi: 'हटाएं', gu: 'કાઢી નાખો' },
      'save': { hi: 'सहेजें', gu: 'સંગ્રહ કરો' },
      'cancel': { hi: 'रद्द करें', gu: 'રદ્દ કરો' },
      'search': { hi: 'खोजें', gu: 'શોધો' },
      'refresh': { hi: 'रीफ्रेश करें', gu: 'તાજું કરો' },
      'loading': { hi: 'लोड हो रहा है...', gu: 'લોડ થઈ રહ્યું છે...' },

      // Dashboard
      'welcome back!': { hi: 'स्वागत है!', gu: 'સ્વાગત છે!' },
      "here's what's happening with your sales today": {
        hi: 'आज आपकी बिक्री में क्या हो रहा है',
        gu: 'આજે તમારા વેચાણમાં શું થઈ રહ્યું છે'
      },
      'add customer': { hi: 'ग्राहक जोड़ें', gu: 'ગ્રાહક ઉમેરો' },
      'register new customer': { hi: 'नया ग्राहक पंजीकृत करें', gu: 'નવા ગ્રાહકની નોંધણી કરો' },
      'new sale': { hi: 'नई बिक्री', gu: 'નવું વેચાણ' },
      'create invoice': { hi: 'चालान बनाएं', gu: 'ઇન્વોઇસ બનાવો' },
      'schedule demo': { hi: 'डेमो शेड्यूल करें', gu: 'ડેમો સમયબદ્ધ કરો' },
      'book product demo': { hi: 'उत्पाद डेमो बुक करें', gu: 'ઉત્પાદન ડેમો બુક કરો' },
      'record payment': { hi: 'भुगतान रिकॉर्ड करें', gu: 'ચૂકવણી રેકોર્ડ કરો' },
      'collect payment': { hi: 'भुगतान एकत्र करें', gu: 'ચૂકવણી એકત્રિત કરો' },

      // Metrics
      'total sales': { hi: 'कुल बिक्री', gu: 'કુલ વેચાણ' },
      'pending payments': { hi: 'लंबित भुगतान', gu: 'બાકી ચૂકવણી' },
      'total customers': { hi: 'कुल ग्राहक', gu: 'કુલ ગ્રાહકો' },
      'demo conversion': { hi: 'डेमो रूपांतरण', gu: 'ડેમો રૂપાંતર' },
      'transactions': { hi: 'लेनदेन', gu: 'વ્યવહારો' },
      'outstanding amount': { hi: 'बकाया राशि', gu: 'બાકી રકમ' },
      'active customers': { hi: 'सक्रिय ग्राहक', gu: 'સક્રિય ગ્રાહકો' },
      'conversion rate': { hi: 'रूपांतरण दर', gu: 'રૂપાંતર દર' },

      // Charts
      'sales trend (last 30 days)': { hi: 'बिक्री प्रवृत्ति (पिछले 30 दिन)', gu: 'વેચાણ વલણ (છેલ્લા 30 દિવસ)' },
      'payment status': { hi: 'भुगतान स्थिति', gu: 'ચૂકવણી સ્થિતિ' },

      // Fields
      'name': { hi: 'नाम', gu: 'નામ' },
      'mobile': { hi: 'मोबाइल', gu: 'મોબાઈલ' },
      'village': { hi: 'गांव', gu: 'ગામ' },
      'taluka': { hi: 'तालुका', gu: 'તાલુકો' },
      'district': { hi: 'जिला', gu: 'જિલ્લો' },
      'status': { hi: 'स्थिति', gu: 'સ્થિતિ' },
      'amount': { hi: 'राशि', gu: 'રકમ' },
      'date': { hi: 'तारीख', gu: 'તારીખ' },

      // Status
      'active': { hi: 'सक्रिय', gu: 'સક્રિય' },
      'inactive': { hi: 'निष्क्रिय', gu: 'નિષ્ક્રિય' },
      'pending': { hi: 'लंबित', gu: 'બાકી' },
      'completed': { hi: 'पूर्ण', gu: 'પૂર્ણ' },
      'cancelled': { hi: 'रद्द', gu: 'રદ્દ' },
    };

    const lowerText = text.toLowerCase().trim();
    const translation = commonTranslations[lowerText]?.[targetLang];

    return translation || text;
  }

  /**
   * Main translation method
   */
  async translate(text: string, targetLang: Language): Promise<string> {
    // If target language is English, return as-is
    if (targetLang === 'en') {
      return text;
    }

    // Return empty strings as-is
    if (!text || text.trim() === '') {
      return text;
    }

    // Check cache first
    const cached = this.getFromCache(text, targetLang);
    if (cached) {
      return cached;
    }

    // Try dictionary translation for common terms
    const dictionaryTranslation = this.translateWithDictionary(text, targetLang);
    if (dictionaryTranslation !== text) {
      this.storeInCache(text, targetLang, dictionaryTranslation);
      return dictionaryTranslation;
    }

    // Check if translation is already in progress
    const cacheKey = `${text}-${targetLang}`;
    if (this.pendingTranslations.has(cacheKey)) {
      return this.pendingTranslations.get(cacheKey)!;
    }

    // Translate with API
    const translationPromise = this.translateWithAPI(text, targetLang)
      .then((translation) => {
        this.storeInCache(text, targetLang, translation);
        this.pendingTranslations.delete(cacheKey);
        return translation;
      })
      .catch((error) => {
        console.error('Translation failed:', error);
        this.pendingTranslations.delete(cacheKey);
        return text; // Return original text on error
      });

    this.pendingTranslations.set(cacheKey, translationPromise);
    return translationPromise;
  }

  /**
   * Translate multiple texts at once
   */
  async translateBatch(texts: string[], targetLang: Language): Promise<string[]> {
    const promises = texts.map(text => this.translate(text, targetLang));
    return Promise.all(promises);
  }

  /**
   * Preload common translations
   */
  async preloadCommonTranslations(targetLang: Language): Promise<void> {
    const commonTexts = [
      'Dashboard', 'Customers', 'Sales', 'Payments', 'Demos', 'Distributors',
      'Reports', 'Data Import', 'Add', 'Edit', 'Delete', 'Save', 'Cancel',
      'Total Sales', 'Total Customers', 'Total Payments', 'Pending Demos',
      'Welcome Back!', 'Add Customer', 'New Sale', 'Schedule Demo', 'Record Payment'
    ];

    await this.translateBatch(commonTexts, targetLang);
  }
}

// Export singleton instance
export const translationService = new TranslationService();

// Export convenience function
export const autoTranslate = (text: string, targetLang: Language): Promise<string> => {
  return translationService.translate(text, targetLang);
};
