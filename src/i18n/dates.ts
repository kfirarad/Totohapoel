import { format, type Locale } from "date-fns";
import { enUS, he } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";
import { useTranslation } from "react-i18next";
import { useMarket } from "@/markets/useMarket";

/** UI language -> date-fns locale; add one per language as it ships */
export const DATE_LOCALES: Record<string, Locale> = { he, en: enUS };

export const dateLocaleFor = (lng: string): Locale => DATE_LOCALES[lng.split("-")[0]] ?? enUS;

/** date-fns locale of the active UI language */
export const useDateLocale = () => {
  const { i18n } = useTranslation();
  return dateLocaleFor(i18n.language);
};

/** format() as wall-clock time in `timeZone` (the market's), not the browser's zone */
export const formatInTz = (date: Date | string | number, pattern: string, timeZone: string, locale?: Locale) =>
  format(new TZDate(new Date(date).getTime(), timeZone), pattern, { locale });

/** Formatting helpers bound to the current market's time zone and the active language */
export const useMarketDates = () => {
  const { t } = useTranslation();
  const { timeZone } = useMarket();
  const locale = useDateLocale();
  const fmt = (date: Date | string | number, pattern: string) => formatInTz(date, pattern, timeZone, locale);
  return {
    timeZone,
    locale,
    format: fmt,
    /** "HH:mm" in the market's zone */
    time: (date: Date | string | number) => fmt(date, "HH:mm"),
    /** weekday name in the market's zone ("ראשון", "Sunday") */
    dayName: (date: Date | string | number) => t(`weekdays.${Number(fmt(date, "i")) % 7}`),
  };
};
