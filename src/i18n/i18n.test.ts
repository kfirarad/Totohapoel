import { test, expect } from "bun:test";
import i18n, { dirOf } from "./index";
import { formatInTz } from "./dates";
import { he } from "date-fns/locale";

const heT = i18n.getFixedT("he");
const enT = i18n.getFixedT("en");

test("Hebrew is the default language", () => {
  expect(i18n.language).toBe("he");
  expect(dirOf("he")).toBe("rtl");
  expect(dirOf("en-US")).toBe("ltr");
});

test("glossary terms are nested into common strings", () => {
  expect(heT("groupBet.title", { name: "טוטו 7/11/26" })).toBe("הטופס המשותף · טוטו 7/11/26");
  expect(heT("admin.columnForm.importedTitle")).toBe("יובא מווינר");
  expect(heT("admin.columnForm.noDrawInPaste")).toBe("לא נמצא טוטו 16 בתוכן שהודבק");
  expect(enT("admin.columnForm.importedTitle")).toBe("Imported from Winner");
});

test("plurals", () => {
  expect(heT("stats.closedDraws", { count: 1 })).toBe("מחזור אחד שהסתיים");
  expect(heT("stats.closedDraws", { count: 2 })).toBe("2 מחזורים שהסתיימו");
  expect(heT("stats.closedDraws", { count: 12 })).toBe("12 מחזורים שהסתיימו");
  expect(enT("stats.closedDraws", { count: 1 })).toBe("1 finished round");
  expect(enT("stats.closedDraws", { count: 3 })).toBe("3 finished rounds");
});

test("the column-name template keeps the market's language", () => {
  expect(i18n.getFixedT("he", "glossary")("columnName", { day: 7, month: 11, year: "26" })).toBe("טוטו 7/11/26");
});

test("dates format in the market's zone with the locale's pattern", () => {
  // 12:54Z is 14:54 in Israel in November
  const d = "2026-11-07T12:54:00.000Z";
  expect(formatInTz(d, heT("dates.dayMonthTime"), "Asia/Jerusalem", he)).toBe("7 בנובמבר, 14:54");
  expect(formatInTz(d, "HH:mm", "Europe/Stockholm")).toBe("13:54");
  expect(formatInTz(d, "i", "Asia/Jerusalem")).toBe("6"); // Saturday (ISO day 6)
});
