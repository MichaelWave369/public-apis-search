/*
  Public APIs Search v2
  - zero dependencies
  - static-host friendly (GitHub Pages)
  - utility functions exported for Node tests
*/
(function () {
  // ---------------------------------------------------------------------------
  // Config / constants
  // ---------------------------------------------------------------------------
  const CONFIG = {
    dataUrl: 'https://raw.githubusercontent.com/public-apis/public-apis/master/README.md',
    cacheKey: 'public_apis_v2_cache',
    cacheTtlMs: 6 * 60 * 60 * 1000,
    filtersKey: 'public_apis_v2_filters',
    favoritesKey: 'public_apis_v2_favorites',
    themeKey: 'public_apis_theme',
    pinnedCategoryCount: 8,
  };

  // ---------------------------------------------------------------------------
  // Utility helpers (pure)
  // ---------------------------------------------------------------------------
  function safeText(value) {
    return String(value ?? '').replace(/<[^>]*>/g, '').replace(/`/g, '').trim();
  }

  function normalizeAuth(value) {
    const raw = safeText(value);
    const low = raw.toLowerCase();
    if (!low || low === 'no' || low === 'none') return 'No';
    if (low === 'api key' || low === 'apikey') return 'apiKey';
    if (low === 'oauth' || low === 'oauth2') return 'OAuth';
    return raw;
  }

  function sanitizeCors(value) {
    const v = safeText(value);
    if (!v) return 'Unknown';
    const low = v.toLowerCase();
    if (low === 'yes') return 'Yes';
    if (low === 'no') return 'No';
    return v;
  }

  function sanitizeHttps(value) {
    const v = safeText(value);
    if (!v) return 'No';
    return /^yes$/i.test(v) ? 'Yes' : (/^no$/i.test(v) ? 'No' : v);
  }

  function isLikelyHttpUrl(value) {
    return /^https?:\/\//i.test(String(value || '').trim());
  }

  function parseTableLine(line) {
    const t = String(line || '').trim();
    if (!t.includes('|')) return null;
    if (/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(t)) return null;

    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((part) => safeText(part));
    if (cells.length < 4) return null;
    return cells;
  }

  function extractMarkdownLink(cell) {
    const text = safeText(cell);
    const md = text.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (md) {
      return { name: safeText(md[1]), link: safeText(md[2]) };
    }
    return { name: text, link: '' };
  }

  function normalizeApiRow(cells, category) {
    const first = cells[0] || '';
    if (/^api$/i.test(first)) return null;

    const { name, link } = extractMarkdownLink(first);
    if (!name || /^\W+$/.test(name)) return null;

    return {
      name,
      description: safeText(cells[1]) || 'No description provided.',
      auth: normalizeAuth(cells[2]),
      https: sanitizeHttps(cells[3]),
      cors: sanitizeCors(cells[4]),
      category: safeText(category) || 'Other',
      link: isLikelyHttpUrl(link) ? link : '',
    };
  }

  function apiId(api) {
    return `${api.name}::${api.category}::${api.link || ''}`;
  }

  function parseMarkdownAPIs(markdown) {
    const lines = String(markdown || '').split(/\r?\n/);
    const apis = [];
    const warnings = [];
    const seen = new Set();
    let category = '';

    const skipSections = new Set(['index', 'contributing', 'license']);

    for (const line of lines) {
      const heading = line.match(/^##\s+(.+)$/);
      if (heading) {
        category = safeText(heading[1]);
        continue;
      }

      if (!category || skipSections.has(category.toLowerCase())) continue;
      const cells = parseTableLine(line);
      if (!cells) continue;

      const api = normalizeApiRow(cells, category);
      if (!api) {
        warnings.push(`Skipped malformed row in category '${category}'`);
        continue;
      }

      const key = apiId(api).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      apis.push(api);
    }

    if (!apis.length) warnings.push('No API rows parsed. Upstream format may have changed.');
    return { apis, warnings };
  }

  function scoreApi(api, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return 0;

    const name = api.name.toLowerCase();
    const description = (api.description || '').toLowerCase();
    const category = (api.category || '').toLowerCase();

    let score = 0;
    if (name === q) score += 200;
    if (name.startsWith(q)) score += 120;
    if (name.includes(q)) score += 90;
    if (category === q) score += 80;
    if (category.includes(q)) score += 60;
    if (description.includes(q)) score += 30;

    // Token bonus for multi-word query
    const parts = q.split(/\s+/).filter(Boolean);
    for (const p of parts) {
      if (name.includes(p)) score += 20;
      if (category.includes(p)) score += 10;
      if (description.includes(p)) score += 6;
    }
    return score;
  }

  function filterAndSortAPIs(apis, filters, favoritesSet) {
    const query = String(filters.query || '').trim();
    const queryLow = query.toLowerCase();

    const result = [];
    for (const api of apis || []) {
      if (filters.auth && String(api.auth).toLowerCase() !== String(filters.auth).toLowerCase()) continue;
      if (filters.https && String(api.https).toLowerCase() !== String(filters.https).toLowerCase()) continue;
      if (filters.cors && String(api.cors).toLowerCase() !== String(filters.cors).toLowerCase()) continue;
      if (filters.category && api.category !== filters.category) continue;
      if (filters.favoritesOnly && !favoritesSet.has(apiId(api))) continue;

      if (queryLow) {
        const haystack = `${api.name} ${api.description} ${api.category}`.toLowerCase();
        if (!haystack.includes(queryLow)) continue;
      }

      result.push({ ...api, _score: scoreApi(api, queryLow) });
    }

    const sort = filters.sort || 'relevance';
    if (sort === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'name-desc') result.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === 'category') result.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    else result.sort((a, b) => b._score - a._score || a.name.localeCompare(b.name));

    return result;
  }

  function csvEscape(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  function toCSV(apis) {
    const headers = ['Name', 'Description', 'Auth', 'HTTPS', 'CORS', 'Category', 'Link'];
    const rows = (apis || []).map((api) => [api.name, api.description, api.auth, api.https, api.cors, api.category, api.link]);
    return [headers.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n');
  }

  function highlightText(text, query) {
    const q = String(query || '').trim();
    if (!q) return escapeHtml(text);
    const escaped = escapeRegExp(q);
    return escapeHtml(text).replace(new RegExp(`(${escaped})`, 'ig'), '<mark class="highlight">$1</mark>');
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function formatTime(ts) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }

  // ---------------------------------------------------------------------------
  // App
  // ---------------------------------------------------------------------------
  class PublicApisApp {
    constructor() {
      this.state = {
        apis: [],
        filtered: [],
        selectedCategory: '',
        favoritesOnly: false,
        compact: false,
        activeApiId: '',
        lastFetchTimestamp: 0,
        fromCache: false,
      };

      this.dom = this.getDom();
      this.restoreTheme();
      this.restoreFilters();
      this.bindEvents();
      this.renderSkeletons();
      this.bootstrap();
    }

    getDom() {
      const byId = (id) => document.getElementById(id);
      return {
        statsBar: byId('statsBar'),
        statTotal: byId('statTotal'),
        statCategories: byId('statCategories'),
        statHttps: byId('statHttps'),
        statNoAuth: byId('statNoAuth'),
        searchInput: byId('searchInput'),
        clearSearchBtn: byId('clearSearchBtn'),
        authFilter: byId('authFilter'),
        httpsFilter: byId('httpsFilter'),
        corsFilter: byId('corsFilter'),
        sortSelect: byId('sortSelect'),
        favOnlyBtn: byId('favOnlyBtn'),
        compactBtn: byId('compactBtn'),
        clearAllBtn: byId('clearAllBtn'),
        activeChips: byId('activeChips'),
        resultsCount: byId('resultsCount'),
        cacheStatus: byId('cacheStatus'),
        lastUpdated: byId('lastUpdated'),
        exportJSONBtn: byId('exportJSONBtn'),
        exportCSVBtn: byId('exportCSVBtn'),
        shareBtn: byId('shareBtn'),
        refreshBtn: byId('refreshBtn'),
        popularCategories: byId('popularCategories'),
        popularCategoryList: byId('popularCategoryList'),
        allCategories: byId('allCategories'),
        categoryList: byId('categoryList'),
        loadingContainer: byId('loadingContainer'),
        skeletonGrid: byId('skeletonGrid'),
        errorContainer: byId('errorContainer'),
        resultsContainer: byId('resultsContainer'),
        toast: byId('toast'),
        randomBtn: byId('randomBtn'),
        themeBtn: byId('themeBtn'),
        detailDialog: byId('detailDialog'),
        detailTitle: byId('detailTitle'),
        detailDescription: byId('detailDescription'),
        detailAuth: byId('detailAuth'),
        detailHttps: byId('detailHttps'),
        detailCors: byId('detailCors'),
        detailCategory: byId('detailCategory'),
        detailLink: byId('detailLink'),
        detailCopyBtn: byId('detailCopyBtn'),
        detailFavoriteBtn: byId('detailFavoriteBtn'),
        detailSourceBtn: byId('detailSourceBtn'),
        detailCloseBtn: byId('detailCloseBtn'),
      };
    }

    async bootstrap() {
      this.showLoading(true);
      const loaded = await this.loadData();
      this.showLoading(false);

      if (!loaded.apis.length) {
        this.renderError('Could not load API data. Upstream source may be unavailable or format changed.', true);
        return;
      }

      this.state.apis = loaded.apis;
      this.state.lastFetchTimestamp = loaded.timestamp;
      this.state.fromCache = loaded.fromCache;

      this.dom.statsBar.hidden = false;
      this.dom.refreshBtn.hidden = false;
      this.dom.popularCategories.hidden = false;
      this.dom.allCategories.hidden = false;

      this.renderStats();
      this.renderCategorySections();
      this.applyFilters();

      if (loaded.warnings.length) {
        this.toast('Loaded with minor parser warnings.');
      }
    }

    async loadData() {
      const cache = this.readCache();
      if (cache.fresh) {
        this.showCacheInfo(true, cache.timestamp, cache.ageMinutes, false);
        return { apis: cache.data, warnings: [], fromCache: true, timestamp: cache.timestamp };
      }

      try {
        const response = await fetch(CONFIG.dataUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const markdown = await response.text();
        const parsed = parseMarkdownAPIs(markdown);
        if (!parsed.apis.length) throw new Error('Parser returned 0 APIs');

        const payload = { data: parsed.apis, timestamp: Date.now() };
        this.writeCache(payload);
        this.showCacheInfo(false, payload.timestamp, 0, false);
        return { apis: parsed.apis, warnings: parsed.warnings, fromCache: false, timestamp: payload.timestamp };
      } catch (error) {
        if (cache.stale) {
          this.showCacheInfo(true, cache.timestamp, cache.ageMinutes, true);
          this.toast('Fetch failed. Showing stale cache.');
          return { apis: cache.data, warnings: [String(error.message)], fromCache: true, timestamp: cache.timestamp };
        }
        this.renderError(`Fetch failed: ${error.message}`, true);
        return { apis: [], warnings: [String(error.message)], fromCache: false, timestamp: 0 };
      }
    }

    readCache() {
      try {
        const raw = localStorage.getItem(CONFIG.cacheKey);
        if (!raw) return { fresh: false, stale: false, data: [], timestamp: 0, ageMinutes: 0 };
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.data) || typeof parsed.timestamp !== 'number') {
          return { fresh: false, stale: false, data: [], timestamp: 0, ageMinutes: 0 };
        }
        const age = Date.now() - parsed.timestamp;
        return {
          fresh: age <= CONFIG.cacheTtlMs,
          stale: age > CONFIG.cacheTtlMs,
          data: parsed.data,
          timestamp: parsed.timestamp,
          ageMinutes: Math.max(1, Math.round(age / 60000)),
        };
      } catch {
        return { fresh: false, stale: false, data: [], timestamp: 0, ageMinutes: 0 };
      }
    }

    writeCache(payload) {
      try { localStorage.setItem(CONFIG.cacheKey, JSON.stringify(payload)); } catch { /* ignore */ }
    }

    clearCache() {
      try { localStorage.removeItem(CONFIG.cacheKey); } catch { /* ignore */ }
    }

    getFavorites() {
      try {
        const parsed = JSON.parse(localStorage.getItem(CONFIG.favoritesKey) || '[]');
        return new Set(Array.isArray(parsed) ? parsed : []);
      } catch {
        return new Set();
      }
    }

    saveFavorites(set) {
      try { localStorage.setItem(CONFIG.favoritesKey, JSON.stringify([...set])); } catch { /* ignore */ }
    }

    persistFilters() {
      const payload = this.collectFilters();
      payload.selectedCategory = this.state.selectedCategory;
      payload.favoritesOnly = this.state.favoritesOnly;
      payload.compact = this.state.compact;
      try { localStorage.setItem(CONFIG.filtersKey, JSON.stringify(payload)); } catch { /* ignore */ }
    }

    restoreFilters() {
      const url = new URLSearchParams(window.location.search);
      const fromUrl = {
        query: url.get('q') || '',
        auth: url.get('auth') || '',
        https: url.get('https') || '',
        cors: url.get('cors') || '',
        sort: url.get('sort') || 'relevance',
        category: url.get('category') || '',
        favs: url.get('favs') === '1',
        compact: url.get('compact') === '1',
      };

      let fromStorage = {};
      try { fromStorage = JSON.parse(localStorage.getItem(CONFIG.filtersKey) || '{}') || {}; } catch { fromStorage = {}; }

      const merged = {
        query: fromUrl.query || fromStorage.query || '',
        auth: fromUrl.auth || fromStorage.auth || '',
        https: fromUrl.https || fromStorage.https || '',
        cors: fromUrl.cors || fromStorage.cors || '',
        sort: fromUrl.sort || fromStorage.sort || 'relevance',
        category: fromUrl.category || fromStorage.selectedCategory || '',
        favs: fromUrl.favs || Boolean(fromStorage.favoritesOnly),
        compact: fromUrl.compact || Boolean(fromStorage.compact),
      };

      this.dom.searchInput.value = merged.query;
      this.dom.authFilter.value = merged.auth;
      this.dom.httpsFilter.value = merged.https;
      this.dom.corsFilter.value = merged.cors;
      this.dom.sortSelect.value = merged.sort;
      this.state.selectedCategory = merged.category;
      this.state.favoritesOnly = merged.favs;
      this.state.compact = merged.compact;
      this.syncToggleButtons();
      this.dom.clearSearchBtn.hidden = !merged.query;
    }

    collectFilters() {
      return {
        query: this.dom.searchInput.value.trim(),
        auth: this.dom.authFilter.value,
        https: this.dom.httpsFilter.value,
        cors: this.dom.corsFilter.value,
        sort: this.dom.sortSelect.value || 'relevance',
      };
    }

    applyFilters() {
      const filters = this.collectFilters();
      this.state.filtered = filterAndSortAPIs(this.state.apis, {
        ...filters,
        category: this.state.selectedCategory,
        favoritesOnly: this.state.favoritesOnly,
      }, this.getFavorites());

      this.persistFilters();
      this.syncUrl(filters);
      this.renderFilterChips(filters);
      this.renderResults(filters.query);
      this.updateMeta();
    }

    syncUrl(filters) {
      const params = new URLSearchParams();
      if (filters.query) params.set('q', filters.query);
      if (filters.auth) params.set('auth', filters.auth);
      if (filters.https) params.set('https', filters.https);
      if (filters.cors) params.set('cors', filters.cors);
      if (filters.sort && filters.sort !== 'relevance') params.set('sort', filters.sort);
      if (this.state.selectedCategory) params.set('category', this.state.selectedCategory);
      if (this.state.favoritesOnly) params.set('favs', '1');
      if (this.state.compact) params.set('compact', '1');
      history.replaceState(null, '', `${location.pathname}${params.toString() ? `?${params}` : ''}`);
    }

    showCacheInfo(isCache, timestamp, ageMinutes, stale) {
      this.dom.cacheStatus.hidden = false;
      this.dom.lastUpdated.hidden = false;
      this.dom.cacheStatus.textContent = isCache ? (stale ? `stale cache · ${ageMinutes}m old` : `cached · ${ageMinutes}m old`) : 'fresh fetch';
      this.dom.lastUpdated.textContent = `updated ${formatTime(timestamp)}`;
    }

    updateMeta() {
      this.dom.resultsCount.textContent = this.state.filtered.length.toLocaleString();
      this.dom.resultsContainer.classList.toggle('compact', this.state.compact);
      this.syncToggleButtons();
    }

    syncToggleButtons() {
      this.dom.favOnlyBtn.classList.toggle('active', this.state.favoritesOnly);
      this.dom.favOnlyBtn.setAttribute('aria-pressed', String(this.state.favoritesOnly));
      this.dom.compactBtn.classList.toggle('active', this.state.compact);
      this.dom.compactBtn.setAttribute('aria-pressed', String(this.state.compact));
      this.dom.themeBtn.textContent = document.documentElement.dataset.theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
    }

    renderStats() {
      const apis = this.state.apis;
      this.dom.statTotal.textContent = apis.length.toLocaleString();
      this.dom.statCategories.textContent = new Set(apis.map((x) => x.category)).size.toLocaleString();
      this.dom.statHttps.textContent = apis.filter((x) => String(x.https).toLowerCase() === 'yes').length.toLocaleString();
      this.dom.statNoAuth.textContent = apis.filter((x) => x.auth === 'No').length.toLocaleString();
    }

    categoryCounts() {
      const counts = new Map();
      for (const api of this.state.apis) {
        counts.set(api.category, (counts.get(api.category) || 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }

    renderCategorySections() {
      const entries = this.categoryCounts();
      const pinned = entries.slice(0, CONFIG.pinnedCategoryCount);
      this.dom.popularCategoryList.innerHTML = pinned.map(([name, count]) => this.categoryButtonHtml(name, count)).join('');
      this.dom.categoryList.innerHTML = entries.map(([name, count]) => this.categoryButtonHtml(name, count)).join('');
    }

    categoryButtonHtml(name, count) {
      const active = this.state.selectedCategory === name;
      return `<button type="button" role="listitem" class="tag${active ? ' active' : ''}" data-category="${escapeHtml(name)}" aria-pressed="${active}">${escapeHtml(name)} (${count})</button>`;
    }

    renderFilterChips(filters) {
      const chips = [];
      if (filters.query) chips.push(`Search: ${filters.query}`);
      if (filters.auth) chips.push(`Auth: ${filters.auth}`);
      if (filters.https) chips.push(`HTTPS: ${filters.https}`);
      if (filters.cors) chips.push(`CORS: ${filters.cors}`);
      if (filters.sort && filters.sort !== 'relevance') chips.push(`Sort: ${filters.sort}`);
      if (this.state.selectedCategory) chips.push(`Category: ${this.state.selectedCategory}`);
      if (this.state.favoritesOnly) chips.push('Favorites only');
      if (this.state.compact) chips.push('Compact view');

      this.dom.activeChips.innerHTML = chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('');
    }

    renderResults(query) {
      const favorites = this.getFavorites();
      const q = String(query || '').trim();

      if (!this.state.filtered.length) {
        this.dom.resultsContainer.innerHTML = `
          <article class="empty">
            <h3>No results found</h3>
            <p>Try clearing filters, using a broader search term, or disabling favorites-only mode.</p>
          </article>
        `;
        return;
      }

      this.dom.resultsContainer.innerHTML = this.state.filtered.map((api) => {
        const id = apiId(api);
        const isFav = favorites.has(id);
        return `
          <article class="api-card" data-id="${escapeHtml(id)}">
            <div class="row">
              <h3 class="api-name">${highlightText(api.name, q)}</h3>
              <button class="btn btn-outline card-btn fav-toggle" type="button" data-id="${escapeHtml(id)}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}" aria-pressed="${isFav}">${isFav ? '★' : '☆'}</button>
            </div>
            <p class="api-desc">${highlightText(api.description, q)}</p>
            <div class="meta">
              <span class="badge">${highlightText(api.category, q)}</span>
              <span class="badge">Auth: ${escapeHtml(api.auth)}</span>
              <span class="badge">HTTPS: ${escapeHtml(api.https)}</span>
              <span class="badge">CORS: ${escapeHtml(api.cors)}</span>
            </div>
            <div class="actions">
              <button class="btn btn-outline card-btn detail-btn" type="button" data-id="${escapeHtml(id)}">Details</button>
              ${api.link ? `<a class="btn btn-outline card-btn" href="${escapeHtml(api.link)}" target="_blank" rel="noopener noreferrer">Open</a>` : '<span class="badge">No link</span>'}
            </div>
          </article>
        `;
      }).join('');
    }

    renderError(message, canRetry) {
      this.dom.errorContainer.innerHTML = `
        <article class="error-box">
          <p>${escapeHtml(message)}</p>
          ${canRetry ? '<button id="retryBtn" class="btn" type="button">Try again</button>' : ''}
        </article>
      `;
      if (canRetry) {
        document.getElementById('retryBtn')?.addEventListener('click', () => this.refreshData());
      }
    }

    showLoading(show) {
      this.dom.loadingContainer.hidden = !show;
      if (show) this.dom.errorContainer.innerHTML = '';
    }

    renderSkeletons() {
      this.dom.skeletonGrid.innerHTML = Array.from({ length: 6 }).map(() => '<div class="skeleton"></div>').join('');
    }

    toggleFavorite(id) {
      if (!id) return;
      const favs = this.getFavorites();
      if (favs.has(id)) favs.delete(id); else favs.add(id);
      this.saveFavorites(favs);
      this.applyFilters();
    }

    clearAll() {
      this.dom.searchInput.value = '';
      this.dom.authFilter.value = '';
      this.dom.httpsFilter.value = '';
      this.dom.corsFilter.value = '';
      this.dom.sortSelect.value = 'relevance';
      this.state.selectedCategory = '';
      this.state.favoritesOnly = false;
      this.dom.clearSearchBtn.hidden = true;
      this.renderCategorySections();
      this.applyFilters();
    }

    async shareUrl() {
      const url = window.location.href;
      try {
        await navigator.clipboard.writeText(url);
        this.toast('Share URL copied');
      } catch {
        this.toast('Copy failed. Use the address bar URL.');
      }
    }

    exportJson() {
      this.download(`public-apis-${Date.now()}.json`, JSON.stringify(this.state.filtered, null, 2), 'application/json');
      this.toast(`Exported ${this.state.filtered.length} rows as JSON`);
    }

    exportCsv() {
      this.download(`public-apis-${Date.now()}.csv`, toCSV(this.state.filtered), 'text/csv;charset=utf-8');
      this.toast(`Exported ${this.state.filtered.length} rows as CSV`);
    }

    download(filename, content, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    openDetail(id) {
      const api = this.state.filtered.find((item) => apiId(item) === id) || this.state.apis.find((item) => apiId(item) === id);
      if (!api) return;

      this.state.activeApiId = id;
      this.dom.detailTitle.textContent = api.name;
      this.dom.detailDescription.textContent = api.description;
      this.dom.detailAuth.textContent = api.auth;
      this.dom.detailHttps.textContent = api.https;
      this.dom.detailCors.textContent = api.cors;
      this.dom.detailCategory.textContent = api.category;

      if (api.link) {
        this.dom.detailLink.href = api.link;
        this.dom.detailLink.removeAttribute('aria-disabled');
        this.dom.detailLink.style.pointerEvents = '';
      } else {
        this.dom.detailLink.href = '#';
        this.dom.detailLink.setAttribute('aria-disabled', 'true');
        this.dom.detailLink.style.pointerEvents = 'none';
      }

      const isFav = this.getFavorites().has(id);
      this.dom.detailFavoriteBtn.textContent = isFav ? 'Remove favorite' : 'Add favorite';

      if (typeof this.dom.detailDialog.showModal === 'function') {
        this.lastFocused = document.activeElement;
        this.dom.detailDialog.showModal();
        this.dom.detailCloseBtn.focus();
      }
    }

    closeDetail() {
      if (this.dom.detailDialog.open) this.dom.detailDialog.close();
      if (this.lastFocused && typeof this.lastFocused.focus === 'function') this.lastFocused.focus();
    }

    async copyDetailLink() {
      const api = this.state.apis.find((item) => apiId(item) === this.state.activeApiId);
      if (!api || !api.link) {
        this.toast('No API link available');
        return;
      }
      try {
        await navigator.clipboard.writeText(api.link);
        this.toast('API link copied');
      } catch {
        this.toast('Copy failed');
      }
    }

    surpriseMe() {
      if (!this.state.filtered.length) {
        this.toast('No results to pick from');
        return;
      }
      const pick = this.state.filtered[Math.floor(Math.random() * this.state.filtered.length)];
      this.openDetail(apiId(pick));
    }

    refreshData() {
      this.clearCache();
      this.bootstrap();
      this.toast('Refreshing data...');
    }

    toggleTheme() {
      const dark = document.documentElement.dataset.theme === 'dark';
      document.documentElement.dataset.theme = dark ? '' : 'dark';
      try { localStorage.setItem(CONFIG.themeKey, dark ? '' : 'dark'); } catch { /* ignore */ }
      this.syncToggleButtons();
    }

    restoreTheme() {
      try {
        const stored = localStorage.getItem(CONFIG.themeKey);
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        if (stored === 'dark' || (stored === null && prefersDark)) {
          document.documentElement.dataset.theme = 'dark';
        }
      } catch { /* ignore */ }
      this.syncToggleButtons();
    }

    bindEvents() {
      const refilter = debounce(() => this.applyFilters(), 140);

      this.dom.searchInput.addEventListener('input', () => {
        this.dom.clearSearchBtn.hidden = !this.dom.searchInput.value;
        refilter();
      });
      this.dom.clearSearchBtn.addEventListener('click', () => {
        this.dom.searchInput.value = '';
        this.dom.clearSearchBtn.hidden = true;
        this.applyFilters();
        this.dom.searchInput.focus();
      });

      [this.dom.authFilter, this.dom.httpsFilter, this.dom.corsFilter, this.dom.sortSelect].forEach((el) => {
        el.addEventListener('change', () => this.applyFilters());
      });

      this.dom.favOnlyBtn.addEventListener('click', () => {
        this.state.favoritesOnly = !this.state.favoritesOnly;
        this.applyFilters();
      });

      this.dom.compactBtn.addEventListener('click', () => {
        this.state.compact = !this.state.compact;
        this.applyFilters();
      });

      this.dom.clearAllBtn.addEventListener('click', () => this.clearAll());
      this.dom.exportJSONBtn.addEventListener('click', () => this.exportJson());
      this.dom.exportCSVBtn.addEventListener('click', () => this.exportCsv());
      this.dom.shareBtn.addEventListener('click', () => this.shareUrl());
      this.dom.refreshBtn.addEventListener('click', () => this.refreshData());
      this.dom.randomBtn.addEventListener('click', () => this.surpriseMe());
      this.dom.themeBtn.addEventListener('click', () => this.toggleTheme());

      const onCategoryClick = (event) => {
        const btn = event.target.closest('[data-category]');
        if (!btn) return;
        const cat = btn.dataset.category || '';
        this.state.selectedCategory = this.state.selectedCategory === cat ? '' : cat;
        this.renderCategorySections();
        this.applyFilters();
      };
      this.dom.popularCategoryList.addEventListener('click', onCategoryClick);
      this.dom.categoryList.addEventListener('click', onCategoryClick);

      this.dom.resultsContainer.addEventListener('click', (event) => {
        const favBtn = event.target.closest('.fav-toggle');
        if (favBtn) {
          this.toggleFavorite(favBtn.dataset.id || '');
          return;
        }

        const detailBtn = event.target.closest('.detail-btn');
        if (detailBtn) {
          this.openDetail(detailBtn.dataset.id || '');
        }
      });

      this.dom.detailCloseBtn.addEventListener('click', () => this.closeDetail());
      this.dom.detailDialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        this.closeDetail();
      });
      this.dom.detailCopyBtn.addEventListener('click', () => this.copyDetailLink());
      this.dom.detailFavoriteBtn.addEventListener('click', () => {
        this.toggleFavorite(this.state.activeApiId);
        const isFav = this.getFavorites().has(this.state.activeApiId);
        this.dom.detailFavoriteBtn.textContent = isFav ? 'Remove favorite' : 'Add favorite';
      });

      // Keyboard shortcut: focus search with '/'
      document.addEventListener('keydown', (event) => {
        if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
          const tag = (event.target && event.target.tagName) || '';
          const inTypingElement = /INPUT|TEXTAREA|SELECT/.test(tag) || event.target?.isContentEditable;
          if (!inTypingElement) {
            event.preventDefault();
            this.dom.searchInput.focus();
          }
        }
      });
    }

    toast(message) {
      this.dom.toast.textContent = message;
      this.dom.toast.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => this.dom.toast.classList.remove('show'), 2000);
    }
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => new PublicApisApp());
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      safeText,
      normalizeAuth,
      parseTableLine,
      normalizeApiRow,
      parseMarkdownAPIs,
      scoreApi,
      filterAndSortAPIs,
      csvEscape,
      toCSV,
      apiId,
    };
  }
})();
