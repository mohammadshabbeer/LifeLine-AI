// ==========================================
// LIFELINE AI GLOBAL THEME MANAGER
// ==========================================

const THEME_STORAGE_KEY = "lifeline-theme";

const rootElement = document.documentElement;

function getSavedTheme() {

    const savedTheme =
        localStorage.getItem(THEME_STORAGE_KEY);

    if (
        savedTheme === "light" ||
        savedTheme === "dark"
    ) {
        return savedTheme;
    }

    const systemPrefersDark =
        window.matchMedia &&
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;

    return systemPrefersDark
        ? "dark"
        : "light";
}

function applyTheme(theme) {

    rootElement.setAttribute(
        "data-theme",
        theme
    );

    localStorage.setItem(
        THEME_STORAGE_KEY,
        theme
    );

    updateThemeButtons(theme);
}

function updateThemeButtons(theme) {

    const buttons =
        document.querySelectorAll(
            "[data-theme-toggle]"
        );

    buttons.forEach((button) => {

        const icon =
            button.querySelector(
                ".theme-toggle-icon"
            );

        const text =
            button.querySelector(
                ".theme-toggle-text"
            );

        if (theme === "dark") {

            button.setAttribute(
                "aria-label",
                "Switch to light mode"
            );

            button.setAttribute(
                "title",
                "Switch to light mode"
            );

            if (icon) {
                icon.textContent = "☀️";
            }

            if (text) {
                text.textContent = "Light Mode";
            }

        } else {

            button.setAttribute(
                "aria-label",
                "Switch to dark mode"
            );

            button.setAttribute(
                "title",
                "Switch to dark mode"
            );

            if (icon) {
                icon.textContent = "🌙";
            }

            if (text) {
                text.textContent = "Dark Mode";
            }

        }

    });
}

function toggleTheme() {

    const currentTheme =
        rootElement.getAttribute(
            "data-theme"
        ) || "light";

    const newTheme =
        currentTheme === "dark"
            ? "light"
            : "dark";

    applyTheme(newTheme);
}

function initializeTheme() {

    const theme =
        getSavedTheme();

    applyTheme(theme);

    document.addEventListener(
        "click",
        (event) => {

            const toggleButton =
                event.target.closest(
                    "[data-theme-toggle]"
                );

            if (!toggleButton) return;

            toggleTheme();

        }
    );
}

initializeTheme();
