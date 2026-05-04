// Copyright (c) 2026 CamCatTay. All rights reserved.
// See LICENSE file for terms of use.

import { get_course_content } from "./api/brightspace";
import {
    FETCH_COURSES,
    OPEN_FAQ,
    TOGGLE_PANEL,
    BROADCAST_SETTINGS_CHANGED
} from "./shared/constants/actions";
import { CourseShape } from "./shared/types";

const SETTINGS_VALUE_KEY = "spark-user-settings";
const D2L_URL_FILTER = "/d2l/";
const FAQ_URL = "https://camcattay.github.io/spark-for-brightspace/faq.html";
const UNINSTALL_URL = "https://camcattay.github.io/spark-for-brightspace/uninstall.html";
const SPARK_INITIALIZED_FLAG = "__spark_initialized__";

const is_d2l_tab = (url?: string) => !!url && url.includes(D2L_URL_FILTER);

function handle_extension_installed(details: Record<string, any>): void {
    if (details.reason === "install") {
        chrome.storage.local.set({ "spark-client-id": crypto.randomUUID() });
    }
    chrome.runtime.setUninstallURL(UNINSTALL_URL);

    // Initial injection into existing tabs so users don't have to refresh
    chrome.tabs.query({}, (tabs) => {
        tabs.filter(tab => is_d2l_tab(tab.url)).forEach(inject_content_script);
    });
}
chrome.runtime.onInstalled.addListener(handle_extension_installed);

function inject_content_script(tab: chrome.tabs.Tab) {
    if (!tab.id) return;

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (flag) => (window as any)[flag] === true,
        args: [SPARK_INITIALIZED_FLAG],
    }).then(results => {
        if (results?.[0]?.result) return; // Already initialized

        chrome.scripting.executeScript({
            target: { tabId: tab.id! },
            files: ["dist/content.js"]
        });
        chrome.scripting.insertCSS({
            target: { tabId: tab.id! },
            files: ["styles/sidepanel.css"]
        });
    }).catch(err => console.error("Injection failed:", err));
}

function handle_action(request: Record<string, any>, sender: Record<string, any>, sendResponse: any) {
        switch (request.action) {
        case FETCH_COURSES:
            get_course_content(sender.tab?.url ?? "").then(sendResponse);
            return true; // Keep channel open for async response

        case OPEN_FAQ:
            chrome.tabs.create({ url: FAQ_URL });
            break;

        case BROADCAST_SETTINGS_CHANGED:
            // Simply save to storage.
            // Content scripts in other tabs will hear this via chrome.storage.onChanged.
            chrome.storage.local.set({ [SETTINGS_VALUE_KEY]: request.settings });
            break;
    }
}
chrome.runtime.onMessage.addListener(handle_action);

function handle_extension_icon_clicked(tab: chrome.tabs.Tab): void {
        if (is_d2l_tab(tab.url)) {
        chrome.tabs.sendMessage(tab.id!, { action: TOGGLE_PANEL }).catch(() => {
            // If message fails, the script might be dead/unresponsive, try re-injecting
            inject_content_script(tab);
        });
    }
}
chrome.action.onClicked.addListener(handle_extension_icon_clicked);