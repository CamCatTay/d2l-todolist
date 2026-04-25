// Weekly item-count bar chart with day-click scroll navigation and
// week-prev/next controls. Rendered at the top of the calendar container.

import { Action } from "../shared/actions";
import { getWeekStart, getDateKey } from "../utils/date-utils";
import { safe_send_message, panel_width } from "./panel";
import { build_settings_panel } from "./settings-menu";
import { ui_state, DAYS_IN_WEEK, MONTH_NAMES_SHORT, DAY_LABELS } from "./ui-state";
import type { CourseShape, ItemShape } from "../shared/types";

// Augments HTMLDivElement with week navigation state stored directly on the
// element to keep the chart self-contained without module-level variables.
interface FrequencyChartContainer extends HTMLDivElement {
    _todayWeekStart: number;
    _weekOffset: number;
    _calendar_container: HTMLElement;
}

export function create_frequency_chart(
    calendar_container: HTMLElement,
    items_by_date: Record<string, Array<{ item: ItemShape; course: CourseShape }>>,
    initial_week_offset: number = 0,
): void {
    const today = new Date();
    const today_week_start = getWeekStart(today);

    const chart_container = document.createElement("div") as unknown as FrequencyChartContainer;
    chart_container.className = "frequency-chart-container";
    chart_container.id = "frequency-chart";
    chart_container._todayWeekStart = today_week_start.getTime();
    chart_container._weekOffset = initial_week_offset;
    chart_container._calendar_container = calendar_container;

    const prev_btn = document.createElement("button");
    prev_btn.className = "frequency-chart-btn";
    prev_btn.textContent = "‹";
    prev_btn.disabled = true;
    prev_btn.id = "frequency-chart-prev";
    prev_btn.title = "Previous week";

    const next_btn = document.createElement("button");
    next_btn.className = "frequency-chart-btn";
    next_btn.textContent = "›";
    next_btn.id = "frequency-chart-next";
    next_btn.title = "Next week";

    const grid = document.createElement("div");
    grid.className = "frequency-chart-grid";
    grid.id = "frequency-chart-grid";

    const week_label_row = document.createElement("div");
    week_label_row.className = "frequency-chart-header-row";

    const week_label = document.createElement("div");
    week_label.className = "frequency-chart-week-label";
    week_label.id = "frequency-chart-week-label";

    const settings_btn = document.createElement("button");
    settings_btn.className = "spark-settings-btn";
    settings_btn.title = "Settings";
    settings_btn.textContent = "⚙";
    settings_btn.addEventListener("click", (e) => {
        e.stopPropagation();
        let settings_panel = document.getElementById("spark-settings-panel");
        if (!settings_panel) {
            settings_panel = build_settings_panel();
            document.body.appendChild(settings_panel);
        }
        settings_panel.classList.toggle("open");
        settings_panel.style.right = panel_width + "px";
    });
    week_label_row.appendChild(settings_btn);

    const refresh_btn = document.createElement("button");
    refresh_btn.className = "spark-refresh-btn";
    refresh_btn.title = "Refresh";
    refresh_btn.textContent = "↻";
    refresh_btn.addEventListener("click", (e) => {
        e.stopPropagation();
        refresh_btn.classList.add("spinning");
        refresh_btn.addEventListener("animationend", () => refresh_btn.classList.remove("spinning"), { once: true });
        if (ui_state.on_refresh) ui_state.on_refresh();
    });
    week_label_row.appendChild(refresh_btn);

    // Week label sits between the left buttons and the right FAQ button
    week_label_row.appendChild(week_label);

    const faq_spacer = document.createElement("div");
    faq_spacer.className = "spark-btn-spacer";
    week_label_row.appendChild(faq_spacer);

    const faq_btn = document.createElement("button");
    faq_btn.className = "faq-btn";
    faq_btn.title = "Help / FAQ";
    faq_btn.textContent = "?";
    faq_btn.addEventListener("click", (e) => {
        e.stopPropagation();
        safe_send_message({ action: Action.OPEN_FAQ });
    });
    week_label_row.appendChild(faq_btn);

    chart_container.appendChild(week_label_row);

    const chart_row = document.createElement("div");
    chart_row.className = "frequency-chart-row";
    chart_row.appendChild(prev_btn);
    chart_row.appendChild(grid);
    chart_row.appendChild(next_btn);
    chart_container.appendChild(chart_row);

    const last_fetched_el = document.createElement("div");
    last_fetched_el.className = "frequency-chart-last-fetched";
    last_fetched_el.textContent = ui_state.last_fetched_time
        ? "Last fetched: " + ui_state.last_fetched_time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })
        : "Last fetched: —";
    chart_container.appendChild(last_fetched_el);

    try {
        render_frequency_chart(chart_container, items_by_date, today_week_start, initial_week_offset, calendar_container);
        update_frequency_nav_buttons(chart_container);
    } catch (e) {
        console.error("Error rendering frequency chart:", e);
    }

    prev_btn.addEventListener("click", () => {
        try {
            const offset = chart_container._weekOffset;
            if (offset > 0) {
                chart_container._weekOffset = offset - 1;
                render_frequency_chart(chart_container, items_by_date, today_week_start, chart_container._weekOffset, calendar_container);
                update_frequency_nav_buttons(chart_container);
            }
        } catch (e) {
            console.error("Error in prev button click:", e);
        }
    });

    next_btn.addEventListener("click", () => {
        try {
            chart_container._weekOffset += 1;
            render_frequency_chart(chart_container, items_by_date, today_week_start, chart_container._weekOffset, calendar_container);
            update_frequency_nav_buttons(chart_container);
        } catch (e) {
            console.error("Error in next button click:", e);
        }
    });

    try {
        calendar_container.insertBefore(chart_container, calendar_container.firstChild);
    } catch (e) {
        console.error("Error inserting frequency chart:", e);
        calendar_container.appendChild(chart_container);
    }
}

function render_frequency_chart(
    chart_container: FrequencyChartContainer,
    items_by_date: Record<string, Array<{ item: ItemShape; course: CourseShape }>>,
    today_week_start: Date | number,
    week_offset: number,
    calendar_container: HTMLElement,
): void {
    try {
        const grid = chart_container.querySelector("#frequency-chart-grid");
        if (!grid) return;

        grid.innerHTML = "";
        if (!calendar_container) calendar_container = chart_container._calendar_container;

        let display_week_start: Date;
        if (typeof today_week_start === "number") {
            display_week_start = new Date(today_week_start);
        } else {
            display_week_start = new Date(today_week_start.getFullYear(), today_week_start.getMonth(), today_week_start.getDate());
        }
        display_week_start.setDate(display_week_start.getDate() + (week_offset * DAYS_IN_WEEK));

        const week_label_el = chart_container.querySelector("#frequency-chart-week-label");
        if (week_label_el) {
            week_label_el.textContent = `Week of ${MONTH_NAMES_SHORT[display_week_start.getMonth()]} ${display_week_start.getDate()}`;
        }

        // Count incomplete items per day — the chart reflects actionable workload
        const week_counts = [0, 0, 0, 0, 0, 0, 0];
        let max_count = 0;
        for (let i = 0; i < DAYS_IN_WEEK; i++) {
            const day_date = new Date(display_week_start);
            day_date.setDate(day_date.getDate() + i);
            const date_key = getDateKey(day_date);
            const count = items_by_date[date_key]?.filter(({ item }) => !item.completed).length || 0;
            week_counts[i] = count;
            max_count = Math.max(max_count, count);
        }

        for (let i = 0; i < DAYS_IN_WEEK; i++) {
            const day_date = new Date(display_week_start);
            day_date.setDate(day_date.getDate() + i);
            const count = week_counts[i];
            const height_percent = max_count === 0 ? 0 : (count / max_count) * 100;

            const day_cell = document.createElement("div");
            day_cell.className = "frequency-day";
            const today_check = new Date();
            if (
                day_date.getFullYear() === today_check.getFullYear() &&
                day_date.getMonth() === today_check.getMonth() &&
                day_date.getDate() === today_check.getDate()
            ) {
                day_cell.classList.add("frequency-day--today");
            }

            const day_label_el = document.createElement("div");
            day_label_el.className = "frequency-day-label";
            day_label_el.textContent = DAY_LABELS[i];
            day_cell.appendChild(day_label_el);

            const date_num = document.createElement("div");
            date_num.className = "frequency-day-date";
            date_num.textContent = day_date.getDate().toString();
            day_cell.appendChild(date_num);

            const bar_container = document.createElement("div");
            bar_container.className = "frequency-bar-container";
            const bar = document.createElement("div");
            bar.className = "frequency-bar";
            bar.style.height = height_percent + "%";
            bar_container.appendChild(bar);
            day_cell.appendChild(bar_container);

            const count_label = document.createElement("div");
            count_label.className = "frequency-day-count";
            count_label.textContent = count > 0 ? count.toString() : "—";
            day_cell.appendChild(count_label);

            day_cell.style.cursor = "pointer";
            day_cell.addEventListener("click", () => {
                scroll_to_date(calendar_container, day_date);
            });

            grid.appendChild(day_cell);
        }
    } catch (e) {
        console.error("Error in render_frequency_chart:", e);
    }
}

function scroll_to_date(calendar_container: HTMLElement, target_date: Date): void {
    try {
        const date_headers = Array.from(calendar_container.querySelectorAll(".calendar-date-header"));

        for (const header of date_headers) {
            const title_text = header.querySelector(".date-title")?.textContent || "";
            const date_match = title_text.match(/(\w+)\s+(\d+)/);

            if (date_match) {
                const month_str = date_match[1];
                const day = parseInt(date_match[2]);
                const month_index = MONTH_NAMES_SHORT.findIndex(m => m.toLowerCase().startsWith(month_str.toLowerCase()));

                if (month_index >= 0 && day === target_date.getDate() && month_index === target_date.getMonth()) {
                    // .calendar-date-header is position:sticky, so getBoundingClientRect().top
                    // returns the "stuck" position when scrolled past — not its natural layout position.
                    // Instead, measure its non-sticky sibling (.calendar-items-container) which always
                    // reflects the true layout position in the scrollable content.
                    const chart_el = calendar_container.querySelector("#frequency-chart");
                    const chart_height = chart_el ? chart_el.getBoundingClientRect().height : 0;
                    const container_rect = calendar_container.getBoundingClientRect();

                    const items_container = header.nextElementSibling as HTMLElement | null;
                    let target_scroll: number;
                    if (items_container) {
                        const items_rect = items_container.getBoundingClientRect();
                        const items_absolute_pos = items_rect.top - container_rect.top + calendar_container.scrollTop;
                        target_scroll = Math.max(0, items_absolute_pos - (header as HTMLElement).offsetHeight - chart_height);
                    } else {
                        const header_rect = header.getBoundingClientRect();
                        const absolute_pos = header_rect.top - container_rect.top + calendar_container.scrollTop;
                        target_scroll = Math.max(0, absolute_pos - chart_height);
                    }

                    calendar_container.scrollTo({ top: target_scroll, behavior: "smooth" });
                    return;
                }
            }
        }
    } catch (e) {
        console.error("Error scrolling to date:", e);
    }
}

function update_frequency_nav_buttons(chart_container: FrequencyChartContainer): void {
    try {
        const prev_btn = chart_container.querySelector<HTMLButtonElement>("#frequency-chart-prev");
        const next_btn = chart_container.querySelector<HTMLButtonElement>("#frequency-chart-next");
        if (!prev_btn || !next_btn) return;

        const offset = chart_container._weekOffset || 0;
        prev_btn.disabled = offset <= 0;
        next_btn.disabled = false;
    } catch (e) {
        console.error("Error updating frequency nav buttons:", e);
    }
}

export function scroll_to_today(): void {
    const cal = document.getElementById("calendar-container");
    if (cal) scroll_to_date(cal, new Date());
}
