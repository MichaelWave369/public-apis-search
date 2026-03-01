# Public APIs Search App

A fast, searchable web application for discovering and filtering free public APIs from the [public-apis/public-apis](https://github.com/public-apis/public-apis) GitHub repository.

## Features

- 🔍 **Real-time Search** — Instantly search across hundreds of APIs by name, description, or category
- 🔐 **Filter by Authentication** — Find APIs with OAuth, API Key, or no authentication requirements
- 🔒 **HTTPS Filter** — Filter for APIs that support HTTPS
- 🌐 **CORS Filter** — Show only APIs with CORS support
- 🗂️ **Category Cloud** — Visual tag cloud with API counts; click any category to filter instantly
- 📊 **Statistics Dashboard** — Total APIs, number of categories, HTTPS count, and no-auth count at a glance
- ↕️ **Sort Options** — Sort results A→Z, Z→A, or by category
- ⭐ **Favorites** — Star APIs and filter to show saved favorites (persisted in localStorage)
- 💾 **Smart Caching** — API data is cached in localStorage for 6 hours, with a manual refresh button
- 📤 **Export** — Download filtered results as JSON or CSV
- 🔗 **Shareable URLs** — All active filters are reflected in the URL so you can share exact views
- 🌙 **Dark Mode** — Toggle between light and dark themes (respects system preference)
- 📱 **Responsive Design** — Works great on desktop, tablet, and mobile devices
- ⚡ **Fast & Lightweight** — No dependencies, pure vanilla JavaScript, single HTML file

## Usage

Open `index.html` in your web browser, or deploy to any static host (GitHub Pages, Netlify, etc.):

```
https://yourusername.github.io/public-apis-search/
```

### Local Development

1. Clone this repository
2. Open `index.html` in your browser
3. No build process or dependencies required!

## How It Works

1. On first load the app fetches the latest README from [public-apis/public-apis](https://github.com/public-apis/public-apis)
2. The markdown table is parsed to extract API name, description, auth type, HTTPS support, CORS support, category, and link
3. Parsed data is cached in `localStorage` for 6 hours to speed up repeat visits
4. Search and all filters are applied client-side in real-time using JavaScript

## Filters & Controls

| Control | Description |
|---|---|
| **Search box** | Full-text search across name, description, and category |
| **Auth Type** | Filter by OAuth, API Key, or No Auth |
| **HTTPS** | Show only HTTPS-enabled APIs |
| **CORS** | Show only CORS-supported APIs |
| **Sort** | Order results by name (A→Z / Z→A) or by category |
| **⭐ Favorites** | Toggle to show only starred APIs |
| **Category tags** | Click to filter by a specific category; click again to clear |
| **↓ JSON / ↓ CSV** | Export the currently visible results |
| **🔗 Share** | Copies a URL encoding all current filters to the clipboard |
| **↺ Refresh** | Clears the cache and re-fetches fresh data |
| **🌙 Dark Mode** | Toggles dark/light theme |

## Deployment to GitHub Pages

1. Fork or clone this repository
2. Push the files to your `main` branch
3. Go to repository **Settings → Pages**
4. Select **Deploy from a branch** and choose `main`
5. Your app will be live at `https://yourusername.github.io/public-apis-search/`

## File Structure

```
public-apis-search/
├── index.html   # Complete app — HTML + CSS + JavaScript (single file)
├── README.md    # This file
├── LICENSE      # MIT License
└── .gitignore   # Git ignore rules
```

## Browser Compatibility

Works on all modern browsers:
- Chrome / Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **First load** — ~1–3 seconds (fetches from GitHub on first visit)
- **Repeat visits** — Instant (served from localStorage cache, 6-hour TTL)
- **Search / filter** — Instant (<10 ms)
- **No external dependencies** — single ~18 KB HTML file

## Data Source

Data is pulled from:
```
https://raw.githubusercontent.com/public-apis/public-apis/master/README.md
```

Use the **↺ Refresh** button to force a fresh fetch at any time.

## Contributing

1. Fork the repository
2. Make your changes to `index.html`
3. Test locally in a browser
4. Submit a pull request

## License

MIT — see [LICENSE](LICENSE) for details.

## Related Projects

- [public-apis/public-apis](https://github.com/public-apis/public-apis) — The original API collection
- [RapidAPI](https://rapidapi.com/) — API marketplace

---

Made with ♥ for developers. Happy building!
