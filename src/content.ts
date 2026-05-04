// Copyright (c) 2026 CamCatTay. All rights reserved.
// See LICENSE file for terms of use.

import {
    safe_send_message,
    inject_embedded_ui,
    register_panel_restore_callback,
    register_settings_panel_builder,
    toggle_panel
} from "./ui/panel";
import {
    initialize_gui,
    update_gui,
    toggle_fetching_indicator,
    apply_settings,
    set_last_fetched_time,
    register_ui_callbacks
} from "./ui/calendar";
import { scroll_to_today } from "./ui/frequency-chart";
import { build_settings_panel, update_settings_panel } from "./ui/settings-menu";
import { read_last_fetch_completed_at } from "./ui/settings";
import {
    FETCH_COURSES,
    OPEN_URL,
    SETTINGS_CHANGED,
    TOGGLE_PANEL
} from "./shared/constants/actions";
import type { CourseData } from "./shared/types";
import { COURSE_DATA,
    LAST_FETCH_COMPLETED_AT,
    SCROLL_POS, USER_SETTINGS
} from "./shared/constants/storage-keys";

const COOLDOWN_MS = 15 * 60 * 1000;
const INTERACTION_DEBOUNCE_MS = 2000;

// State
let local_course_data: CourseData = {};
let is_fetching = false;
let interaction_timer: ReturnType<typeof setTimeout>;

/**
 * The single source of truth for triggering a fetch.
 * Validates cooldowns and in-flight status before messaging background.
 */
function request_smart_fetch(force = false) {
    const time_since_last = Date.now() - read_last_fetch_completed_at();
    const is_cooldown_active = time_since_last < COOLDOWN_MS;

    if (is_fetching || (!force && is_cooldown_active)) return;

    is_fetching = true;
    toggle_fetching_indicator(true);

    safe_send_message({ action: FETCH_COURSES }, () => {
        is_fetching = false;
        toggle_fetching_indicator(false);
    });
}

/**
 * Reactive Storage Listener:
 * This handles synchronization across all tabs automatically.
 */
function setup_storage_listener() {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        console.log(changes);

        if (changes[COURSE_DATA]) {
            local_course_data = changes[COURSE_DATA].newValue;
            update_gui(local_course_data, is_fetching);
        }

        if (changes[LAST_FETCH_COMPLETED_AT]) {
            set_last_fetched_time(new Date(changes[LAST_FETCH_COMPLETED_AT].newValue));
        }

        if (changes[USER_SETTINGS]) {
            apply_settings(changes[USER_SETTINGS].newValue);
            update_gui(local_course_data, is_fetching);
        }
    });
}

/**
 * Persistence & Lifecycle
 */
function handle_interaction() {
    clearTimeout(interaction_timer);
    interaction_timer = setTimeout(() => request_smart_fetch(), INTERACTION_DEBOUNCE_MS);
}

function save_scroll_state(container: HTMLElement) {
    chrome_storage_set(SCROLL_POS, container.scrollTop, "session");
}

async function restore_scroll_state(container: HTMLElement) {
    const saved = parseInt(await chrome_storage_get(SCROLL_POS, "session"));
    saved > 0 ? (container.scrollTop = saved) : scroll_to_today();
}

/**
 * Message Routing
 */
function handle_runtime_messages(request: any) {
    switch (request.action) {
        case TOGGLE_PANEL:    toggle_panel(); break;
        case OPEN_URL:        window.open(request.url, "_blank"); break;
        case SETTINGS_CHANGED: apply_settings(request.settings); break;
    }
}

/**
 * Initialization logic
 */
async function boot() {
    // 1. Setup UI & Global Listeners
    const container = inject_embedded_ui();
    initialize_gui();
    register_settings_panel_builder(build_settings_panel);
    update_settings_panel();

    // 2. Load Initial State
    chrome.storage.local.get(null, (data) => {
        if (data[USER_SETTINGS]) apply_settings(data[USER_SETTINGS]);
        if (data[LAST_FETCH_COMPLETED_AT]) set_last_fetched_time(new Date(data[LAST_FETCH_COMPLETED_AT]));
        if (data[COURSE_DATA]) {
            local_course_data = data[COURSE_DATA];
            update_gui(local_course_data, false);
            if (container) restore_scroll_state(container);
        }
    });

    // 3. Register Event Listeners
    setup_storage_listener();
    chrome.runtime.onMessage.addListener(handle_runtime_messages);

    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && request_smart_fetch());
    container?.addEventListener("scroll", () => save_scroll_state(container));

    // UI Callbacks
    register_ui_callbacks({
        on_refresh: () => request_smart_fetch(true),
        on_rerender: () => update_gui(local_course_data, is_fetching)
    });

    register_panel_restore_callback(() => update_gui(local_course_data, is_fetching));

    // 4. Initial Check
    request_smart_fetch();
}

async function initialize_spark() {
    // Check if we've already injected to prevent double-init
    // (Vite HMR can sometimes trigger this)
    if ((window as any).has_spark_initialized) return;
    (window as any).has_spark_initialized = true;

    await boot();
}

initialize_spark();