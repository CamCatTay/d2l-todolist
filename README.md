# Spark for Brightspace

A Chrome extension that adds a side panel to D2L (Brightspace) showing all your upcoming due dates across every enrolled course, without digging through individual course pages.

## What It Does

D2L buries assignment due dates across multiple pages and course tabs.
This extension fixes that by aggregating assignments, quizzes, and discussion deadlines from all your enrolled courses into a single chronological view.

- Fetches assignments, quizzes, and discussions from all enrolled courses
- Chronological calendar view with date headers and color-coded course indicators
- Frequency bar chart showing which days of the week have the most work due
- Color-coded urgency indicators (due soon, overdue)
- Persistent side panel — stays visible as you navigate between pages
- Works directly on D2L without any extra setup

## Installation (Manual or Web Store)

Note: This extension will work on any Chromium-based browser.
(Google Chrome, Microsoft Edge, Opera, Brave, etc.)

Install from Google Web Store:

Search "Spark for Brightspace" or use this [Link](https://chromewebstore.google.com/detail/spark-for-brightspace/blajgfkdhpfijoemghigapachifplibd)

Install manually:

1. Clone or download this repo
```bash
git clone https://github.com/CamCatTay/spark-for-brightspace.git
```

2. Install dependencies and build the extension
```bash
npm install
npm run build
```

3. Open Chrome and navigate to `chrome://extensions/`
4. Enable Developer Mode
5. Click Load unpacked and select the project folder
6. Navigate to any D2L course page — the side panel icon will appear

After any source change, run `npm run build` again and click the reload icon on the extension card.

## How It Works

The extension runs on D2L (Brightspace) pages and uses the D2L REST API to fetch enrollment and activity data for all your courses.
Results are displayed in a persistent side panel so you can stay oriented without leaving the page.
A background service worker handles API calls and keeps the panel in sync across multiple open D2L tabs.

## Roadmap

- [x] Fetch assignments from all courses
- [x] Side panel with due date display
- [x] Frequency graph to see what days of the week are the most dense
- [x] Color coded course names and notch indicators on scroll bar
- [x] Color-coded urgency indicators (due soon, overdue)
- [ ] Grade display alongside assignments
- [ ] Notifications / reminders for upcoming deadlines
- [ ] Export to calendar (Google Calendar / .ics)

## Contributing

Found a bug or have a feature idea? Open an issue. This is a side project but feedback is welcome.

## License

See [LICENSE](LICENSE) for full terms. Personal and educational use is permitted.
Redistribution and publishing under another identity is not.
