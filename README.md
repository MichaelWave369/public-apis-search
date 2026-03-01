# Public APIs Search App

A fast, searchable web application for discovering and filtering free public APIs from the [public-apis/public-apis](https://github.com/public-apis/public-apis) GitHub repository.

## Features

- 🔍 **Real-time Search** - Instantly search across hundreds of APIs by name, description, or category
- 🔐 **Filter by Authentication** - Find APIs with OAuth, API Key, or no authentication requirements
- 🔒 **HTTPS Filter** - Filter for APIs that support HTTPS
- 📱 **Responsive Design** - Works great on desktop, tablet, and mobile devices
- ⚡ **Fast & Lightweight** - No heavy dependencies, pure vanilla JavaScript
- 🎨 **Beautiful UI** - Modern gradient design with smooth interactions

## Usage

Simply open `index.html` in your web browser or visit the live version (if deployed to GitHub Pages):

```
https://yourusername.github.io/public-apis-search/
```

### Local Development

1. Clone this repository
2. Open `index.html` in your browser
3. No build process or dependencies required!

## How It Works

1. The app fetches the latest README from the [public-apis GitHub repository](https://github.com/public-apis/public-apis)
2. It parses the markdown file to extract API information
3. Results are displayed in an interactive card layout
4. Search and filters are applied in real-time using JavaScript

## Filters Available

- **Search** - Search by API name, description, or category
- **Authentication Type** - OAuth, API Key, or No Auth
- **HTTPS Support** - Only show APIs with HTTPS

## Deployment to GitHub Pages

1. Create a new repository on GitHub named `public-apis-search`
2. Push the files to the main branch
3. Go to repository Settings → Pages
4. Select "Deploy from a branch" and choose "main"
5. Your app will be live at `https://yourusername.github.io/public-apis-search/`

## File Structure

```
public-apis-search/
├── index.html          # Main app file (HTML + CSS + JavaScript)
├── README.md          # This file
└── .gitignore         # Git ignore rules
```

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Initial load: ~2-3 seconds (fetching API data from GitHub)
- Search response: Instant (<100ms)
- No external dependencies
- ~40KB total size

## API Data Source

Data is pulled from: https://raw.githubusercontent.com/public-apis/public-apis/master/README.md

This is updated whenever the source repository is updated.

## Contributing

To improve this search app:

1. Fork the repository
2. Make your changes
3. Test locally
4. Submit a pull request

## Issues & Feedback

If you encounter any issues or have suggestions for improvements, please open an issue on GitHub.

## License

This project is open source and available under the MIT License. See LICENSE file for details.

## Related Projects

- [public-apis/public-apis](https://github.com/public-apis/public-apis) - The original API collection
- [APIsBench](https://apisrbench.com/) - API benchmarking tool
- [RapidAPI](https://rapidapi.com/) - API marketplace

## Tips

- Bookmark this page for quick API reference
- Use it as a resource when building projects
- Share it with your development team
- Check back regularly as new APIs are added

---

Made with ❤️ for developers. Happy coding!
