export const THEME_STORAGE_KEY = "overmastery-theme";

export const themeInitializationScript = `
  (() => {
    try {
      const saved = localStorage.getItem("${THEME_STORAGE_KEY}");
      const preference = saved === "dark" || saved === "light" ? saved : "system";
      const theme = preference === "system"
        ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : preference;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = "light";
    }
  })();
`;
