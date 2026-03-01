# Public APIs Search (v2)

A polished, zero-dependency static web app for exploring APIs from [public-apis/public-apis](https://github.com/public-apis/public-apis).

## v2 Highlights

- Better search relevance (name > category > description)
- Search highlighting and instant live result counts
- Active filter chips + clear-all filters
- Popular (pinned) categories + full category browser
- Favorites mode, compact mode, and URL-synced state
- Accessible API detail modal (copy link, favorite toggle, open source list)
- Defensive parser with graceful fallback to stale cache
- Skeleton loading, cleaner empty/error states, and retry action
- CSV export with robust escaping (quotes/commas/line breaks)
- Keyboard shortcut `/` to focus search
- Surprise me button for random API detail

## File Structure

```text
public-apis-search/
├── index.html
├── styles.css
├── app.js
├── tests/
│   └── utils.test.js
└── README.md
```

## How It Works

1. App restores theme + filters (URL first, then localStorage).
2. It tries fresh cached data (`localStorage`) before network fetch.
3. If cache is stale or missing, it fetches the upstream README markdown.
4. Parser extracts and normalizes table rows per category, skipping malformed entries safely.
5. Results are filtered/sorted client-side, rendered quickly, and synced to URL.

## Development

No build step required.

### Run locally

Open `index.html` directly, or serve statically:

```bash
python3 -m http.server 4173
```

Visit: `http://localhost:4173`

### Run tests

Requires Node.js 18+:

```bash
node --test tests/utils.test.js
```

## Deployment (GitHub Pages)

1. Push to GitHub.
2. Go to **Settings → Pages**.
3. Select **Deploy from a branch** and choose your main branch.
4. Save.

Your URL will look like:

```text
https://<username>.github.io/public-apis-search/
```

## Known Limitations

- Data is parsed from upstream markdown tables; major upstream format changes can still require parser updates.
- If both fetch and cache fail, app shows an error state until retry succeeds.

## Screenshots

- Add screenshots here if desired (`docs/` folder suggested).

## License

MIT (see [LICENSE](LICENSE)).
