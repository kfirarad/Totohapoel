/** "il" -> "Israel" / "ישראל", in the UI language */
export const marketName = (code: string, lang: string) => {
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
};
