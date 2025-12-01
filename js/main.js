/* js/main.js — Unified script for NextLeap */
console.log('NextLeap main.js loaded');

// helper: get page filename
const page = (window.__NEXTLEAP_PAGE) ? window.__NEXTLEAP_PAGE : window.location.pathname.split('/').pop();

// common settings
const ITEMS_PER_PAGE = 6;

// helper fetcher
async function fetchJSON(path) {
  const res = await fetch(path, {cache: 'no-cache'});
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

/* ---------------- NAVBAR + MOBILE ---------------- */
(function initNav(){
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(a => {
    try {
      const href = a.getAttribute('href');
      if (href && href === page) a.classList.add('active');
    } catch(e){/*ignore*/}
  });

  const hamburger = document.querySelector('.hamburger');
  const navList = document.querySelector('.nav-links');
  if (hamburger && navList) {
    hamburger.addEventListener('click', () => navList.classList.toggle('open'));
  }
})();

/* ---------------- HOMEPAGE: featured products & posts ---------------- */
if (page === 'index.html') {
  // load featured products (first 4) and featured posts (first 3)
  Promise.all([
    fetchJSON('json/products.json').catch(()=>null),
    fetchJSON('json/blog.json').catch(()=>null)
  ]).then(([pData, bData])=>{
    const prodRoot = document.getElementById('home-products');
    const postRoot = document.getElementById('home-posts');

    if (pData && prodRoot) {
      // flatten products if stored under categories
      const products = (pData.categories) ?
        pData.categories.flatMap(cat => cat.subcategories.flatMap(sc => sc.products.map(prod => ({...prod, category: cat.name, subcategory: sc.name})))) :
        (pData.products || []);

      const featured = products.slice(0,4);
      prodRoot.innerHTML = featured.map(prod => `
        <div class="product-card">
          <img src="${prod.image_url||prod.image}" alt="${escapeHtml(prod.name)}">
          <h2>${escapeHtml(prod.name)}</h2>
          <p>${escapeHtml(prod.short_desc||prod.description||'')}</p>
          <p class="price">Ksh ${prod.price}</p>
          <a class="button" href="product.html?id=${prod.id}">View Product →</a>
        </div>
      `).join('');
    }

    if (bData && postRoot) {
      const posts = bData.posts || [];
      const latest = posts.slice(0,3);
      postRoot.innerHTML = latest.map(p => `
        <article class="post-card">
          <img src="${p.featured_image}" alt="${escapeHtml(p.title)}">
          <h3>${escapeHtml(p.title)}</h3>
          <p class="post-meta">${escapeHtml(p.author||'')} • ${escapeHtml(p.date||'')}</p>
          <p>${escapeHtml(p.excerpt)}</p>
          <a class="button" href="post.html?id=${p.id}">Read More →</a>
        </article>
      `).join('');
    }
  }).catch(err => console.warn(err));
}

/* ---------------- BLOG LIST PAGE (blog.html or posts.html) ---------------- */
if (page === 'blog.html' || page === 'posts.html') {
  (async ()=>{
    try {
      const data = await fetchJSON('json/blog.json');
      const allPosts = data.posts || [];
      const categories = data.categories || [];
      const tags = data.tags || [];

      const container = document.getElementById('posts-container');
      const paginationEl = document.getElementById('pagination');
      const catSel = document.getElementById('category-filter');
      const tagSel = document.getElementById('tag-filter');
      const searchInput = document.getElementById('search-input');

      // populate filters
      if (catSel) {
        catSel.innerHTML = `<option value="">All Categories</option>` + categories.map(c=>`<option value="${c}">${c}</option>`).join('');
      }
      if (tagSel) {
        tagSel.innerHTML = `<option value="">All Tags</option>` + tags.map(t=>`<option value="${t}">${t}</option>`).join('');
      }

      let filtered = allPosts.slice();
      let currentPage = 1;

      function renderPage(){
        const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
        const start = (currentPage-1)*ITEMS_PER_PAGE;
        const pageItems = filtered.slice(start, start+ITEMS_PER_PAGE);

        container.innerHTML = pageItems.map(p => `
          <article class="post-card">
            <img src="${p.featured_image}" alt="${escapeHtml(p.title)}">
            <h3>${escapeHtml(p.title)}</h3>
            <p class="post-meta">${escapeHtml(p.author||'')} • ${escapeHtml(p.date||'')} • ${escapeHtml(p.read_time||'')}</p>
            <p>${escapeHtml(p.excerpt)}</p>
            <div style="padding:0 1rem 1rem 1rem"><a class="button" href="post.html?id=${p.id}">Read More →</a></div>
          </article>
        `).join('') || '<p class="muted">No posts found.</p>';

        // pagination
        paginationEl.innerHTML = '';
        for (let i=1;i<=totalPages;i++){
          const btn = document.createElement('button');
          btn.className = `page-btn ${i===currentPage?'active':''}`;
          btn.textContent = i;
          btn.addEventListener('click', ()=>{ currentPage=i; window.scrollTo(0,0); renderPage(); });
          paginationEl.appendChild(btn);
        }
      }

      function applyFilters(){
        const q = (searchInput && searchInput.value.trim().toLowerCase()) || '';
        const cat = (catSel && catSel.value) || '';
        const tag = (tagSel && tagSel.value) || '';

        filtered = allPosts.filter(p=>{
          const matchQ = !q || ( (p.title||'').toLowerCase().includes(q) || (p.excerpt||'').toLowerCase().includes(q) || (p.content||'').toLowerCase().includes(q) );
          const matchCat = !cat || p.category === cat;
          const matchTag = !tag || (p.tags && p.tags.includes(tag));
          return matchQ && matchCat && matchTag;
        });
        currentPage = 1;
        renderPage();
      }

      // events
      if (searchInput) searchInput.addEventListener('input', applyFilters);
      if (catSel) catSel.addEventListener('change', applyFilters);
      if (tagSel) tagSel.addEventListener('change', applyFilters);

      // initial render
      renderPage();

    } catch(e) {
      console.error(e);
      const c = document.getElementById('posts-container');
      if (c) c.innerHTML = '<p class="muted">Unable to load posts.</p>';
    }
  })();
}

/* ---------------- SINGLE BLOG POST (post.html) ---------------- */
if (page === 'post.html') {
  (async ()=>{
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      const data = await fetchJSON('json/blog.json');
      const post = (data.posts || []).find(p => String(p.id) === String(id));
      const container = document.getElementById('post');
      if (!post) {
        if (container) container.innerHTML = '<h2>Post not found</h2>';
        return;
      }
      // set header/title
      const titleEl = document.getElementById('post-title');
      const metaEl = document.getElementById('post-meta');
      if (titleEl) titleEl.textContent = post.title;
      if (metaEl) metaEl.textContent = `${post.author || ''} • ${post.date || ''} • ${post.read_time || ''}`;

      if (container) container.innerHTML = `
        <img class="post-banner" src="${post.featured_image}" alt="${escapeHtml(post.title)}">
        <div class="content">${post.content}</div>
      `;

      // share buttons
      const shareRoot = document.getElementById('share-buttons');
      if (shareRoot) {
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(post.title);
        shareRoot.innerHTML = `
          <a class="button" target="_blank" href="https://www.facebook.com/sharer/sharer.php?u=${url}">Facebook</a>
          <a class="button" target="_blank" href="https://twitter.com/intent/tweet?text=${title}&url=${url}">Twitter</a>
          <a class="button" target="_blank" href="https://www.linkedin.com/sharing/share-offsite/?url=${url}">LinkedIn</a>
          <a class="button" target="_blank" href="https://api.whatsapp.com/send?text=${title}%20${url}">WhatsApp</a>
        `;
      }

    } catch(e) {
      console.error(e);
    }
  })();
}

/* ---------------- PRODUCTS LIST (products.html) ---------------- */
if (page === 'products.html') {
  (async ()=>{
    try {
      const data = await fetchJSON('json/products.json');
      // we expect structure: categories -> subcategories -> products (as earlier)
      // flatten
      const products = (data.categories) ?
        data.categories.flatMap(cat => cat.subcategories.flatMap(sc => sc.products.map(p => ({...p, category: cat.name, subcategory: sc.name})))) :
        (data.products || []);

      const container = document.getElementById('products-container');
      const paginationEl = document.getElementById('product-pagination');
      const catSel = document.getElementById('product-category');
      const searchInput = document.getElementById('product-search');

      // populate categories
      const cats = Array.from(new Set(products.map(p=>p.category)));
      if (catSel) catSel.innerHTML = `<option value="">All Categories</option>` + cats.map(c=>`<option value="${c}">${c}</option>`).join('');

      let filtered = products.slice();
      let current = 1;

      function render(){
        container.innerHTML = '';
        paginationEl.innerHTML = '';

        const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
        const start = (current-1)*ITEMS_PER_PAGE;
        const pageItems = filtered.slice(start, start+ITEMS_PER_PAGE);

        container.innerHTML = pageItems.map(p => `
          <article class="product-card">
            <img src="${p.image_url || p.image}" alt="${escapeHtml(p.name)}">
            <h3>${escapeHtml(p.name)}</h3>
            <p>${escapeHtml(p.short_desc || p.description || '')}</p>
            <p class="price">Ksh ${p.price}</p>
            <div style="padding:0 1rem 1rem 1rem"><a class="button" href="product.html?id=${p.id}">View Product →</a></div>
          </article>
        `).join('') || '<p class="muted">No products found.</p>';

        // pagination
        for (let i=1;i<=totalPages;i++){
          const btn = document.createElement('button');
          btn.className = `page-btn ${i===current?'active':''}`;
          btn.textContent = i;
          btn.addEventListener('click', ()=>{ current=i; render(); window.scrollTo(0,0); });
          paginationEl.appendChild(btn);
        }
      }

      function applyFilters(){
        const q = (searchInput && searchInput.value.trim().toLowerCase()) || '';
        const cat = (catSel && catSel.value) || '';
        filtered = products.filter(p=>{
          const matchQ = !q || p.name.toLowerCase().includes(q) || (p.short_desc && p.short_desc.toLowerCase().includes(q));
          const matchCat = !cat || p.category === cat;
          return matchQ && matchCat;
        });
        current = 1;
        render();
      }

      if (searchInput) searchInput.addEventListener('input', applyFilters);
      if (catSel) catSel.addEventListener('change', applyFilters);

      render();

    } catch(e) {
      console.error(e);
    }
  })();
}

/* ---------------- SINGLE PRODUCT (product.html) ---------------- */
if (page === 'product.html') {
  (async ()=>{
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      const data = await fetchJSON('json/products.json');
      const products = (data.categories) ?
        data.categories.flatMap(cat => cat.subcategories.flatMap(sc => sc.products.map(p => ({...p, category: cat.name, subcategory: sc.name})))) :
        (data.products || []);
      const product = products.find(p => String(p.id) === String(id));
      const root = document.getElementById('product');
      if (!product) { if (root) root.innerHTML = '<h2>Product not found</h2>'; return; }

      if (root) root.innerHTML = `
        <img class="product-banner" src="${product.image_url || product.image}" alt="${escapeHtml(product.name)}">
        <h1>${escapeHtml(product.name)}</h1>
        <p class="price">Ksh ${product.price}</p>
        <p>${escapeHtml(product.long_desc || product.description || '')}</p>
        <div style="margin-top:1rem;">
          <a class="button" href="${product.gumroad_link}" target="_blank">Buy on Gumroad</a>
          <a class="back-btn" href="products.html" style="margin-left:1rem;">← Back to products</a>
        </div>
      `;
    } catch(e) {
      console.error(e);
    }
  })();
}

/* ---------------- NEWSLETTER ---------------- */
(function initNewsletter(){
  const form = document.getElementById('newsletter-form');
  if (!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const email = (form.querySelector('input[name="email"]')||{}).value;
    // replace this block with integration (Mailchimp/ConvertKit)
    alert(`Subscribed: ${email} — integrate with your newsletter service.`);
    form.reset();
  });
})();

/* ---------------- TESTIMONIALS CAROUSEL ---------------- */
(function initTestimonials(){
  const root = document.getElementById('testimonials-container');
  if (!root) return;
  const items = Array.from(root.children);
  if (!items.length) return;
  items.forEach((it,i)=> { it.style.display = i===0 ? 'block' : 'none'; });
  let idx = 0;
  setInterval(()=> {
    items[idx].style.display = 'none';
    idx = (idx + 1) % items.length;
    items[idx].style.display = 'block';
  }, 4500);
})();

/* ---------------- UTILITIES ---------------- */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
    }
