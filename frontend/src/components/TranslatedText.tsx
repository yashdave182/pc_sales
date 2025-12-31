import { ReactNode } from "react";
import { useTranslation } from "../hooks/useTranslation";

interface TranslatedTextProps {
  /**
   * Translation key from JSON files (e.g., 'nav.dashboard', 'common.add')
   */
  tKey?: string;
  /**
   * Raw text content (will be used as-is without translation)
   */
  children?: ReactNode;
  /**
   * Fallback text if translation key not found
   */
  fallback?: string;
}

/**
 * Component for displaying translated text using JSON translation files
 *
 * Usage with translation key:
 * <TranslatedText tKey="nav.dashboard" />
 * <TranslatedText tKey="common.add" fallback="Add" />
 *
 * Usage with raw text (no translation):
 * <TranslatedText>Some raw text</TranslatedText>
 */
export const TranslatedText = ({
  tKey,
  children,
  fallback,
}: TranslatedTextProps) => {
  const { t } = useTranslation();

  if (tKey) {
    return <>{t(tKey, fallback)}</>;
  }

  return <>{children}</>;
};

/**
 * Shorthand component alias for convenience
 * Usage: <T tKey="nav.dashboard" />
 */
export const T = TranslatedText;

/**
 * Component for translating field names with automatic fallback
 *
 * Usage:
 * <FieldText name="customerName" /> // Translates to "Customer Name"
 * <FieldText name="totalAmount" />  // Translates to "Total Amount"
 */
interface FieldTextProps {
  name: string;
}

export const FieldText = ({ name }: FieldTextProps) => {
  const { tf } = useTranslation();
  return <>{tf(name)}</>;
};

/**
 * Component for dynamic text with placeholder replacement
 *
 * Usage:
 * <DynamicText tKey="messages.itemsCount" values={{ count: 5 }} />
 * // If translation is "You have {count} items", it will render "You have 5 items"
 */
interface DynamicTextProps {
  tKey: string;
  values?: Record<string, string | number>;
  fallback?: string;
}

export const DynamicText = ({
  tKey,
  values = {},
  fallback,
}: DynamicTextProps) => {
  const { t } = useTranslation();
  let text = t(tKey, fallback);

  // Replace placeholders like {count}, {name} etc. with actual values
  Object.entries(values).forEach(([key, value]) => {
    text = text.replace(`{${key}}`, value.toString());
  });

  return <>{text}</>;
};

export default TranslatedText;
