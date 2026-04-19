// panel.js
// Builds and controls the side panel DOM: tab switching, resize handling,
// scroll persistence, and rendering course content into the panel.

import { Action } from "../shared/actions.js";
import { build_settings_panel } from "./components.js";

const EXPANSION_STATE_KEY = "d2l-todolist-expanded";
const PANEL_WIDTH_KEY = "d2l-todolist-width";

export function safe_send_message(message, callback) {
    try {
        if (callback) {
            chrome.runtime.sendMessage(message, callback);
        } else {
            chrome.runtime.sendMessage(message);
        }
    } catch (e) {
        if (!e.message?.includes("Extension context invalidated")) {
            console.error(e);
        }
    }
}

export let panel_width = 350;
let container;
let isAnimating = false;
let settingsWasOpen = false;
// True when the panel was closed by another tab taking over (not by the user).
let wasClosedSilently = false;
// Callback invoked when the panel is restored after a silent close.
let _onPanelRestore = null;

export function register_panel_restore_callback(fn) {
    _onPanelRestore = fn;
}

function updateBodyMargin() {
    document.body.style.marginRight = panel_width + "px";
}

export function toggle_panel() {
    if (!container || isAnimating) return;
    isAnimating = true;

    const willHide = !container.classList.contains("hidden");

    if (willHide) {
        // If closing, check if settings panel is open first
        const sp = document.getElementById("spark-settings-panel");
        const settingsOpen = sp && sp.classList.contains("open");

        const doClose = () => {
            container.classList.add("hidden");
            localStorage.setItem(EXPANSION_STATE_KEY, "false");
            wasClosedSilently = false;
            safe_send_message({ action: Action.PANEL_CLOSED });
            document.body.style.marginRight = "0";
            const animationHandler = () => {
                container.style.display = "none";
                container.removeEventListener("animationend", animationHandler);
                isAnimating = false;
            };
            container.addEventListener("animationend", animationHandler);
        };

        if (settingsOpen) {
            settingsWasOpen = true;
            sp.classList.remove("open");
            setTimeout(doClose, 250);
        } else {
            settingsWasOpen = false;
            doClose();
        }
    } else {
        container.classList.remove("hidden");
        localStorage.setItem(EXPANSION_STATE_KEY, "true");
        wasClosedSilently = false;
        safe_send_message({ action: Action.PANEL_OPENED });
        container.style.display = "flex";
        updateBodyMargin();

        if (settingsWasOpen) {
            settingsWasOpen = false;
            // Wait for the panel slide-in to finish before opening settings
            setTimeout(() => {
                let sp = document.getElementById("spark-settings-panel");
                if (!sp) {
                    sp = build_settings_panel();
                    document.body.appendChild(sp);
                }
                sp.style.right = (typeof panel_width !== "undefined" ? panel_width : 350) + "px";
                sp.classList.add("open");
                // Settings transition completes after another 250ms
                setTimeout(() => { isAnimating = false; }, 250);
            }, 400);
        } else {
            // Panel slide-in is ~400ms; then check if settings should be open globally
            setTimeout(() => {
                chrome.storage.local.get(["spark-settings-open"], function(result) {
                    if (result["spark-settings-open"]) {
                        let sp = document.getElementById("spark-settings-panel");
                        if (!sp) {
                            sp = build_settings_panel();
                            document.body.appendChild(sp);
                        }
                        sp.style.right = panel_width + "px";
                        sp.classList.add("open");
                        setTimeout(() => { isAnimating = false; }, 250);
                    } else {
                        isAnimating = false;
                    }
                });
            }, 400);
        }
    }
}

// Close the panel without changing the user's saved preference.
// Used when another tab takes over as the active panel.
// Deliberately skips animation — the user is not watching this tab.
export function close_panel_silently() {
    if (!container || container.classList.contains("hidden")) return;
    wasClosedSilently = true;
    container.classList.add("hidden");
    container.style.display = "none";
    document.body.style.marginRight = "0";
    const sp = document.getElementById("spark-settings-panel");
    if (sp) {
        sp.style.transition = "none";
        sp.classList.remove("open");
        requestAnimationFrame(() => { sp.style.transition = ""; });
    }
}

function createEmbeddedCalendarUI() {
    const newContainer = document.createElement("div");
    newContainer.id = "d2l-todolist-widget";
    newContainer.style.width = panel_width + "px";

    const panel = document.createElement("div");
    panel.id = "d2l-todolist-panel";
    panel.style.width = panel_width + "px";

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "d2l-todolist-resize-handle";

    const calendarContainer = document.createElement("div");
    calendarContainer.id = "calendar-container";

    panel.appendChild(resizeHandle);
    panel.appendChild(calendarContainer);
    newContainer.appendChild(panel);

    // Resize functionality
    let isResizing = false;
    let startX = 0;
    let startWidth = panel_width;

    resizeHandle.addEventListener("mousedown", function(e) {
        isResizing = true;
        startX = e.clientX;
        startWidth = panel_width;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";
    });

    document.addEventListener("mousemove", function(e) {
        if (!isResizing) return;

        const deltaX = e.clientX - startX;
        const newWidth = Math.max(250, startWidth - deltaX);

        panel_width = newWidth;
        newContainer.style.width = newWidth + "px";
        panel.style.width = newWidth + "px";
        updateBodyMargin();

        const sp = document.getElementById("spark-settings-panel");
        if (sp) sp.style.right = newWidth + "px";

        localStorage.setItem(PANEL_WIDTH_KEY, newWidth.toString());
    });

    document.addEventListener("mouseup", function() {
        if (isResizing) {
            isResizing = false;
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
        }
    });

    return { container: newContainer, calendarContainer, panel };
}

export function inject_embedded_ui() {
    const existing = document.getElementById("d2l-todolist-widget");
    if (existing) existing.remove();

    const savedWidth = localStorage.getItem(PANEL_WIDTH_KEY);
    if (savedWidth) {
        panel_width = parseInt(savedWidth, 10);
    }

    const { container: newContainer, calendarContainer } = createEmbeddedCalendarUI();
    container = newContainer;

    const savedState = localStorage.getItem(EXPANSION_STATE_KEY);
    const shouldShowPanel = savedState === null || savedState === "true";

    if (!shouldShowPanel) {
        container.style.display = "none";
        container.classList.add("hidden");
    }

    if (shouldShowPanel) {
        updateBodyMargin();
    } else {
        document.body.style.marginRight = "0";
    }

    document.body.appendChild(container);

    // Claim the active panel slot if starting visible.
    if (shouldShowPanel) {
        safe_send_message({ action: Action.PANEL_OPENED });
    }

    // Handle tab visibility changes.
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;

        if (wasClosedSilently) {
            // This tab's panel was closed by a simultaneously-visible tab.
            // Restore it and reclaim the active slot.
            const state = localStorage.getItem(EXPANSION_STATE_KEY);
            if (state === null || state === "true") {
                wasClosedSilently = false;
                isAnimating = false;
                container.style.display = "flex";
                container.classList.remove("hidden");
                updateBodyMargin();
                safe_send_message({ action: Action.PANEL_OPENED });
                if (_onPanelRestore) _onPanelRestore();
            }
        } else if (container && !container.classList.contains("hidden")) {
            // Panel was open when the user switched away — it was never closed.
            // Reclaim the active slot (closes any other tab's panel if visible)
            // and refresh data without any animation.
            safe_send_message({ action: Action.PANEL_OPENED });
            if (_onPanelRestore) _onPanelRestore();
        }
    });

    return calendarContainer;
}
