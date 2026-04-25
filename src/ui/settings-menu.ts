// Settings panel DOM builder: user preferences for calendar look-back,
// completed-item visibility, show-on-start, and course/type filters.

import { Action } from "../shared/actions";
import { getCourseColor } from "../utils/color-utils";
import { safe_send_message } from "./panel";
import { create_toggle_setting } from "../utils/settings-menu-utils";
import {
    ui_state,
    truncate_course_name,
    ITEM_TYPES,
    CALENDAR_START_DAYS_BACK_STORAGE_KEY,
    SHOW_COMPLETED_STORAGE_KEY,
    SHOW_ON_START_STORAGE_KEY,
    HIDDEN_COURSES_SESSION_KEY,
    HIDDEN_TYPES_SESSION_KEY,
    SETTINGS_MIN_DAYS_BACK,
    SETTINGS_MAX_DAYS_BACK,
} from "./ui-state";
import type { CourseData } from "../shared/types";

function get_synced_settings() {
    return {
        days_back: ui_state.calendar_start_days_back,
        show_completed: ui_state.show_completed_items,
    };
}

export function build_settings_panel(): HTMLElement {
    const panel = document.createElement("div");
    panel.id = "spark-settings-panel";

    const header = document.createElement("div");
    header.className = "settings-header";
    const title = document.createElement("span");
    title.className = "settings-title";
    title.textContent = "Settings";
    header.appendChild(title);
    panel.appendChild(header);

    const body = document.createElement("div");
    body.className = "settings-body";

    // --- Days-back input ---
    const section = document.createElement("div");
    section.className = "settings-section";

    const label = document.createElement("label");
    label.className = "settings-label";
    label.htmlFor = "spark-setting-days-back";
    label.textContent = "Calendar look-back days";

    const description = document.createElement("p");
    description.className = "settings-description";
    description.textContent = "How many days before today the calendar starts showing items. Set to 0 to start from today.";

    const input = document.createElement("input");
    input.type = "number";
    input.id = "spark-setting-days-back";
    input.className = "settings-input";
    input.min = SETTINGS_MIN_DAYS_BACK.toString();
    input.max = SETTINGS_MAX_DAYS_BACK.toString();
    input.value = ui_state.calendar_start_days_back.toString();
    input.addEventListener("change", () => {
        const val = Math.max(SETTINGS_MIN_DAYS_BACK, Math.min(SETTINGS_MAX_DAYS_BACK, parseInt(input.value, 10) || 0));
        input.value = val.toString();
        ui_state.calendar_start_days_back = val;
        localStorage.setItem(CALENDAR_START_DAYS_BACK_STORAGE_KEY, val.toString());
        safe_send_message({ action: Action.BROADCAST_SETTINGS_CHANGED, settings: get_synced_settings() });
        if (ui_state.on_rerender) ui_state.on_rerender();
    });

    section.appendChild(label);
    section.appendChild(description);
    section.appendChild(input);
    body.appendChild(section);

    // --- Show completed items toggle ---
    const show_complete_items_setting = create_toggle_setting(
        "Show completed items",
        "When off, only incomplete items are shown in the calendar.",
        ui_state.show_completed_items,
        (checked) => {
            ui_state.show_completed_items = checked;
            localStorage.setItem(SHOW_COMPLETED_STORAGE_KEY, checked.toString());
            safe_send_message({ action: Action.BROADCAST_SETTINGS_CHANGED, settings: get_synced_settings() });
            if (ui_state.on_rerender) ui_state.on_rerender();
        }
    );
    body.appendChild(show_complete_items_setting.section);

    // --- Show on start toggle ---
    const show_on_start_setting = create_toggle_setting(
        "Show on start",
        "When off, the side panel will start hidden in new tabs.",
        ui_state.show_on_start,
        (checked) => {
            ui_state.show_on_start = checked;
            localStorage.setItem(SHOW_ON_START_STORAGE_KEY, checked.toString());
            safe_send_message({ action: Action.BROADCAST_SETTINGS_CHANGED, settings: get_synced_settings() });
            if (ui_state.on_rerender) ui_state.on_rerender();
        }
    );
    body.appendChild(show_on_start_setting.section);

    // --- Assignment types section ---
    const types_section = document.createElement("div");
    types_section.className = "settings-section";

    const types_label = document.createElement("div");
    types_label.className = "settings-label";
    types_label.textContent = "Visible assignment types";

    const types_description = document.createElement("p");
    types_description.className = "settings-description";
    types_description.textContent = "Uncheck a type to hide it from the calendar.";

    const types_list = document.createElement("div");
    types_list.className = "settings-courses-list";

    ITEM_TYPES.forEach(({ key, label: type_label }) => {
        const row = document.createElement("label");
        row.className = "settings-course-row";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "settings-course-checkbox";
        checkbox.dataset.settingType = key;
        checkbox.checked = !ui_state.hidden_types.has(key);
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                ui_state.hidden_types.delete(key);
            } else {
                ui_state.hidden_types.add(key);
            }
            sessionStorage.setItem(HIDDEN_TYPES_SESSION_KEY, JSON.stringify([...ui_state.hidden_types]));
            if (ui_state.on_rerender) ui_state.on_rerender();
        });

        const name = document.createElement("span");
        name.className = "settings-course-name";
        name.textContent = type_label;

        row.appendChild(checkbox);
        row.appendChild(name);
        types_list.appendChild(row);
    });

    types_section.appendChild(types_label);
    types_section.appendChild(types_description);
    types_section.appendChild(types_list);
    body.appendChild(types_section);

    // --- Courses section (populated by update_settings_course_list) ---
    const courses_section = document.createElement("div");
    courses_section.className = "settings-section";
    courses_section.id = "spark-settings-courses";

    const courses_label = document.createElement("div");
    courses_label.className = "settings-label";
    courses_label.textContent = "Visible courses";

    const courses_description = document.createElement("p");
    courses_description.className = "settings-description";
    courses_description.textContent = "Uncheck a course to hide it from the calendar.";

    const courses_list = document.createElement("div");
    courses_list.id = "spark-settings-courses-list";
    courses_list.className = "settings-courses-list";

    courses_section.appendChild(courses_label);
    courses_section.appendChild(courses_description);
    courses_section.appendChild(courses_list);
    body.appendChild(courses_section);

    panel.appendChild(body);

    // Populate course list with whatever data was last received.
    // Pass courses_list directly since the panel isn't in the DOM yet.
    if (Object.keys(ui_state.last_course_data).length > 0) {
        update_settings_course_list(ui_state.last_course_data, courses_list);
    }

    return panel;
}

export function update_settings_course_list(course_data: CourseData, list_el: HTMLElement | null = null): void {
    const list = list_el || document.getElementById("spark-settings-courses-list");
    if (!list) return;

    list.innerHTML = "";

    Object.keys(course_data).forEach((course_id) => {
        const course = course_data[course_id];
        const display_name = truncate_course_name(course.name) || course.name;
        const color = getCourseColor(course.name);
        const is_hidden = ui_state.hidden_course_ids.has(course_id);

        const row = document.createElement("label");
        row.className = "settings-course-row";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "settings-course-checkbox";
        checkbox.checked = !is_hidden;
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                ui_state.hidden_course_ids.delete(course_id);
            } else {
                ui_state.hidden_course_ids.add(course_id);
            }
            sessionStorage.setItem(HIDDEN_COURSES_SESSION_KEY, JSON.stringify([...ui_state.hidden_course_ids]));
            if (ui_state.on_rerender) ui_state.on_rerender();
        });

        const dot = document.createElement("span");
        dot.className = "settings-course-dot";
        dot.style.backgroundColor = color;

        const name = document.createElement("span");
        name.className = "settings-course-name";
        name.textContent = display_name;
        name.title = course.name;

        row.appendChild(checkbox);
        row.appendChild(dot);
        row.appendChild(name);
        list.appendChild(row);
    });
}
