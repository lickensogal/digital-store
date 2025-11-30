console.log("NextLeap full system loaded.");

// --------------- PAGE DETECTION -----------------
const page = window.location.pathname.split("/").pop();

// GLOBAL STATE
let currentPage = 1;
const itemsPerPage = 6;

// ---------------- NAVBAR ----------------------
const navLinks = document.querySelectorAll(".nav-links a");
navLinks.forEach(link => {
  if (link.href.includes(page)) link.classList.add("active");
});

// Hamburger toggle for mobile
const hamburger = document.querySelector(".hamburger");
if (hamburger) {
  hamburger.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
}

// ---------------- BLOG LIST (posts.html) ----------------
if (page === "posts.html") {
  const container = document.getElementById("posts-container");
  const paginationContainer = document.getElementById("pagination");
  const categoryFilter = document.getElementById("category-filter");
  const tagFilter = document.getElementById("tag-filter");
  const searchInput = document.getElementById("search-input");

  let allPosts = [];
  let filteredPosts = [];

  fetch("blog.json")
    .then(res => res.json())
    .then(data => {
      allPosts = data.posts;
      filteredPosts = allPosts;

      // Populate dropdowns
      data.categories.forEach(cat => categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`);
      data.tags.forEach(tag => tagFilter.innerHTML += `<option value="${tag}">${tag}</option>`);

      renderPosts();
    });

  function renderPosts() {
    container.innerHTML = "";
    paginationContainer.innerHTML = "";

    const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredPosts.slice(start, start + itemsPerPage);

    currentItems.forEach(post => {
      container.innerHTML += `
      <div class="post-card">
        <img src="${post.featured_image}" alt="${post.title}">
        <h2>${post.title}</h2>
        <p class="category">${post.category}</p>
        <p>${post.excerpt}</p>
        <a class="button" href="post.html?id=${post.id}">Read More →</a>
      </div>`;
    });

    for (let i = 1; i <= totalPages; i++) {
      paginationContainer.innerHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changeBlogPage(${i})">${i}</button>`;
    }
  }

  window.changeBlogPage = num => { currentPage = num; renderPosts(); window.scrollTo(0,0); };

  function applyBlogFilters() {
    const search = searchInput.value.toLowerCase();
    const cat = categoryFilter.value;
    const tag = tagFilter.value;

    filteredPosts = allPosts.filter(post => {
      const matchCat = !cat || post.category === cat;
      const matchTag = !tag || post.tags.includes(tag);
      const matchSearch = post.title.toLowerCase().includes(search) || post.excerpt.toLowerCase().includes(search);
      return matchCat && matchTag && matchSearch;
    });

    currentPage = 1;
    renderPosts();
  }

  categoryFilter.addEventListener("change", applyBlogFilters);
  tagFilter.addEventListener("change", applyBlogFilters);
  searchInput.addEventListener("input", applyBlogFilters);
}

// ---------------- SINGLE BLOG POST (post.html) ----------------
if (page === "post.html") {
  const postContainer = document.getElementById("post");
  const postId = new URLSearchParams(window.location.search).get("id");

  fetch("blog.json")
    .then(res => res.json())
    .then(data => {
      const post = data.posts.find(p => p.id == postId);
      if (!post) { postContainer.innerHTML = "<h2>Post Not Found</h2>"; return; }

      document.title = post.title;
      postContainer.innerHTML = `
      <img class="post-banner" src="${post.featured_image}">
      <h1>${post.title}</h1>
      <p class="meta">${post.author} • ${post.date} • ${post.read_time}</p>
      <div class="content">${post.content}</div>
      <a class="back-btn" href="posts.html">← Back</a>`;
    });
}

// ---------------- PRODUCT LIST (products.html) ----------------
if (page === "products.html") {
  const container = document.getElementById("products-container");
  const paginationContainer = document.getElementById("product-pagination");
  const categoryFilter = document.getElementById("product-category");
  const searchInput = document.getElementById("product-search");

  let allProducts = [];
  let filteredProducts = [];

  fetch("products.json")
    .then(res => res.json())
    .then(data => {
      allProducts = data.products;
      filteredProducts = allProducts;

      [...new Set(data.products.map(p=>p.category))].forEach(cat => categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`);
      renderProducts();
    });

  function renderProducts() {
    container.innerHTML = "";
    paginationContainer.innerHTML = "";

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const start = (currentPage -1)*itemsPerPage;
    const currentItems = filteredProducts.slice(start,start+itemsPerPage);

    currentItems.forEach(prod => {
      container.innerHTML += `
      <div class="product-card">
        <img src="${prod.image}" alt="${prod.name}">
        <h2>${prod.name}</h2>
        <p>${prod.short_desc}</p>
        <p class="price">$${prod.price}</p>
        <a class="button" href="product.html?id=${prod.id}">View Product →</a>
      </div>`;
    });

    for(let i=1;i<=totalPages;i++){
      paginationContainer.innerHTML += `<button class="page-btn ${i===currentPage?'active':''}" onclick="changeProductPage(${i})">${i}</button>`;
    }
  }

  window.changeProductPage = num => { currentPage=num; renderProducts(); window.scrollTo(0,0); };

  function filterProducts() {
    const search = searchInput.value.toLowerCase();
    const cat = categoryFilter.value;

    filteredProducts = allProducts.filter(p => {
      const matchCat = !cat || p.category===cat;
      const matchSearch = p.name.toLowerCase().includes(search);
      return matchCat && matchSearch;
    });

    currentPage = 1;
    renderProducts();
  }

  categoryFilter.addEventListener("change", filterProducts);
  searchInput.addEventListener("input", filterProducts);
}

// ---------------- SINGLE PRODUCT (product.html) ----------------
if (page === "product.html") {
  const prodContainer = document.getElementById("product");
  const prodId = new URLSearchParams(window.location.search).get("id");

  fetch("products.json")
    .then(res => res.json())
    .then(data => {
      const prod = data.products.find(p=>p.id==prodId);
      if(!prod){ prodContainer.innerHTML="<h2>Product Not Found</h2>"; return; }

      document.title=prod.name;
      prodContainer.innerHTML=`
      <img class="product-banner" src="${prod.image}">
      <h1>${prod.name}</h1>
      <p class="price">$${prod.price}</p>
      <p>${prod.description}</p>
      <button class="buy-btn">Buy Now</button>
      <a class="back-btn" href="products.html">← Back</a>`;
    });
}

// ---------------- NEWSLETTER SUBMISSION (all pages) ----------------
const newsletterForm = document.getElementById("newsletter-form");
if(newsletterForm){
  newsletterForm.addEventListener("submit", e=>{
    e.preventDefault();
    const email = newsletterForm.querySelector("input[name='email']").value;
    alert(`Newsletter signup: ${email} (integrate with your service)`);
    newsletterForm.reset();
  });
}

// ---------------- TESTIMONIALS CAROUSEL ----------------
const testimonialsContainer = document.getElementById("testimonials-container");
if(testimonialsContainer){
  let testimonials = Array.from(testimonialsContainer.children);
  let tIndex = 0;
  testimonials.forEach((t,i)=>{if(i!==0)t.style.display="none";});
  setInterval(()=>{
    testimonials[tIndex].style.display="none";
    tIndex = (tIndex+1)%testimonials.length;
    testimonials[tIndex].style.display="block";
  },5000);
          }
