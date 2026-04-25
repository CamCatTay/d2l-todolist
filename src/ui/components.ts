// Re-export barrel — the UI has been split into focused modules:
//   calendar.ts       — calendar list view (date rows, item cards, scrollbar indicator)
//   frequency-chart.ts — weekly bar chart and day-click scroll navigation
//   settings-menu.ts  — settings panel DOM builder and preference management
//   ui-state.ts       — shared constants, storage keys, and mutable state
//
// This file re-exports everything so existing import paths continue to work.

export {
    initialize_gui,
    update_gui,
    add_data_status_indicator,
    set_last_fetched_time,
    register_ui_callbacks,
    apply_settings,
} from "./calendar";

export { scroll_to_today } from "./frequency-chart";

export { build_settings_panel } from "./settings-menu";