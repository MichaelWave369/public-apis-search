# Public APIs Search

A polished, dependency-free static web app for discovering public APIs from [public-apis/public-apis](https://github.com/public-apis/public-apis).

## Features

- Real-time search across API name, description, and category
- Filters for Auth, HTTPS, CORS, and Favorites
- Category browsing with quick toggle chips
- Sort by name (A→Z / Z→A) or category
- Favorites saved in `localStorage`
- Export current results to JSON or CSV
- Shareable URL state (query + filters + sort + category + favorites mode)
- Theme toggle (light/dark) with persistence
- Data caching in `localStorage` (6-hour TTL)
- Friendly loading / empty / error states with retry

## Project Structure

```text
public-apis-search/
├── index.html        # App markup and accessibility-friendly semantics
├── styles.css        # Theme + layout + responsive styles
├── app.js            # App logic + utility functions
├── tests/
│   └── utils.test.js # Lightweight Node tests for core utilities
└── README.md
```

## How It Works

1. `app.js` tries to load fresh cached data from `localStorage`.
2. If cache is stale/missing, it fetches the upstream README markdown.
3. The parser extracts API rows from markdown tables under `##` category headings.
4. Parsed records are normalized (auth values, missing fields), deduplicated, then cached.
5. Rendering is fully client-side: filters/sorting are applied in memory and synced to URL params.

## Reliability Notes

- Parser is intentionally defensive and skips malformed rows instead of crashing.
- If network fetch fails and stale cache exists, stale data is shown with a badge.
- If parsing fails entirely, users see an in-app error with a retry action.
- CSV export always quotes and escapes values to prevent broken files.
- Favorites are deduplicated using a stable API id key.

## Development

No build step and no dependencies are required.

### Run locally

Open `index.html` directly in your browser, or serve with a tiny static server:

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

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Set source to **Deploy from a branch** and choose your default branch.
4. Save.

Your app will be available at:

```text
https://<your-username>.github.io/public-apis-search/
```

## Upstream Data Limitation

This app depends on the markdown format used by `public-apis/public-apis` README tables. If upstream structure changes significantly, parsing may miss rows until parser rules are updated.

## License

MIT (see [LICENSE](LICENSE)).
