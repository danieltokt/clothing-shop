const $ = (sel) => document.querySelector(sel);
const money = (n) => Number(n).toLocaleString("ru-RU") + " ₽";
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadCart() {
  try { return JSON.parse(localStorage.getItem("cart")) || []; } catch { return []; }
}

const state = {
  products: [],
  activeCategory: "",
  cart: loadCart(),
  current: null,
  size: null,
};

/* ---------- API ---------- */
async function api(path, options = {}) {
  const res = await fetch(API_URL + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error("API error " + res.status);
  return res.json();
}

/* ---------- Каталог ---------- */
async function loadCategories() {
  try {
    const cats = await api("/categories/");
    const nav = $("#categories");
    nav.innerHTML =
      `<button class="chip active" data-slug="">Все</button>` +
      cats.map((c) => `<button class="chip" data-slug="${esc(c.slug)}">${esc(c.name)}</button>`).join("");
  } catch (e) { /* ошибку покажет loadProducts */ }
}

async function loadProducts() {
  const status = $("#status");
  status.style.display = "block";
  status.textContent = "Загрузка…";
  $("#products").innerHTML = "";
  try {
    const query = state.activeCategory ? `?category=${encodeURIComponent(state.activeCategory)}` : "";
    state.products = await api("/products/" + query);
    renderProducts();
  } catch (e) {
    status.textContent = "Не удалось загрузить товары. Сервер мог уснуть — обновите страницу через минуту.";
  }
}

function renderProducts() {
  const status = $("#status");
  if (!state.products.length) {
    status.style.display = "block";
    status.textContent = "Товаров пока нет";
  } else {
    status.style.display = "none";
  }
  $("#products").innerHTML = state.products
    .map(
      (p) => `
      <article class="card" data-id="${p.id}">
        <img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">
        <div class="card-name">${esc(p.name)}</div>
        <div class="card-price">${money(p.price)}</div>
      </article>`
    )
    .join("");
}

/* ---------- Шторки ---------- */
function openSheet(el) {
  el.classList.add("open");
  el.setAttribute("aria-hidden", "false");
  $("#overlay").classList.add("show");
  document.body.classList.add("no-scroll");
}

function closeSheets() {
  document.querySelectorAll(".sheet").forEach((s) => {
    s.classList.remove("open");
    s.setAttribute("aria-hidden", "true");
  });
  $("#overlay").classList.remove("show");
  document.body.classList.remove("no-scroll");
}

function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

/* ---------- Карточка товара ---------- */
function openProduct(id) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  state.current = p;
  state.size = null;
  $("#productContent").innerHTML = `
    <img class="p-img" src="${esc(p.image_url)}" alt="${esc(p.name)}">
    <h3 class="p-name">${esc(p.name)}</h3>
    <div class="p-price">${money(p.price)}</div>
    <p class="p-desc">${esc(p.description)}</p>
    <div class="p-label">Размер</div>
    <div class="sizes" id="sizes">
      ${p.sizes.map((s) => `<button class="size" data-size="${esc(s)}">${esc(s)}</button>`).join("")}
    </div>
    <button class="btn" id="addBtn">Добавить в корзину</button>`;
  $("#productSheet").scrollTop = 0;
  openSheet($("#productSheet"));
}

function addToCart() {
  if (!state.size) return toast("Выберите размер");
  const p = state.current;
  const found = state.cart.find((i) => i.id === p.id && i.size === state.size);
  if (found) {
    found.qty = Math.min(found.qty + 1, 20);
  } else {
    state.cart.push({ id: p.id, name: p.name, price: p.price, image: p.image_url, size: state.size, qty: 1 });
  }
  saveCart();
  closeSheets();
  toast("Добавлено в корзину");
}

/* ---------- Корзина ---------- */
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(state.cart));
  updateCartCount();
}

function updateCartCount() {
  $("#cartCount").textContent = state.cart.reduce((sum, i) => sum + i.qty, 0);
}

function renderCart() {
  const box = $("#cartItems");
  const footer = $("#cartFooter");
  if (!state.cart.length) {
    box.innerHTML = `<p class="empty">Корзина пуста</p>`;
    footer.style.display = "none";
    return;
  }
  footer.style.display = "block";
  box.innerHTML = state.cart
    .map(
      (i, idx) => `
      <div class="cart-item">
        <img src="${esc(i.image)}" alt="">
        <div class="ci-info">
          <div>
            <div class="ci-name">${esc(i.name)}</div>
            <div class="ci-meta">Размер: ${esc(i.size)}</div>
          </div>
          <div class="qty">
            <button data-act="minus" data-idx="${idx}" aria-label="Меньше">−</button>
            <span>${i.qty}</span>
            <button data-act="plus" data-idx="${idx}" aria-label="Больше">+</button>
          </div>
        </div>
        <div class="ci-price">${money(i.price * i.qty)}</div>
      </div>`
    )
    .join("");
  const total = state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  $("#cartTotal").textContent = money(total);
}

function changeQty(idx, delta) {
  const item = state.cart[idx];
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart.splice(idx, 1);
  if (item.qty > 20) item.qty = 20;
  saveCart();
  renderCart();
}

async function submitOrder(e) {
  e.preventDefault();
  if (!state.cart.length) return;
  const form = e.target;
  const btn = $("#orderBtn");
  btn.disabled = true;
  btn.textContent = "Отправляем…";
  try {
    const data = await api("/orders/", {
      method: "POST",
      body: JSON.stringify({
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        address: form.address.value.trim(),
        items: state.cart.map((i) => ({ product_id: i.id, size: i.size, quantity: i.qty })),
      }),
    });
    state.cart = [];
    saveCart();
    form.reset();
    closeSheets();
    toast(`Заказ №${data.id} оформлен. Спасибо!`);
  } catch (err) {
    toast("Не удалось оформить заказ. Попробуйте ещё раз");
  } finally {
    btn.disabled = false;
    btn.textContent = "Оформить заказ";
  }
}

/* ---------- События ---------- */
document.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (chip) {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    state.activeCategory = chip.dataset.slug;
    loadProducts();
    return;
  }

  const card = e.target.closest(".card");
  if (card) return openProduct(Number(card.dataset.id));

  const size = e.target.closest(".size");
  if (size) {
    document.querySelectorAll(".size").forEach((s) => s.classList.remove("active"));
    size.classList.add("active");
    state.size = size.dataset.size;
    return;
  }

  if (e.target.closest("#addBtn")) return addToCart();

  const qtyBtn = e.target.closest("[data-act]");
  if (qtyBtn) return changeQty(Number(qtyBtn.dataset.idx), qtyBtn.dataset.act === "plus" ? 1 : -1);

  if (e.target.closest("#cartBtn")) {
    renderCart();
    return openSheet($("#cartSheet"));
  }

  if (e.target.closest("[data-close]") || e.target.id === "overlay") closeSheets();
});

document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheets(); });
$("#orderForm").addEventListener("submit", submitOrder);

/* ---------- Старт ---------- */
updateCartCount();
loadCategories();
loadProducts();