import { useEffect, useState, ReactNode } from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface TranslatedTextProps {
  children: ReactNode;
  fallback?: string;
}

/**
 * Component that automatically translates its text content
 *
 * Usage:
 * <TranslatedText>Welcome Back!</TranslatedText>
 * <TranslatedText>Add Customer</TranslatedText>
 */
export const TranslatedText = ({ children, fallback = '' }: TranslatedTextProps) => {
  const { tAsync, language } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const text = children?.toString() || fallback;

    if (!text) {
      setTranslatedText('');
      return;
    }

    if (language === 'en') {
      setTranslatedText(text);
      return;
    }

    setIsTranslating(true);
    tAsync(text)
      .then((translation) => {
        setTranslatedText(translation);
        setIsTranslating(false);
      })
      .catch(() => {
        setTranslatedText(text);
        setIsTranslating(false);
      });
  }, [children, language, fallback, tAsync]);

  // Show original text while translating
  if (isTranslating && !translatedText) {
    return <>{children || fallback}</>;
  }

  return <>{translatedText || children || fallback}</>;
};

/**
 * Higher-order component to wrap text nodes with automatic translation
 */
export const withAutoTranslation = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => {
    const { t } = useTranslation();

    // Intercept and translate string props
    const translatedProps = Object.entries(props).reduce((acc, [key, value]) => {
      if (typeof value === 'string' && value.trim()) {
        acc[key] = t(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    return <Component {...translatedProps} />;
  };
};

/**
 * Component for translating dynamic values
 */
interface DynamicTranslationProps {
  text: string;
  values?: Record<string, string | number>;
}

export const DynamicTranslation = ({ text, values = {} }: DynamicTranslationProps) => {
  const { tAsync, language } = useTranslation();
  const [translatedText, setTranslatedText] = useState(text);

  useEffect(() => {
    if (language === 'en') {
      setTranslatedText(text);
      return;
    }

    tAsync(text).then((translation) => {
      // Replace placeholders with values
      let result = translation;
      Object.entries(values).forEach(([key, value]) => {
        result = result.replace(`{${key}}`, value.toString());
      });
      setTranslatedText(result);
    });
  }, [text, language, values, tAsync]);

  return <>{translatedText}</>;
};

export default TranslatedText;
