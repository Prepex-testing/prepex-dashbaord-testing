                    export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

// Scoped to the admin app so it never collides with the student app's own
// preference when both run on the same host during development.
export const THEME_STORAGE_KEY = "prepex-admin-theme";

// Executed as a raw string via a synchronous <script> in the <head>, before
// hydration, so the correct data-theme is painted on the first frame. Keep this
// logic in sync with ThemeProvider.
export const NO_FLASH_THEME_SCRIPT = `(function(){try{
var t=localStorage.getItem("${THEME_STORAGE_KEY}");
var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.setAttribute("data-theme",d?"dark":"light");
}catch(e){}})()`;
