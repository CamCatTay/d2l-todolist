// Copyright (c) 2026 Tortuga Systems LLC. All rights reserved.
// See LICENSE file for terms of use.

import type { CourseData } from "../shared/types";
import { SettingsCss } from "../shared/constants/ui";
import { chrome_storage_get, chrome_storage_set } from "../shared/utils/chrome-storage-utils";
import { CALENDAR_DAYS_BACK, D2L_DARK_MODE, HIDDEN_COURSES, HIDDEN_TYPES, LAST_FETCH_COMPLETED_AT, SHOW_COMPLETED_ASSIGNMENTS, SHOW_ON_START, SPARK_DARK_MODE } from "../shared/constants/storage-keys";

/**
 * UI & Calendar Constants
 */
export const DAYS_IN_WEEK = 7;
export const CALENDAR_DAYS_BACK_DEFAULT = 7;
export const SETTINGS_MIN_DAYS_BACK = 0;
export const SETTINGS_MAX_DAYS_BACK = 365;

export const DUE_TODAY_COLOR = "#e8900c";
export const DUE_TOMORROW_COLOR = "#e7c21d";
export const OVERDUE_COLOR = "#e84040";

export const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ITEM_TYPES = [
    { key: "assignments", label: "Assignments" },
    { key: "quizzes", label: "Quizzes" },
    { key: "discussions", label: "Discussions" },
];

const COURSE_NAME_TRIM_WORDS = ["Section", "XLS", "Group", "Spring", "Fall", "Winter", "Summer"];

export async function get_calendar_days_back(): Promise<number> {
    const val = await chrome_storage_get(CALENDAR_DAYS_BACK);
    return typeof val === 'number' ? val : CALENDAR_DAYS_BACK_DEFAULT;
}

export async function get_dark_mode_enabled(): Promise<boolean> {
    return (await chrome_storage_get(SPARK_DARK_MODE)) ?? false;
}

export async function get_d2l_dark_mode_enabled(): Promise<boolean> {
    return (await chrome_storage_get(D2L_DARK_MODE)) ?? false;
}

export async function get_last_fetched_date(): Promise<Date | null> {
    const ts = await chrome_storage_get(LAST_FETCH_COMPLETED_AT);
    return ts ? new Date(ts) : null;
}

export async function get_hidden_courses(): Promise<Set<string>> {
    const list = await chrome_storage_get(HIDDEN_COURSES, "session");
    return new Set(list ?? []);
}

export async function set_dark_mode(enabled: boolean): Promise<void> {
    await chrome_storage_set(SPARK_DARK_MODE, enabled);
    sync_theme_to_dom();
}

export async function set_last_fetched(timestamp: number): Promise<void> {
    await chrome_storage_set(LAST_FETCH_COMPLETED_AT, timestamp);
}

export async function sync_theme_to_dom(): Promise<void> {
    const isDark = await get_dark_mode_enabled();
    const isD2LDark = await get_d2l_dark_mode_enabled();

    const html = document.documentElement;
    html.classList.toggle(SettingsCss.SPARK_DARK_MODE, isDark);
    html.classList.toggle(SettingsCss.SPARK_D2L_DARK_MODE, isD2LDark);
}

export function truncate_course_name(name: string): string {
    if (!name) return name;
    const pattern = COURSE_NAME_TRIM_WORDS
        .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");
    return name.replace(new RegExp(`\\s*(${pattern})\\b.*$`, "i"), "").trim();
}