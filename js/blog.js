// js/blog.js
// Blog listing functionality for NextLeap
// Loads json/posts.json and renders posts with search, filters, and pagination.

// Configuration
const POSTS_JSON = 'json/posts.json';
const POSTS_PER_PAGE = 6;
const DEBOUNCE_MS = 300;

// State
let allPosts = [];       // loaded posts array
let filteredPosts = [];  // posts after applying search & filters
let categories = [];     // top-level categories
let tags = [];           // global tags list

// DOM Elements (assumes blog.html has these IDs)
const blogContainer = document.getElementById('blog-container');
const paginationContainer = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categoryFilter');
const tagSelect = document.getElementById('tagFilter');

// Utility: read query param
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// Utility: update URL query params without reload
function updateURLParams(params) {
  const url = new URL(window.location.href);
  Object.keys(params).forEach(key => {
    if (params[key] === null || params[key] === undefined || params[key] === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, params[key]);
    }
  });
  history.replaceState(null, '', url.toString());
}

// Debounce helper
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Fetch posts.json and initialize
async function init() {
  try {
    const res = await fetch(POSTS_JSON, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to load ${POSTS_JSON}: ${res.status}`);
    const data = await res.json();

    // posts structure: data.posts (array), data.categories (array), data.tags (array)
    allPosts = Array.isArray(data.posts) ? data.posts.slice() : [];
    categories = Array.isArray(data.categories) ? data.categories.slice() : [];
    tags = Array.isArray(data.tags) ? data.tags.slice() : [];

    // Ensure posts have slug and date; fallback to id-based slug if missing
    allPosts = allPosts.map(p => {
      return {
        ...p,
        slug: p.slug || (p.title ? p.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') : `post-${p.id}`),
        date: p.date || '',
      };
    });

    populateFilters();
    applyInitialStateFromURL();
    applyFiltersAndRender();
    attachEventListeners();
  } catch (err) {
    console.error(err);
    blogContainer.innerHTML = '<p class="muted">Sorry, unable to load blog posts right now.</p>';
  }
}

// Populate category and tag selects
function populateFilters() {
  // Populate categories
  if (categorySelect && categories.length) {
    // clear and add default
    categorySelect.innerHTML = `<option value="all">All Categories</option>`;
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
  }

  // Populate tags
  if (tagSelect && tags.length) {
    tagSelect.innerHTML = `<option value="all">All Tags</option>`;
    tags.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      tagSelect.appendChild(opt);
    });
  }
}

// Attach input listeners
function attachEventListeners() {
  if (searchInput) {
    const debounced = debounce(() => {
      // reset to page 1 when new search
      updateURLParams({ page: 1, q: searchInput.value || null });
      applyFiltersAndRender();
    }, DEBOUNCE_MS);
    searchInput.addEventListener('input', debounced);
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      updateURLParams({ page: 1, category: categorySelect.value !== 'all' ? categorySelect.value : null });
      applyFiltersAndRender();
    });
  }

  if (tagSelect) {
    tagSelect.addEventListener('change', () => {
      updateURLParams({ page: 1, tag: tagSelect.value !== 'all' ? tagSelect.value : null });
      applyFiltersAndRender();
    });
  }

  // Pagination clicks are handled by links rendered in renderPagination()
}

// Apply initial filter state from URL params (page, q, category, tag)
function applyInitialStateFromURL() {
  const q = getQueryParam('q') || '';
  const category = getQueryParam('category') || 'all';
  const tag = getQueryParam('tag') || 'all';
  const page = parseInt(getQueryParam('page') || '1', 10) || 1;

  if (searchInput) searchInput.value = q;
  if (categorySelect) categorySelect.value = categories.includes(category) ? category : (category === 'all' ? 'all' : 'all');
  if (tagSelect) tagSelect.value = tags.includes(tag) ? tag : (tag === 'all' ? 'all' : 'all');

  // store page in state via URL; render will read page param
  updateURLParams({ page: page });
}

// Core: apply filters/search and render posts + pagination
function applyFiltersAndRender() {
  const q = (searchInput && searchInput.value.trim().toLowerCase()) || getQueryParam('q') || '';
  const selectedCategory = (categorySelect && categorySelect.value) || getQueryParam('category') || 'all';
  const selectedTag = (tagSelect && tagSelect.value) || getQueryParam('tag') || 'all';

  // Filter logic
  filteredPosts = allPosts.filter(post => {
    // Category filter
    const matchCategory = (selectedCategory === 'all') || (post.category === selectedCategory);

    // Tag filter
    const matchTag = (selectedTag === 'all') || (Array.isArray(post.tags) && post.tags.includes(selectedTag));

    // Search: search in title, excerpt, content
    const matchSearch = !q || (
      (post.title && post.title.toLowerCase().includes(q)) ||
      (post.excerpt && post.excerpt.toLowerCase().includes(q)) ||
      (post.content && post.content.toLowerCase().includes(q))
    );

    return matchCategory && matchTag && matchSearch;
  });

  renderPosts();
  renderPagination();
}

// Render posts for current page
function renderPosts() {
  const page = parseInt(getQueryParam('page') || '1', 10) || 1;
  const start = (page - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;
  const pagePosts = filteredPosts.slice(start, end);

  // Clear
  blogContainer.innerHTML = '';

  if (!pagePosts.length) {
    blogContainer.innerHTML = '<p class="muted">No posts found matching your criteria.</p>';
    return;
  }

  // Create cards
  pagePosts.forEach(post => {
    const card = document.createElement('article');
    card.className = 'post-card';

    // Ensure safe excerpt (strip HTML for excerpt preview)
    const excerptText = (post.excerpt) ? post.excerpt : stripHtml(post.content).slice(0, 160) + '...';

    card.innerHTML = `
      <a class="post-link" href="post.html?post=${encodeURIComponent(post.slug)}" aria-label="${escapeHtml(post.title)}">
        <div class="post-image">
          <img src="${escapeAttr(post.featured_image)}" alt="${escapeAttr(post.title)}">
        </div>
        <div class="post-body">
          <h3 class="post-title">${escapeHtml(post.title)}</h3>
          <p class="post-meta">${escapeHtml(post.author || '')} • ${escapeHtml(post.date || '')} • ${escapeHtml(post.read_time || '')}</p>
          <p class="post-excerpt">${escapeHtml(excerptText)}</p>
          <div class="post-tags">${renderTagList(post.tags || [])}</div>
          <div class="read-more"><button class="btn-secondary">Read More</button></div>
        </div>
      </a>
    `;
    blogContainer.appendChild(card);
  });
}

// Render pagination controls
function renderPagination() {
  const total = filteredPosts.length;
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  const currentPage = parseInt(getQueryParam('page') || '1', 10) || 1;

  // Clamp currentPage
  const page = Math.min(Math.max(currentPage, 1), totalPages);
  updateURLParams({ page });

  paginationContainer.innerHTML = '';

  if (totalPages <= 1) return;

  const ul = document.createElement('ul');
  ul.className = 'pagination-list';

  // Prev
  const prevLi = document.createElement('li');
  prevLi.innerHTML = createPageLink(page - 1, 'Prev', page > 1);
  ul.appendChild(prevLi);

  // Page numbers: show a window of pages
  const maxWindow = 7;
  let startPage = Math.max(1, page - Math.floor(maxWindow / 2));
  let endPage = Math.min(totalPages, startPage + maxWindow - 1);
  if (endPage - startPage < maxWindow - 1) {
    startPage = Math.max(1, endPage - maxWindow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const li = document.createElement('li');
    li.innerHTML = createPageLink(i, i.toString(), true, i === page);
    ul.appendChild(li);
  }

  // Next
  const nextLi = document.createElement('li');
  nextLi.innerHTML = createPageLink(page + 1, 'Next', page < totalPages);
  ul.appendChild(nextLi);

  paginationContainer.appendChild(ul);
}

// Create page link HTML (preserves q, category, tag params)
function createPageLink(pageNum, text, enabled = true, isActive = false) {
  if (!enabled) {
    return `<span class="pagination-disabled">${escapeHtml(text)}</span>`;
  }
  // Build URL preserving search/filter params
  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.set('page', pageNum);

  // If search input has value, preserve it; else remove
  const q = (searchInput && searchInput.value.trim()) || getQueryParam('q') || '';
  if (q) params.set('q', q); else params.delete('q');

  const category = (categorySelect && categorySelect.value) || getQueryParam('category') || '';
  if (category && category !== 'all') params.set('category', category); else params.delete('category');

  const tag = (tagSelect && tagSelect.value) || getQueryParam('tag') || '';
  if (tag && tag !== 'all') params.set('tag', tag); else params.delete('tag');

  const finalUrl = `${window.location.pathname}?${params.toString()}`;
  const activeClass = isActive ? 'pagination-active' : '';
  return `<a class="pagination-link ${activeClass}" href="${finalUrl}">${escapeHtml(text)}</a>`;
}

// Helpers to render tags list
function renderTagList(tagArr) {
  if (!Array.isArray(tagArr) || tagArr.length === 0) return '';
  return tagArr.slice(0, 5).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ');
}

// Simple HTML escape to prevent injection
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Escape attribute values (slightly different)
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

// Strip HTML (for excerpt fallback)
function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || div.innerText || '';
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
