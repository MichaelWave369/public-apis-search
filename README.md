# Public APIs Search

Public APIs Search is a fast, static, zero-dependency web app for discovering public APIs from [public-apis/public-apis](https://github.com/public-apis/public-apis).

**Live Demo:** https://michaelwave369.github.io/public-apis-search/

## v2 Highlights

- 🔎 Real-time search with relevance ranking (name > category > description)
- 🏷️ Auth / HTTPS / CORS filtering
- 🗂️ Popular categories + full category browser
- ⭐ Favorites with `localStorage` persistence
- 🧭 Shareable URLs for current view state
- 📤 Export filtered results to JSON and CSV (safe escaping)
- 🌙 Light/dark theme toggle with persistence
- 💾 Cache with stale fallback and refresh control
- 🧪 Lightweight utility tests with Node's built-in test runner
- 📱 Responsive, keyboard-friendly UI and accessible controls

## v1.0.0 Release Notes

Public v1.0.0 finalizes the project for stable public use with:

- improved reliability in parsing, cache fallback, and malformed data handling
- polished loading/empty/error states and better release metadata
- improved accessibility (labels, keyboard behavior, visible focus states)
- release-ready README, deployment docs, and roadmap notes

## Project Structure

```text
public-apis-search/
├── index.html
├── styles.css
├── app.js
├── tests/
│   └── utils.test.js
├── LICENSE
└── README.md
```

## Usage

1. Open the live demo, or run locally.
2. Search APIs by name, description, or category.
3. Apply filters and sorting controls.
4. Save favorites, export results, or share current filters via URL.

## Local Development

No build step is required.

### Run locally

```bash
python3 -m http.server 4173
```

Then open: `http://localhost:4173`

### Run tests

Requires Node.js 18+.

```bash
node --test tests/utils.test.js
```

## Deployment (GitHub Pages)

1. Push repository changes to GitHub.
2. Open **Settings → Pages**.
3. Select **Deploy from a branch**.
4. Choose your default branch and save.

Site URL format:

```text
https://<username>.github.io/public-apis-search/
```

## How It Works

1. The app loads persisted UI state (theme + filters) from URL and localStorage.
2. It attempts to read cached API data first.
3. If cache is missing/stale, it fetches the upstream README markdown.
4. A defensive parser extracts table rows, normalizes fields, and skips malformed rows.
5. Results are filtered/sorted client-side and rendered instantly.

## Reliability & Accessibility Notes

- If network fetch fails and stale cache exists, stale data is shown with clear status.
- If both fetch and cache fail, users see a retryable error state.
- Favorites and filters recover safely from malformed localStorage values.
- Clipboard actions degrade gracefully when blocked.
- Form controls are semantic and keyboard accessible with visible focus styles.

## Known Limitations

- Data quality depends on the upstream markdown format in `public-apis/public-apis`.
- Significant upstream format changes may require parser updates.

## Screenshots

- _Placeholder_: add screenshots in a future PR (recommended folder: `docs/screenshots/`).

## Roadmap (Post v1)

- Better fuzzy search + typo tolerance (while staying lightweight)
- Optional virtualized list mode for very large datasets
- Improved social preview image for richer link sharing

## License

MIT (see [LICENSE](LICENSE)).
