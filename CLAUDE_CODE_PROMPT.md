# Claude Code Prompt: Public APIs Search App

## Context
You have a working Public APIs Search application with 4 files:
- index.html (complete app with inline CSS + JavaScript)
- README.md (documentation)
- .gitignore (git rules)
- LICENSE (MIT License)

The app searches through free public APIs from the public-apis/public-apis GitHub repository.

## Current Functionality
- Fetches API data from: https://raw.githubusercontent.com/public-apis/public-apis/master/README.md
- Real-time search by name, description, or category
- Filters by authentication type (OAuth, API Key, No Auth)
- Filters by HTTPS support
- Responsive grid layout with API cards
- Modern purple gradient UI with smooth animations
- Zero external dependencies

## Potential Enhancements

### High Priority
1. **Improve API parsing** - The current markdown parser may miss some APIs or extract incomplete data. Consider adding better regex patterns and fallback handling.
2. **Add caching** - Store fetched API data in localStorage with a timestamp to reduce API calls and improve load time on repeat visits.
3. **Sort options** - Add ability to sort by name (A-Z), most recently added, or by category.
4. **Category cloud** - Add a visual category tag cloud that shows all available categories and allows clicking to filter.
5. **API preview/details** - Show more details about an API when clicked (full description, link to docs, etc).

### Medium Priority
1. **Export functionality** - Allow users to export filtered results as JSON or CSV.
2. **Favorites/bookmarking** - Let users save favorite APIs to localStorage.
3. **Dark mode** - Add a dark mode toggle for better nighttime use.
4. **Advanced filters** - Add more filter options like CORS support, rate limit info, etc.
5. **Statistics dashboard** - Show stats like total APIs, breakdown by category, auth type distribution.
6. **Recent APIs** - Track and show recently viewed APIs.

### Nice to Have
1. **Share filters** - Generate shareable URLs that preserve current search/filters (URL parameters).
2. **API comparison** - Allow selecting multiple APIs to compare side-by-side.
3. **Keyboard shortcuts** - Add keyboard navigation (/, f for filter search, etc).
4. **PWA support** - Make it installable as a Progressive Web App.
5. **Notification** - Show when new APIs are available (check periodically).
6. **Multi-language support** - Translate UI to other languages.
7. **Better error handling** - More graceful fallbacks if GitHub API is down.

## Guidelines
- Keep the app lightweight and fast (no heavy frameworks)
- Maintain responsive design for mobile/tablet
- Preserve the current beautiful gradient UI aesthetic
- Keep all code in single index.html file OR split if it becomes unwieldy
- Ensure cross-browser compatibility
- Test thoroughly before suggesting changes
- Document any new features in README.md

## Current Issues to Fix (if any)
- The markdown parser may not catch all APIs correctly - verify parsing accuracy
- Loading time could be improved with caching
- Some APIs might have missing or truncated descriptions

## Your Task
When I ask you to improve or add features to this app, use this context to:
1. Understand the current implementation
2. Suggest meaningful enhancements
3. Implement changes while maintaining code quality
4. Update documentation as needed
5. Ensure the app remains fast and lightweight

Feel free to suggest improvements proactively or ask clarifying questions about desired features.
