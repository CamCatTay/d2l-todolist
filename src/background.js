// background.js
// Handles the background service worker: fetches course data, manages caching,
// and responds to messages from the content script.

import { get_course_content } from "/src/api/brightspace.js";
import { Action } from "./shared/actions";

// ============================================================
// Constants
// ============================================================

const SCROLL_POS_KEY = "spark-scroll-pos";
const ACTIVE_TAB_KEY = "spark-active-panel-tab";
const SETTINGS_OPEN_KEY = "spark-settings-open";
const SETTINGS_VALUE_KEY = "spark-user-settings";
const D2L_URL_FILTER = "/d2l/";
const FAQ_URL = "https://camcattay.github.io/spark-for-brightspace/faq.html";

// ============================================================
// Helpers
// ============================================================

// Sends a message to all open D2L tabs except the one with sender_tab_id
function broadcast_to_d2l_tabs(sender_tab_id, message) {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
            if (tab.id !== sender_tab_id && tab.url && tab.url.includes(D2L_URL_FILTER)) {
                chrome.tabs.sendMessage(tab.id, message).catch(() => {});
            }
        });
    });
}

// ============================================================
// Message Handler
// ============================================================

// Listens for messages from content scripts and dispatches to the appropriate handler
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === Action.FETCH_COURSES) {
        get_course_content(sender.tab.url).then(function(data) {
            sendResponse(data);
        });
        return true;
    }

    if (request.action === Action.OPEN_FAQ) {
        chrome.tabs.create({ url: FAQ_URL });
        return;
    }

    // A tab opened its panel — record it and tell every other D2L tab to close.
    if (request.action === Action.PANEL_OPENED) {
        const active_tab_id = sender.tab.id;
        chrome.storage.local.set({ [ACTIVE_TAB_KEY]: active_tab_id });
        broadcast_to_d2l_tabs(active_tab_id, { action: Action.CLOSE_PANEL });
        return;
    }

    // A tab explicitly closed its panel — clear the active record.
    if (request.action === Action.PANEL_CLOSED) {
        chrome.storage.local.get([ACTIVE_TAB_KEY], function(result) {
            if (result[ACTIVE_TAB_KEY] === sender.tab.id) {
                chrome.storage.local.remove(ACTIVE_TAB_KEY);
            }
        });
        return;
    }

    if (request.action === Action.SAVE_SCROLL_POSITION) {
        chrome.storage.local.set({ [SCROLL_POS_KEY]: request.position });
        return;
    }

    if (request.action === Action.GET_SCROLL_POSITION) {
        chrome.storage.local.get([SCROLL_POS_KEY], function(result) {
            sendResponse({ position: result[SCROLL_POS_KEY] || 0 });
        });
        return true; // keep channel open for async response
    }

    // A tab started fetching — let other D2L tabs know so they can show the loading indicator.
    if (request.action === Action.BROADCAST_FETCH_STARTED) {
        broadcast_to_d2l_tabs(sender.tab.id, { action: Action.FETCH_STARTED });
        return;
    }

    // A tab finished fetching — broadcast to all other D2L tabs to sync.
    if (request.action === Action.BROADCAST_COURSE_DATA_UPDATED) {
        broadcast_to_d2l_tabs(sender.tab.id, { action: Action.COURSE_DATA_UPDATED });
        return;
    }

    // Settings values changed on one tab — persist and relay to all other D2L tabs.
    if (request.action === Action.BROADCAST_SETTINGS_CHANGED) {
        chrome.storage.local.set({ [SETTINGS_VALUE_KEY]: request.settings });
        broadcast_to_d2l_tabs(sender.tab.id, { action: Action.SETTINGS_CHANGED, settings: request.settings });
        return;
    }

    // Settings panel opened on one tab — sync to all other D2L tabs.
    if (request.action === Action.BROADCAST_SETTINGS_OPENED) {
        chrome.storage.local.set({ [SETTINGS_OPEN_KEY]: true });
        broadcast_to_d2l_tabs(sender.tab.id, { action: Action.SETTINGS_OPENED });
        return;
    }

    // Settings panel closed on one tab — sync to all other D2L tabs.
    if (request.action === Action.BROADCAST_SETTINGS_CLOSED) {
        chrome.storage.local.set({ [SETTINGS_OPEN_KEY]: false });
        broadcast_to_d2l_tabs(sender.tab.id, { action: Action.SETTINGS_CLOSED });
        return;
    }
});

// ============================================================
// Action Button Handler
// ============================================================

// Toggles the side panel when the extension icon is clicked on a D2L tab
chrome.action.onClicked.addListener((tab) => {
    if (tab.url && tab.url.includes(D2L_URL_FILTER)) {
        chrome.tabs.sendMessage(tab.id, { action: Action.TOGGLE_PANEL });
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SCROLL_POS_KEY,
        ACTIVE_TAB_KEY,
        SETTINGS_OPEN_KEY,
        SETTINGS_VALUE_KEY,
        D2L_URL_FILTER,
        FAQ_URL,
    };
}
