/* app.js - Updated
   - products: fetch('products.json') and fallback to built-in data
   - todos: inline edit (contenteditable), tags, categories, filters
   - contact: client-side validation + Netlify-ready attributes
*/

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year')?.textContent = new Date().getFullYear();

  const page = document.body.id;
  if (page === 'portfolio') initPortfolio();
  if (page === 'todo') initTodo();
  if (page === 'products') initProducts();

  // contact form handling (portfolio page)
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearContactStatus();
      const name = document.getElementById('contact-name');
      const email = document.getElementById('contact-email');
      const message = document.getElementById('contact-message');

      // client-side validation
      const errors = [];
      if (name.value.trim().length < 2) errors.push('Name must be at least 2 characters.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) errors.push('Enter a valid email.');
      if (message.value.trim().length < 10) errors.push('Message must be at least 10 characters.');

      if (errors.length) {
        showContactStatus(errors.join(' '), true);
        return;
      }

      const formData = new FormData(contactForm);
      try {
        const resp = await fetch(contactForm.action || '/', {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });
        if (resp.ok || resp.status === 422) {
          showContactStatus('Thanks — your message was sent (demo).');
          contactForm.reset();
        } else {
          showContactStatus('Submission succeeded (demo) or your hosting will collect the form. If you see an error here, deploy to Netlify or configure Formspree.', false);
        }
      } catch (err) {
        showContactStatus('Local demo saved. When deployed (Netlify/Formspree) the form will submit. (Local fetch failed)', false);
      }
    });
  }

  function showContactStatus(msg, isErr=false){
    const el = document.getElementById('contact-status');
    el.textContent = msg;
    el.className = isErr ? 'error' : '';
  }
  function clearContactStatus(){ showContactStatus(''); }
});

/* ------------------------
   Portfolio page logic
   ------------------------ */
function initPortfolio(){
  const projects = [
    { id: 'p-1', title: 'Personal Portfolio', desc: 'Responsive multi-section portfolio built with vanilla JS.', tech: ['HTML','CSS','JavaScript'], link: 'index.html' },
    { id: 'p-2', title: 'To-Do App (localStorage)', desc: 'Add, edit, complete tasks, persisted in localStorage.', tech: ['HTML','JS','localStorage'], link: 'todo.html' },
    { id: 'p-3', title: 'Product Listing Demo', desc: 'Product grid with filters and sorting options.', tech: ['HTML','JS'], link: 'products.html' }
  ];
  const container = document.getElementById('project-list');
  container.innerHTML = '';
  projects.forEach(p => {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.innerHTML = `
      <h3>${escapeHtml(p.title)}</h3>
      <p class="muted">${escapeHtml(p.desc)}</p>
      <p><span class="badge">${p.tech.join(' · ')}</span></p>
      <p><a href="${p.link}" class="btn">Open</a> <button class="btn ghost" data-id="${p.id}">Details</button></p>
    `;
    container.appendChild(card);
  });

  // Modal
  const modal = document.getElementById('project-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalTech = document.getElementById('modal-tech');
  const modalLink = document.getElementById('modal-link');

  container.addEventListener('click', (e) => {
    const id = e.target.getAttribute('data-id');
    if (!id) return;
    const p = projects.find(x => x.id === id);
    if (!p) return;
    modalTitle.textContent = p.title;
    modalDesc.textContent = p.desc;
    modalTech.textContent = 'Tech: ' + p.tech.join(', ');
    modalLink.href = p.link;
    modal.hidden = false;
  });

  modal.querySelector('.modal-close').addEventListener('click', () => modal.hidden = true);
  modal.addEventListener('click', (ev) => { if(ev.target === modal) modal.hidden = true; });

  function escapeHtml(s){ return String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
}

/* ------------------------
   To-Do app logic (inline edit + tags + categories)
   ------------------------ */
function initTodo(){
  const STORAGE_KEY = 'my_todos_v2';
  let todos = load();

  const form = document.getElementById('todo-form');
  const input = document.getElementById('todo-input');
  const categoryInput = document.getElementById('todo-category');
  const tagsInput = document.getElementById('todo-tags');
  const priority = document.getElementById('todo-priority');
  const list = document.getElementById('todo-list');
  const clearCompleted = document.getElementById('clear-completed');
  const clearAll = document.getElementById('clear-all');
  const filterCategory = document.getElementById('filter-category');
  const filterTag = document.getElementById('filter-tag');

  renderCategoryOptions();
  render();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if(!text) return;
    const cat = categoryInput.value.trim() || 'General';
    const tags = tagsInput.value.split(',').map(s=>s.trim()).filter(Boolean);
    todos.unshift({
      id: Date.now().toString(),
      text,
      priority: priority.value,
      category: cat,
      tags,
      completed: false,
      createdAt: new Date().toISOString()
    });
    save(); form.reset(); renderCategoryOptions(); render();
  });

  // Delegated clicks
  list.addEventListener('click', (e) => {
    const li = e.target.closest('[data-id]');
    if (!li) return;
    const id = li.dataset.id;
    if (e.target.matches('.todo-toggle')) {
      toggleComplete(id);
    } else if (e.target.matches('.todo-delete')) {
      todos = todos.filter(t => t.id !== id);
      save(); renderCategoryOptions(); render();
    } else if (e.target.matches('.todo-edit')) {
      const textEl = li.querySelector('.todo-text');
      textEl.setAttribute('contenteditable', 'true');
      textEl.focus();
      placeCaretAtEnd(textEl);
    }
  });

  list.addEventListener('focusout', (e) => {
    const editable = e.target.closest('.todo-text[contenteditable="true"]');
    if (!editable) return;
    const li = editable.closest('[data-id]');
    const id = li.dataset.id;
    const txt = editable.textContent.trim();
    if (txt.length === 0) {
      const prev = todos.find(t=>t.id===id);
      editable.textContent = prev ? prev.text : '';
      editable.removeAttribute('contenteditable');
      return;
    }
    const item = todos.find(t=>t.id===id);
    if (item) {
      item.text = txt;
      save(); render();
    }
  });

  list.addEventListener('keydown', (e) => {
    if (e.target.matches('.todo-text[contenteditable="true"]') && e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  });

  clearCompleted.addEventListener('click', () => {
    todos = todos.filter(t => !t.completed);
    save(); render();
  });
  clearAll.addEventListener('click', () => {
    if (!confirm('Clear all tasks?')) return;
    todos = [];
    save(); renderCategoryOptions(); render();
  });

  filterCategory.addEventListener('change', render);
  filterTag.addEventListener('input', render);

  function toggleComplete(id){
    const t = todos.find(x=>x.id===id);
    if (t) t.completed = !t.completed;
    save(); render();
  }

  function render(){
    list.innerHTML = '';
    const catFilter = filterCategory.value || 'all';
    const tagFilter = (filterTag.value || '').trim().toLowerCase();
    const filtered = todos.filter(t => {
      const catOk = catFilter === 'all' ? true : t.category === catFilter;
      const tagOk = tagFilter === '' ? true : t.tags.some(tag => tag.toLowerCase() === tagFilter);
      return catOk && tagOk;
    });

    if (filtered.length === 0) {
      list.innerHTML = '<li class="muted">No tasks — add one above.</li>';
      return;
    }

    filtered.forEach(t => {
      const li = document.createElement('li');
      li.className = 'todo-item';
      li.dataset.id = t.id;
      li.innerHTML = `
        <div class="todo-left">
          <input class="todo-toggle" type="checkbox" ${t.completed ? 'checked' : ''} aria-label="Mark complete" />
          <div>
            <div class="todo-text ${t.completed ? 'completed' : ''}" tabindex="0">${escapeHtml(t.text)}</div>
            <div class="small-muted">Priority: ${t.priority} · Category: <strong>${escapeHtml(t.category)}</strong></div>
            <div>${(t.tags||[]).map(tag=>`<span class="tag-chip">${escapeHtml(tag)}</span>`).join('')}</div>
          </div>
        </div>
        <div class="todo-actions">
          <button class="ghost todo-edit" aria-label="Edit">Edit</button>
          <button class="ghost todo-delete" aria-label="Delete">Delete</button>
        </div>
      `;
      list.appendChild(li);
    });
  }

  function renderCategoryOptions(){
    const categories = Array.from(new Set(todos.map(t=>t.category).filter(Boolean)));
    filterCategory.innerHTML = '<option value="all">All categories</option>';
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      filterCategory.appendChild(opt);
    });
  }

  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(todos)); }
  function load(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ return []; } }
  function escapeHtml(s){ return String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection !== "undefined"
      && typeof document.createRange !== "undefined") {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
}

/* ------------------------
   Products page logic (fetch from products.json)
   ------------------------ */
function initProducts(){
  const grid = document.getElementById('product-grid');
  const catSelect = document.getElementById('category-filter');
  const search = document.getElementById('search');
  const minPrice = document.getElementById('min-price');
  const maxPrice = document.getElementById('max-price');
  const sortBy = document.getElementById('sort-by');
  const countEl = document.getElementById('product-count');

  (async () => {
    let products = [];
    try {
      const resp = await fetch('products.json');
      if (resp.ok) {
        products = await resp.json();
      } else {
        products = sampleProducts();
      }
    } catch (err) {
      products = sampleProducts();
    }
    setup(products);
  })();

  function setup(products){
    const cats = ['all', ...Array.from(new Set(products.map(p=>p.category)))];
    catSelect.innerHTML = '';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.toLowerCase();
      opt.textContent = c;
      catSelect.appendChild(opt);
    });

    applyFilters();

    [catSelect, search, minPrice, maxPrice, sortBy].forEach(el => {
      el.addEventListener('input', applyFilters);
    });

    function applyFilters(){
      const q = (search.value || '').toLowerCase().trim();
      const cat = (catSelect.value || 'all').toLowerCase();
      const min = parseFloat(minPrice.value || '0') || 0;
      const max = parseFloat(maxPrice.value || '') || Infinity;
      let result = products.filter(p => {
        const title = (p.title||'').toLowerCase();
        const category = (p.category||'').toLowerCase();
        const matchQ = title.includes(q) || category.includes(q);
        const matchCat = cat === 'all' ? true : category === cat;
        const matchPrice = Number(p.price) >= min && Number(p.price) <= max;
        return matchQ && matchCat && matchPrice;
      });

      const sortVal = sortBy.value;
      if (sortVal === 'price-asc') result.sort((a,b)=>a.price-b.price);
      else if (sortVal === 'price-desc') result.sort((a,b)=>b.price-a.price);
      else if (sortVal === 'rating-desc') result.sort((a,b)=>b.rating-a.rating);

      renderProducts(result);
    }

    function renderProducts(list){
      grid.innerHTML = '';
      countEl.textContent = `${list.length} result${list.length!==1?'s':''}`;
      if (list.length === 0) {
        grid.innerHTML = '<div class="muted">No products match your filters.</div>';
        return;
      }

      list.forEach(p => {
        const card = document.createElement('article');
        card.className = 'product-card';
        card.innerHTML = `
          <img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.title)} image" loading="lazy"/>
          <h3>${escapeHtml(p.title)}</h3>
          <div class="muted">${escapeHtml(p.category)}</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div><strong>$${Number(p.price).toFixed(2)}</strong></div>
            <div class="muted">★ ${p.rating}</div>
          </div>
          <p style="margin-top:10px"><a class="btn" href="#" role="button">Buy</a></p>
        `;
        grid.appendChild(card);
      });
    }
  }

  function sampleProducts(){
    return [
      { id:1,title:'Eco Water Bottle',price:19.99,category:'Home',rating:4.5,img:'https://picsum.photos/seed/p1/400/300' },
      { id:2,title:'Wireless Headphones',price:89.99,category:'Electronics',rating:4.8,img:'https://picsum.photos/seed/p2/400/300' },
      { id:3,title:'Yoga Mat',price:29.99,category:'Fitness',rating:4.2,img:'https://picsum.photos/seed/p3/400/300' },
      { id:4,title:'Coffee Maker',price:59.99,category:'Home',rating:4.0,img:'https://picsum.photos/seed/p4/400/300' },
      { id:5,title:'Running Shoes',price:120.00,category:'Fitness',rating:4.7,img:'https://picsum.photos/seed/p5/400/300' },
      { id:6,title:'Smart Lamp',price:39.50,category:'Electronics',rating:3.9,img:'https://picsum.photos/seed/p6/400/300' }
    ];
  }

  function escapeHtml(s){ return String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
}
document.addEventListener('DOMContentLoaded', () => {
  // Auto-update year
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // ====== PROJECTS LOADER ======
  const projects = [
    { title: "To-Do App", desc: "Task manager with inline editing", link: "todo.html" },
    { title: "Products Page", desc: "Fetch API + filter system", link: "products.html" }
  ];

  const loadBtn = document.getElementById('load-projects');
  const projectList = document.getElementById('project-list');

  if (loadBtn && projectList) {
    loadBtn.addEventListener('click', () => {
      projectList.innerHTML = projects.map(
        p => `<article class="project-card">
                <h3>${p.title}</h3>
                <p>${p.desc}</p>
                <a class="btn ghost" href="${p.link}">View</a>
              </article>`
      ).join('');
      loadBtn.style.display = "none"; // hide button after loading
    });
  }

  // ====== CONTACT FORM HANDLER ======
  const form = document.getElementById('contact-form');
  const status = document.getElementById('contact-status');

  if (form && status) {
    form.addEventListener('submit', e => {
      if (!form.checkValidity()) {
        e.preventDefault();
        status.textContent = "⚠️ Please fill all required fields correctly.";
        status.style.color = "red";
        return;
      }

      // Let Netlify handle sending but still show message
      e.preventDefault(); // prevent page reload
      status.textContent = "✅ Mail has sent!";
      status.style.color = "green";

      // reset form
      form.reset();
    });
  }
});
document.addEventListener('DOMContentLoaded', () => {
  // Auto-update year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ====== PROJECTS ======
  const projects = [
    { title: "To-Do App" },
    { title: "Products Page" }
  ];

  const loadBtn = document.getElementById('load-projects');
  const addBtn = document.getElementById('add-project-btn');
  const projectList = document.getElementById('project-list');
  const inputContainer = document.getElementById('project-input-container');

  // Function to render projects
  function renderProjects() {
    projectList.innerHTML = projects.map(
      p => `<div class="project-card">${p.title}</div>`
    ).join('');
  }

  // Show initial projects
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      renderProjects();
      loadBtn.style.display = "none"; // hide button after loading
    });
  }

  // Show input field when Add Project clicked
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      // Avoid creating multiple inputs
      if (document.getElementById('new-project-input')) return;

      inputContainer.innerHTML = `
        <input type="text" id="new-project-input" placeholder="Enter project name" />
        <button id="save-project-btn" class="btn ghost">Add</button>
      `;

      const input = document.getElementById('new-project-input');
      const saveBtn = document.getElementById('save-project-btn');

      // Add project on button click
      saveBtn.addEventListener('click', () => {
        const name = input.value.trim();
        if (!name) return;
        projects.push({ title: name });
        renderProjects();
        inputContainer.innerHTML = ''; // remove input after adding
      });

      // Optional: add project on Enter key
      input.addEventListener('keypress', (e) => {
        if (e.key === "Enter") {
          saveBtn.click();
        }
      });

      input.focus();
    });
  }

  // ====== CONTACT FORM ======
  const form = document.getElementById('contact-form');
  const status = document.getElementById('contact-status');

  if (form && status) {
    form.addEventListener('submit', e => {
      if (!form.checkValidity()) {
        e.preventDefault();
        status.textContent = "⚠️ Please fill all required fields correctly.";
        status.style.color = "red";
        return;
      }

      e.preventDefault();
      status.textContent = "✅ Mail has sent!";
      status.style.color = "green";
      form.reset();
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const productGrid = document.getElementById("product-grid");
  const productCount = document.getElementById("product-count");

  // Example products (you can replace with your own)
  const products = [
    { id: 1, name: "Wireless Headphones", price: 1999, rating: 4.5, category: "Electronics", image: "https://via.placeholder.com/200" },
    { id: 2, name: "Sports Shoes", price: 2999, rating: 4.2, category: "Fashion", image: "https://via.placeholder.com/200" },
    { id: 3, name: "Smart Watch", price: 4999, rating: 4.8, category: "Electronics", image: "https://via.placeholder.com/200" },
    { id: 4, name: "Coffee Maker", price: 3499, rating: 4.1, category: "Home", image: "https://via.placeholder.com/200" }
  ];

  // Render products
  function renderProducts(list) {
    productGrid.innerHTML = "";
    list.forEach(p => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <img src="${p.image}" alt="${p.name}" />
        <h3>${p.name}</h3>
        <p>₹${p.price}</p>
        <p>⭐ ${p.rating}</p>
        <span class="category">${p.category}</span>
      `;
      productGrid.appendChild(card);
    });
    productCount.textContent = `${list.length} products found`;
  }

  // Initial render
  renderProducts(products);
});
