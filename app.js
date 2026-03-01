(function () {
  const CONFIG = {
    dataUrl: 'https://raw.githubusercontent.com/public-apis/public-apis/master/README.md',
    cacheKey: 'public_apis_v4',
    cacheTtlMs: 6 * 60 * 60 * 1000,
    favoritesKey: 'public_apis_favorites',
    themeKey: 'theme',
  };

  function normalizeAuth(raw) {
    const value = (raw || '').replace(/`/g, '').trim();
    const lower = value.toLowerCase();
    if (!lower || lower === 'no') return 'No';
    if (lower === 'apikey' || lower === 'api key') return 'apiKey';
    if (lower === 'oauth') return 'OAuth';
    return value;
  }

  function safeText(value) {
    return (value || '').replace(/`/g, '').replace(/<[^>]*>/g, '').trim();
  }

  function extractMdLink(cell) {
    const match = String(cell || '').match(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)[^)\s]*\)/i);
    if (!match) return { name: safeText(cell), link: '' };
    return { name: safeText(match[1]), link: safeText(match[2]) };
  }

  function parseTableLine(line) {
    const trimmed = line.trim();
    if (!trimmed.includes('|') || /^\|?\s*:?[-\s|]+:?\|?\s*$/.test(trimmed)) return null;
    const cells = trimmed
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => safeText(c));
    return cells.length >= 4 ? cells : null;
  }

  function parseMarkdownAPIs(markdown) {
    const text = String(markdown || '');
    if (!text.trim()) return { apis: [], warnings: ['Empty markdown response'] };

    const lines = text.split(/\r?\n/);
    const excludedSections = new Set(['index', 'license', 'contributing']);
    const seen = new Set();
    let category = '';
    const apis = [];
    const warnings = [];

    for (const line of lines) {
      const heading = line.match(/^##\s+(.+)$/);
      if (heading) {
        category = safeText(heading[1]);
        continue;
      }

      if (!category || excludedSections.has(category.toLowerCase())) continue;
      const cells = parseTableLine(line);
      if (!cells) continue;
      if (cells[0].toLowerCase() === 'api') continue;

      const { name, link } = extractMdLink(cells[0]);
      if (!name || /^\W*$/.test(name)) {
        warnings.push(`Skipped row missing API name in category ${category}`);
        continue;
      }

      const api = {
        name,
        description: safeText(cells[1]),
        auth: normalizeAuth(cells[2]),
        https: safeText(cells[3]) || 'No',
        cors: safeText(cells[4]) || 'Unknown',
        link,
        category,
      };

      const id = `${api.name.toLowerCase()}|${api.category.toLowerCase()}|${api.link.toLowerCase()}`;
      if (seen.has(id)) continue;
      seen.add(id);
      apis.push(api);
    }

    if (!apis.length) warnings.push('No API rows parsed from upstream README format');
    return { apis, warnings };
  }

  function filterAndSortAPIs(apis, filters, favoritesSet) {
    const query = (filters.query || '').toLowerCase().trim();
    const auth = (filters.auth || '').toLowerCase();
    const https = (filters.https || '').toLowerCase();
    const cors = (filters.cors || '').toLowerCase();

    const result = (apis || []).filter((api) => {
      if (query) {
        const bag = `${api.name} ${api.description} ${api.category}`.toLowerCase();
        if (!bag.includes(query)) return false;
      }
      if (auth && String(api.auth || '').toLowerCase() !== auth) return false;
      if (https && String(api.https || '').toLowerCase() !== https) return false;
      if (cors && String(api.cors || '').toLowerCase() !== cors) return false;
      if (filters.category && api.category !== filters.category) return false;
      if (filters.favoritesOnly && !favoritesSet.has(apiId(api))) return false;
      return true;
    });

    if (filters.sort === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filters.sort === 'name-desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (filters.sort === 'category') {
      result.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    }

    return result;
  }

  function toCSV(apis) {
    const headers = ['Name', 'Description', 'Auth', 'HTTPS', 'CORS', 'Category', 'Link'];
    const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = (apis || []).map((api) => [
      api.name,
      api.description,
      api.auth,
      api.https,
      api.cors,
      api.category,
      api.link,
    ]);
    return [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
  }

  function apiId(api) {
    return `${api.name}::${api.category}::${api.link}`;
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  class APISearchApp {
    constructor() {
      this.state = {
        apis: [],
        filtered: [],
        selectedCategory: '',
        favoritesOnly: false,
        parserWarnings: [],
      };
      this.els = this.getElements();
      this.loadTheme();
      this.loadFiltersFromUrl();
      this.bindEvents();
      this.bootstrap();
    }

    getElements() {
      const q = (id) => document.getElementById(id);
      return {
        themeBtn: q('themeBtn'),
        statsBar: q('statsBar'),
        statTotal: q('statTotal'),
        statCategories: q('statCategories'),
        statHttps: q('statHttps'),
        statNoAuth: q('statNoAuth'),
        searchInput: q('searchInput'),
        authFilter: q('authFilter'),
        httpsFilter: q('httpsFilter'),
        corsFilter: q('corsFilter'),
        sortSelect: q('sortSelect'),
        favFilterBtn: q('favFilterBtn'),
        resultsCount: q('resultsCount'),
        cacheBadge: q('cacheBadge'),
        exportJSONBtn: q('exportJSONBtn'),
        exportCSVBtn: q('exportCSVBtn'),
        shareBtn: q('shareBtn'),
        refreshBtn: q('refreshBtn'),
        categoriesSection: q('categoriesSection'),
        categoriesContainer: q('categoriesContainer'),
        errorContainer: q('errorContainer'),
        loadingContainer: q('loadingContainer'),
        resultsContainer: q('resultsContainer'),
        toast: q('toast'),
      };
    }

    async bootstrap() {
      this.showLoading(true);
      const fetchResult = await this.fetchWithCache();
      this.state.apis = fetchResult.apis;
      this.state.parserWarnings = fetchResult.warnings;
      this.showLoading(false);

      if (!this.state.apis.length) {
        this.renderError('We could not parse API entries from upstream data. Please refresh and try again.', true);
        return;
      }

      this.els.statsBar.hidden = false;
      this.els.categoriesSection.hidden = false;
      this.els.refreshBtn.hidden = false;
      this.renderStats();
      this.renderCategories();
      this.applyFiltersAndRender();

      if (this.state.parserWarnings.length) {
        this.toast('Loaded with minor parser warnings.');
      }
    }

    async fetchWithCache() {
      const cache = this.readCache();
      if (cache.fresh) {
        this.els.cacheBadge.hidden = false;
        this.els.cacheBadge.textContent = `cached ${cache.ageMinutes}m ago`;
        return { apis: cache.data, warnings: [] };
      }

      try {
        const response = await fetch(CONFIG.dataUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const markdown = await response.text();
        const parsed = parseMarkdownAPIs(markdown);
        if (!parsed.apis.length) throw new Error('Parser could not find any API rows');
        this.writeCache(parsed.apis);
        this.els.cacheBadge.hidden = true;
        return parsed;
      } catch (error) {
        if (cache.stale) {
          this.toast('Network failed. Showing stale cached data.');
          this.els.cacheBadge.hidden = false;
          this.els.cacheBadge.textContent = `stale cache (${cache.ageHours}h old)`;
          return { apis: cache.data, warnings: ['Stale cache in use due to fetch error'] };
        }
        this.renderError(`Could not load API data (${error.message}).`, true);
        return { apis: [], warnings: [String(error.message)] };
      }
    }

    readCache() {
      try {
        const raw = localStorage.getItem(CONFIG.cacheKey);
        if (!raw) return { fresh: false, stale: false, data: [] };
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.data) || typeof parsed.timestamp !== 'number') {
          return { fresh: false, stale: false, data: [] };
        }
        const age = Date.now() - parsed.timestamp;
        return {
          fresh: age <= CONFIG.cacheTtlMs,
          stale: age > CONFIG.cacheTtlMs,
          data: parsed.data,
          ageMinutes: Math.round(age / 60000),
          ageHours: Math.round(age / 3600000),
        };
      } catch {
        return { fresh: false, stale: false, data: [] };
      }
    }

    writeCache(data) {
      try {
        localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
      } catch {
        // storage may be unavailable
      }
    }

    getFavorites() {
      try {
        const data = JSON.parse(localStorage.getItem(CONFIG.favoritesKey) || '[]');
        return new Set(Array.isArray(data) ? data : []);
      } catch {
        return new Set();
      }
    }

    saveFavorites(set) {
      try {
        localStorage.setItem(CONFIG.favoritesKey, JSON.stringify([...set]));
      } catch {
        // ignore
      }
    }

    applyFiltersAndRender() {
      const filters = {
        query: this.els.searchInput.value,
        auth: this.els.authFilter.value,
        https: this.els.httpsFilter.value,
        cors: this.els.corsFilter.value,
        sort: this.els.sortSelect.value,
        category: this.state.selectedCategory,
        favoritesOnly: this.state.favoritesOnly,
      };
      this.state.filtered = filterAndSortAPIs(this.state.apis, filters, this.getFavorites());
      this.renderResults();
      this.updateUrl(filters);
    }

    renderStats() {
      const total = this.state.apis.length;
      const categories = new Set(this.state.apis.map((api) => api.category)).size;
      const https = this.state.apis.filter((api) => String(api.https).toLowerCase() === 'yes').length;
      const noAuth = this.state.apis.filter((api) => api.auth === 'No').length;

      this.els.statTotal.textContent = total.toLocaleString();
      this.els.statCategories.textContent = categories.toLocaleString();
      this.els.statHttps.textContent = https.toLocaleString();
      this.els.statNoAuth.textContent = noAuth.toLocaleString();
    }

    renderCategories() {
      const counts = this.state.apis.reduce((acc, api) => {
        acc[api.category] = (acc[api.category] || 0) + 1;
        return acc;
      }, {});
      const items = Object.entries(counts).sort((a, b) => b[1] - a[1]);

      this.els.categoriesContainer.innerHTML = items.map(([category, count]) => `
        <button
          type="button"
          role="listitem"
          class="category-tag${this.state.selectedCategory === category ? ' active' : ''}"
          data-category="${this.escapeHtml(category)}"
          aria-pressed="${this.state.selectedCategory === category}"
        >
          ${this.escapeHtml(category)} <span aria-hidden="true">(${count})</span>
        </button>
      `).join('');
    }

    renderResults() {
      const favorites = this.getFavorites();
      this.els.resultsCount.textContent = this.state.filtered.length.toLocaleString();
      this.els.errorContainer.innerHTML = '';

      if (!this.state.filtered.length) {
        const message = this.state.favoritesOnly
          ? 'No favorites match your current filters.'
          : 'No APIs match your current filters.';
        this.els.resultsContainer.innerHTML = `<article class="no-results"><p>${message}</p></article>`;
        return;
      }

      this.els.resultsContainer.innerHTML = this.state.filtered.map((api, idx) => {
        const id = apiId(api);
        const fav = favorites.has(id);
        return `
          <article class="api-card" data-index="${idx}">
            <header class="card-header">
              <h3 class="api-name">${this.escapeHtml(api.name)}</h3>
              <button class="fav-btn${fav ? ' active' : ''}" type="button" data-id="${this.escapeHtml(id)}" aria-pressed="${fav}" aria-label="${fav ? 'Remove from favorites' : 'Add to favorites'}">★</button>
            </header>
            <p class="api-description">${this.escapeHtml(api.description || 'No description available.')}</p>
            <div class="api-meta">
              <span class="badge badge-category">${this.escapeHtml(api.category)}</span>
              <span class="badge badge-auth">${this.escapeHtml(api.auth)}</span>
              <span class="badge badge-https">HTTPS: ${this.escapeHtml(api.https)}</span>
              <span class="badge badge-cors">CORS: ${this.escapeHtml(api.cors)}</span>
            </div>
            ${api.link ? `<a class="api-link" href="${this.escapeHtml(api.link)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(api.link)}</a>` : '<span class="api-link">No link provided</span>'}
          </article>
        `;
      }).join('');
    }

    renderError(message, withRetry) {
      this.els.errorContainer.innerHTML = `
        <article class="error-box">
          <p>${this.escapeHtml(message)}</p>
          ${withRetry ? '<p><button type="button" class="btn btn-sm" id="retryBtn">Try again</button></p>' : ''}
        </article>
      `;
      if (withRetry) {
        const retryBtn = document.getElementById('retryBtn');
        retryBtn?.addEventListener('click', () => this.refreshData());
      }
    }

    showLoading(visible) {
      this.els.loadingContainer.hidden = !visible;
    }

    toggleFavorite(id) {
      const favorites = this.getFavorites();
      if (favorites.has(id)) favorites.delete(id);
      else favorites.add(id);
      this.saveFavorites(favorites);
      this.applyFiltersAndRender();
    }

    exportJSON() {
      const json = JSON.stringify(this.state.filtered, null, 2);
      this.download(`apis-${Date.now()}.json`, json, 'application/json');
      this.toast(`Exported ${this.state.filtered.length} APIs to JSON`);
    }

    exportCSV() {
      const csv = toCSV(this.state.filtered);
      this.download(`apis-${Date.now()}.csv`, csv, 'text/csv;charset=utf-8');
      this.toast(`Exported ${this.state.filtered.length} APIs to CSV`);
    }

    download(filename, content, mime) {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    async copyShareUrl() {
      const url = window.location.href;
      try {
        await navigator.clipboard.writeText(url);
        this.toast('Share URL copied to clipboard');
      } catch {
        this.toast('Could not copy automatically. URL is in address bar.');
      }
    }

    refreshData() {
      try {
        localStorage.removeItem(CONFIG.cacheKey);
      } catch {
        // ignore
      }
      this.els.cacheBadge.hidden = true;
      this.bootstrap();
      this.toast('Refreshing API data...');
    }

    updateUrl(filters) {
      const p = new URLSearchParams();
      if (filters.query) p.set('q', filters.query);
      if (filters.auth) p.set('auth', filters.auth);
      if (filters.https) p.set('https', filters.https);
      if (filters.cors) p.set('cors', filters.cors);
      if (filters.sort) p.set('sort', filters.sort);
      if (filters.category) p.set('category', filters.category);
      if (filters.favoritesOnly) p.set('favs', '1');
      history.replaceState(null, '', `${location.pathname}${p.toString() ? `?${p}` : ''}`);
    }

    loadFiltersFromUrl() {
      const p = new URLSearchParams(location.search);
      this.els.searchInput.value = p.get('q') || '';
      this.els.authFilter.value = p.get('auth') || '';
      this.els.httpsFilter.value = p.get('https') || '';
      this.els.corsFilter.value = p.get('cors') || '';
      this.els.sortSelect.value = p.get('sort') || '';
      this.state.selectedCategory = p.get('category') || '';
      this.state.favoritesOnly = p.get('favs') === '1';
      this.els.favFilterBtn.classList.toggle('active', this.state.favoritesOnly);
      this.els.favFilterBtn.setAttribute('aria-pressed', String(this.state.favoritesOnly));
    }

    bindEvents() {
      this.els.themeBtn.addEventListener('click', () => this.toggleTheme());
      this.els.favFilterBtn.addEventListener('click', () => {
        this.state.favoritesOnly = !this.state.favoritesOnly;
        this.els.favFilterBtn.classList.toggle('active', this.state.favoritesOnly);
        this.els.favFilterBtn.setAttribute('aria-pressed', String(this.state.favoritesOnly));
        this.applyFiltersAndRender();
      });

      this.els.exportJSONBtn.addEventListener('click', () => this.exportJSON());
      this.els.exportCSVBtn.addEventListener('click', () => this.exportCSV());
      this.els.shareBtn.addEventListener('click', () => this.copyShareUrl());
      this.els.refreshBtn.addEventListener('click', () => this.refreshData());

      const onFilterChange = () => this.applyFiltersAndRender();
      this.els.searchInput.addEventListener('input', debounce(onFilterChange, 180));
      [this.els.authFilter, this.els.httpsFilter, this.els.corsFilter, this.els.sortSelect].forEach((el) => {
        el.addEventListener('change', onFilterChange);
      });

      this.els.categoriesContainer.addEventListener('click', (event) => {
        const tag = event.target.closest('.category-tag');
        if (!tag) return;
        const category = tag.dataset.category || '';
        this.state.selectedCategory = this.state.selectedCategory === category ? '' : category;
        this.renderCategories();
        this.applyFiltersAndRender();
      });

      this.els.resultsContainer.addEventListener('click', (event) => {
        const btn = event.target.closest('.fav-btn');
        if (!btn) return;
        this.toggleFavorite(btn.dataset.id || '');
      });
    }

    toggleTheme() {
      const dark = document.documentElement.dataset.theme === 'dark';
      document.documentElement.dataset.theme = dark ? '' : 'dark';
      this.els.themeBtn.textContent = dark ? '🌙 Dark mode' : '☀️ Light mode';
      try {
        localStorage.setItem(CONFIG.themeKey, dark ? '' : 'dark');
      } catch {
        // ignore
      }
    }

    loadTheme() {
      try {
        const stored = localStorage.getItem(CONFIG.themeKey);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (stored === 'dark' || (stored === null && prefersDark)) {
          document.documentElement.dataset.theme = 'dark';
          this.els.themeBtn.textContent = '☀️ Light mode';
        }
      } catch {
        // ignore
      }
    }

    toast(message) {
      this.els.toast.textContent = message;
      this.els.toast.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => this.els.toast.classList.remove('show'), 1800);
    }

    escapeHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      new APISearchApp();
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      parseMarkdownAPIs,
      filterAndSortAPIs,
      toCSV,
      normalizeAuth,
      parseTableLine,
      apiId,
    };
  }
})();
