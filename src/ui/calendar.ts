// Calendar list view: collects and indexes items by due date, then renders
// date headers, item cards, and the scrollbar position indicator.

import { formatTimeFromDate, formatFullDatetime, getDateOnly, formatDateHeader } from "../utils/date-utils";
import { getCourseColor, ensureCourseColorsAssigned } from "../utils/color-utils";
import { create_frequency_chart } from "./frequency-chart";
import { update_settings_course_list } from "./settings-menu";
import {
    ui_state,
    truncate_course_name,
    DUE_TODAY_COLOR,
    DUE_TOMORROW_COLOR,
    OVERDUE_COLOR,
    CALENDAR_START_DAYS_BACK_STORAGE_KEY,
    SHOW_COMPLETED_STORAGE_KEY,
} from "./ui-state";
import type { CourseData, CourseShape, ItemShape } from "../shared/types";

interface DateIndexedItems {
    items_by_date: Record<string, Array<{ item: ItemShape; course: CourseShape }>>;
    min_date: Date | null;
    max_date: Date | null;
}

// Indexes all visible items by ISO date string, respecting hidden courses, hidden types,
// and the show_completed_items setting. Returns the indexed map and the date range.
function collect_items_by_date(course_data: CourseData): DateIndexedItems {
    const items_by_date: Record<string, Array<{ item: ItemShape; course: CourseShape }>> = {};
    let min_date: Date | null = null;
    let max_date: Date | null = null;

    Object.keys(course_data).forEach((course_id) => {
        const course = course_data[course_id];
        if (ui_state.hidden_course_ids.has(course_id)) return;

        const item_collections = [
            { items: course.assignments, type: "assignments" },
            { items: course.quizzes, type: "quizzes" },
            { items: course.discussions, type: "discussions" },
        ];

        item_collections.forEach(({ items, type }) => {
            if (ui_state.hidden_types.has(type)) return;
            if (!items) return;
            Object.keys(items).forEach((item_id) => {
                const item = items[item_id];
                if (!item.due_date || (item.completed && !ui_state.show_completed_items)) return;
                const date_only = getDateOnly(item.due_date);
                if (!date_only) return;
                const date_key = date_only.toISOString().split("T")[0];
                if (!items_by_date[date_key]) {
                    items_by_date[date_key] = [];
                }
                items_by_date[date_key].push({ item, course });
                if (!min_date || date_only < min_date) min_date = date_only;
                if (!max_date || date_only > max_date) max_date = date_only;
            });
        });
    });

    return { items_by_date, min_date, max_date };
}

function create_scrollbar_indicator(calendar_container: HTMLElement): void {
    const existing_indicator = calendar_container.parentElement?.querySelector(".scrollbar-indicator");
    if (existing_indicator) existing_indicator.remove();

    const indicator = document.createElement("div");
    indicator.className = "scrollbar-indicator";

    const assignments = calendar_container.querySelectorAll<HTMLElement>(".calendar-item");
    if (assignments.length === 0) return;

    const container_height = calendar_container.clientHeight;
    const scroll_height = calendar_container.scrollHeight;
    if (scroll_height <= container_height) return;

    assignments.forEach((assignment_el) => {
        const course_el = assignment_el.querySelector<HTMLElement>(".item-course");
        const course_name = course_el?.dataset.fullName || course_el?.textContent || "";
        const course_color = getCourseColor(course_name);
        const position_in_container = assignment_el.offsetTop;
        const percent_position = (position_in_container / scroll_height) * 100;

        const notch = document.createElement("div");
        notch.className = "scrollbar-notch";
        notch.style.top = percent_position + "%";
        notch.style.backgroundColor = course_color;
        notch.title = course_name;

        indicator.appendChild(notch);
    });

    calendar_container.parentElement?.appendChild(indicator);

    calendar_container.addEventListener("scroll", () => {
        update_scrollbar_indicator(calendar_container);
    });
}

function update_scrollbar_indicator(calendar_container: HTMLElement): void {
    const indicator = calendar_container.parentElement?.querySelector(".scrollbar-indicator");
    if (!indicator) return;

    const scroll_height = calendar_container.scrollHeight;
    const assignments = calendar_container.querySelectorAll<HTMLElement>(".calendar-item");
    const notches = indicator.querySelectorAll<HTMLElement>(".scrollbar-notch");

    notches.forEach((notch, index) => {
        if (index < assignments.length) {
            const position_in_container = assignments[index].offsetTop;
            const percent_position = (position_in_container / scroll_height) * 100;
            notch.style.top = percent_position + "%";
        }
    });
}

function create_assignment_element(item: ItemShape, course: CourseShape): HTMLAnchorElement {
    const assignment_container = document.createElement("a");
    assignment_container.href = item.url ?? "";
    assignment_container.className = "calendar-item";

    const now = new Date();
    const now_date_only = getDateOnly(now)!;
    const start_date_only = item.start_date ? getDateOnly(item.start_date) : null;
    const is_not_yet_available = start_date_only && start_date_only > now_date_only;

    if (is_not_yet_available) {
        assignment_container.classList.add("not-yet-available");
    }

    const item_name = document.createElement("div");
    item_name.className = "item-name";
    item_name.textContent = item.name;

    const item_meta = document.createElement("div");
    item_meta.className = "item-meta";

    if (item.start_date) {
        const start_date_container = document.createElement("div");
        start_date_container.className = "start-date-container";

        const start_date_value = document.createElement("span");
        start_date_value.className = "start-date-value";
        start_date_value.textContent = "Available on " + formatFullDatetime(item.start_date);
        start_date_container.appendChild(start_date_value);

        item_meta.appendChild(start_date_container);
    }

    const due_container = document.createElement("div");
    due_container.className = "due-date-container";

    const due_time = document.createElement("span");
    due_time.className = "item-time";
    due_time.textContent = formatTimeFromDate(item.due_date);
    const due_date_only = getDateOnly(item.due_date);
    const tomorrow_date_only = new Date(now_date_only);
    tomorrow_date_only.setDate(tomorrow_date_only.getDate() + 1);

    if (!item.completed && due_date_only && due_date_only < now_date_only) {
        due_time.style.color = OVERDUE_COLOR;
    } else if (due_date_only && due_date_only.getTime() === now_date_only.getTime()) {
        due_time.style.color = DUE_TODAY_COLOR;
    } else if (due_date_only && due_date_only.getTime() === tomorrow_date_only.getTime()) {
        due_time.style.color = DUE_TOMORROW_COLOR;
    }
    due_container.appendChild(due_time);

    const meta_separator = document.createElement("span");
    meta_separator.className = "item-meta-separator";
    meta_separator.textContent = "|";
    due_container.appendChild(meta_separator);

    const item_course = document.createElement("span");
    item_course.className = "item-course";
    item_course.dataset.fullName = course.name;

    const course_dot = document.createElement("span");
    course_dot.className = "item-course-dot";
    course_dot.textContent = "●";
    course_dot.style.color = getCourseColor(course.name);
    item_course.appendChild(course_dot);
    item_course.appendChild(document.createTextNode(truncate_course_name(course.name)));

    due_container.appendChild(item_course);
    item_meta.appendChild(due_container);

    const item_content = document.createElement("div");
    item_content.className = "item-content";
    item_content.appendChild(item_name);
    item_content.appendChild(item_meta);
    assignment_container.appendChild(item_content);

    const badge = document.createElement("div");
    badge.className = item.completed ? "item-completed-badge" : "item-incomplete-dot";
    badge.textContent = item.completed ? "✓" : "•";
    assignment_container.appendChild(badge);

    return assignment_container;
}

export function initialize_gui(): void {
    update_gui({} as CourseData, true);
}

export function add_data_status_indicator(is_stale: boolean): void {
    const existing_status = document.querySelector(".fetch-status");
    if (existing_status) existing_status.remove();

    const last_fetched_el = document.querySelector(".frequency-chart-last-fetched");
    if (last_fetched_el) last_fetched_el.classList.remove("fetching");

    if (is_stale && last_fetched_el) {
        const fetch_status = document.createElement("span");
        fetch_status.className = "fetch-status";
        fetch_status.innerHTML = ' — Fetching...<span class="fetch-spinner"></span>';
        last_fetched_el.appendChild(fetch_status);
        last_fetched_el.classList.add("fetching");
    }
}

export function update_gui(course_data: CourseData, is_from_cache: boolean = false): void {
    const calendar_container = document.getElementById("calendar-container");
    if (!calendar_container) return;

    ui_state.last_course_data = course_data;
    ensureCourseColorsAssigned(course_data);
    update_settings_course_list(course_data);

    // Preserve the current week offset so navigation survives a re-render
    const existing_chart = calendar_container.querySelector("#frequency-chart") as (HTMLDivElement & { _weekOffset?: number }) | null;
    const preserved_week_offset = existing_chart ? (existing_chart._weekOffset || 0) : 0;

    calendar_container.innerHTML = "";

    const { items_by_date, min_date, max_date } = collect_items_by_date(course_data);

    try {
        create_frequency_chart(calendar_container, items_by_date, preserved_week_offset);
    } catch (e) {
        console.error("Error creating frequency chart (non-fatal):", e);
    }

    if (is_from_cache) {
        add_data_status_indicator(true);
    }

    // Empty state — frequency chart is already rendered above for its buttons/loading indicator
    if (!min_date || !max_date) {
        const existing_indicator = calendar_container.parentElement?.querySelector(".scrollbar-indicator");
        if (existing_indicator) existing_indicator.remove();
        const empty_message = document.createElement("div");
        empty_message.id = "loading-indicator";
        empty_message.textContent = "No upcoming assignments";
        calendar_container.appendChild(empty_message);
        return;
    }

    const today = new Date();
    const start_date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start_date.setDate(start_date.getDate() - ui_state.calendar_start_days_back);
    const end_date = new Date(max_date);

    let current_date = new Date(start_date);
    while (current_date <= end_date) {
        const date_key = current_date.toISOString().split("T")[0];
        const items = items_by_date[date_key] || [];

        const date_header = document.createElement("div");
        date_header.className = "calendar-date-header";
        const date_header_text = formatDateHeader(current_date);
        date_header.innerHTML = `<div class="date-title">${date_header_text}</div>`;
        calendar_container.appendChild(date_header);

        const items_container = document.createElement("div");
        items_container.className = "calendar-items-container";

        if (items.length === 0) {
            const empty_notice = document.createElement("div");
            empty_notice.className = "empty-day-notice";
            empty_notice.textContent = "No assignments due";
            items_container.appendChild(empty_notice);
        } else {
            items.forEach(({ item, course }) => {
                const element = create_assignment_element(item, course);
                items_container.appendChild(element);
            });
        }

        calendar_container.appendChild(items_container);
        current_date.setDate(current_date.getDate() + 1);
    }

    create_scrollbar_indicator(calendar_container);
}

export function set_last_fetched_time(fetch_time: Date): void {
    ui_state.last_fetched_time = fetch_time;
}

export function register_ui_callbacks({ on_refresh, on_rerender }: { on_refresh: () => void; on_rerender: () => void }): void {
    ui_state.on_refresh = on_refresh;
    ui_state.on_rerender = on_rerender;
}

export function apply_settings({ days_back, show_completed }: { days_back: number; show_completed?: boolean }): void {
    ui_state.calendar_start_days_back = days_back;
    localStorage.setItem(CALENDAR_START_DAYS_BACK_STORAGE_KEY, days_back.toString());

    if (show_completed !== undefined) {
        ui_state.show_completed_items = show_completed;
        localStorage.setItem(SHOW_COMPLETED_STORAGE_KEY, show_completed.toString());
    }

    const days_input = document.getElementById("spark-setting-days-back") as HTMLInputElement | null;
    if (days_input) days_input.value = days_back.toString();

    const completed_toggle = document.getElementById("spark-setting-show-completed") as HTMLInputElement | null;
    if (completed_toggle) completed_toggle.checked = ui_state.show_completed_items;
}
