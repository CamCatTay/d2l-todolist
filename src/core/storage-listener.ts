import { COURSE_DATA, HIDDEN_COURSES, HIDDEN_TYPES, IS_FETCHING, LAST_FETCH_COMPLETED_AT, USER_SETTINGS } from "../shared/constants/storage-keys";
import { apply_setting_change, apply_user_settings } from "./settings";
import { apply_state_change, get_state } from "./state";
import { update_calendar } from "../ui/calendar";
import { update_settings_course_list } from "../ui/settings-menu";
import { update_last_fetched_label } from "../ui/fetch-indicator";

// Anytime storage value is changed local variables and gui states are updated from here
export function initialize_storage_listener(): void {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "sync") {
            if (changes[USER_SETTINGS]) {
                apply_user_settings(changes[USER_SETTINGS].newValue ?? {});
                update_calendar(get_state(COURSE_DATA));
            }
        }

        if (area === "session") {
            if (changes[HIDDEN_COURSES]) apply_setting_change(HIDDEN_COURSES, changes[HIDDEN_COURSES].newValue);
            if (changes[HIDDEN_TYPES]) apply_setting_change(HIDDEN_TYPES, changes[HIDDEN_TYPES].newValue);
        }

        if (area === "local") {
            if (changes[COURSE_DATA]) {
                apply_state_change(COURSE_DATA, changes[COURSE_DATA].newValue);
                update_settings_course_list(get_state(COURSE_DATA));
                update_calendar(get_state(COURSE_DATA));
            }
            if (changes[LAST_FETCH_COMPLETED_AT]) {
                apply_state_change(LAST_FETCH_COMPLETED_AT, changes[LAST_FETCH_COMPLETED_AT].newValue);
                update_last_fetched_label(get_state(LAST_FETCH_COMPLETED_AT));
            }
            if (changes[IS_FETCHING]) apply_state_change(IS_FETCHING, changes[IS_FETCHING].newValue);
        }
    });
}