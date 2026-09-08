// Mercado Marketplace Client Application (Nike-Inspired Clean UX + Policy Grounding)

const COLOR_HEX_MAP = {
  "black": "#171717",
  "white": "#ffffff",
  "red": "#ef4444",
  "royal blue": "#2563eb",
  "blue": "#3b82f6",
  "forest green": "#059669",
  "green": "#10b981",
  "navy": "#1e3a8a",
  "khaki": "#d4b996",
  "silver gray": "#9ca3af",
  "gray": "#6b7280",
  "grey": "#6b7280",
  "olive green": "#556b2f",
  "olive": "#556b2f",
  "tan brown": "#8b5a2b",
  "brown": "#8b5a2b",
  "yellow": "#eab308",
  "orange": "#f97316"
};

function getColorHex(colorName) {
  if (!colorName) return "#cccccc";
  const normalized = colorName.toLowerCase().trim();
  return COLOR_HEX_MAP[normalized] || "#94a3b8";
}

let allProducts = [];
let cart = [];
let activeCategory = 'All';
let currentModalProduct = null;
let selectedSize = null;
let selectedColor = null;
let selectedQty = 1;

// DOM Elements
const productGrid = document.getElementById('productGrid');
const emptyCatalog = document.getElementById('emptyCatalog');
const searchInput = document.getElementById('searchInput');
const totalItemsCount = document.getElementById('totalItemsCount');
const cartCountBadge = document.getElementById('cartCountBadge');
const drawerCartCount = document.getElementById('drawerCartCount');

// Product Modal Elements
const productModalBackdrop = document.getElementById('productModalBackdrop');
const closeProductModalBtn = document.getElementById('closeProductModalBtn');
const modalSellerBadge = document.getElementById('modalSellerBadge');
const modalTitle = document.getElementById('modalTitle');
const modalImage = document.getElementById('modalImage');
const modalPrice = document.getElementById('modalPrice');
const modalStockStatus = document.getElementById('modalStockStatus');
const modalDescription = document.getElementById('modalDescription');
const modalColorOptions = document.getElementById('modalColorOptions');
const modalSizeOptions = document.getElementById('modalSizeOptions');
const modalSelectedColorLabel = document.getElementById('modalSelectedColorLabel');
const modalSelectedSizeLabel = document.getElementById('modalSelectedSizeLabel');
const modalDispatchTime = document.getElementById('modalDispatchTime');
const qtyDisplay = document.getElementById('qtyDisplay');
const qtyMinusBtn = document.getElementById('qtyMinusBtn');
const qtyPlusBtn = document.getElementById('qtyPlusBtn');
const modalAddToCartBtn = document.getElementById('modalAddToCartBtn');
const modalReviewSummary = document.getElementById('modalReviewSummary');
const modalReviewsList = document.getElementById('modalReviewsList');
const writeReviewForm = document.getElementById('writeReviewForm');

// Cart Drawer Elements
const cartDrawer = document.getElementById('cartDrawer');
const cartDrawerBackdrop = document.getElementById('cartDrawerBackdrop');
const openCartBtn = document.getElementById('openCartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartItemsList = document.getElementById('cartItemsList');
const cartTotalDisplay = document.getElementById('cartTotalDisplay');
const submitOrderBtn = document.getElementById('submitOrderBtn');

// Policy Modal Elements
const policyModalBackdrop = document.getElementById('policyModalBackdrop');
const openPolicyModalBtn = document.getElementById('openPolicyModalBtn');
const closePolicyModalBtn = document.getElementById('closePolicyModalBtn');

// Order Confirmation Modal
const orderSuccessModal = document.getElementById('orderSuccessModal');
const closeOrderSuccessBtn = document.getElementById('closeOrderSuccessBtn');
const confirmedOrderId = document.getElementById('confirmedOrderId');
const confirmedCustomerName = document.getElementById('confirmedCustomerName');
const confirmedTotal = document.getElementById('confirmedTotal');

// Concierge Assistant Elements
const conciergeLauncher = document.getElementById('conciergeLauncher');
const conciergePanel = document.getElementById('conciergePanel');
const closeConciergeBtn = document.getElementById('closeConciergeBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const conciergeMessages = document.getElementById('conciergeMessages');
const conciergeSuggestions = document.getElementById('conciergeSuggestions');
const conciergeForm = document.getElementById('conciergeForm');
const conciergeInput = document.getElementById('conciergeInput');
const conciergeSendBtn = document.getElementById('conciergeSendBtn');
const voiceMicBtn = document.getElementById('voiceMicBtn');
const micListeningPulse = document.getElementById('micListeningPulse');

// 1. Initial Load
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const qParam = urlParams.get('q');
  if (qParam && searchInput) {
    searchInput.value = qParam;
  }

  loadProducts();
  setupEvents();
});

async function loadProducts() {
  try {
    let url = '/api/products';
    const params = new URLSearchParams();
    if (activeCategory !== 'All') params.append('category', activeCategory);
    const search = searchInput?.value.trim();
    if (search) params.append('q', search);

    if (params.toString()) url += '?' + params.toString();

    const res = await fetch(url);
    allProducts = await res.json();
    renderProductGrid();
  } catch (err) {
    console.error('Error fetching products:', err);
  }
}

// 2. Render Product Cards (Nike-Style Minimalist Cards)
function renderProductGrid() {
  if (!allProducts || allProducts.length === 0) {
    productGrid.innerHTML = '';
    emptyCatalog.classList.remove('hidden');
    if (totalItemsCount) totalItemsCount.textContent = '0 items listed';
    return;
  }

  emptyCatalog.classList.add('hidden');
  if (totalItemsCount) totalItemsCount.textContent = `${allProducts.length} items available`;

  productGrid.innerHTML = allProducts.map(p => {
    const colorDots = (p.colors && p.colors.length > 0)
      ? `<div class="flex items-center gap-1.5 mt-2">
          ${p.colors.slice(0, 5).map(c => `
            <span class="w-3.5 h-3.5 rounded-full border border-neutral-300 shadow-2xs" style="background-color: ${getColorHex(c)};" title="${c}"></span>
          `).join('')}
          ${p.colors.length > 5 ? `<span class="text-[10px] text-neutral-400 font-medium">+${p.colors.length - 5}</span>` : ''}
        </div>`
      : '';

    return `
      <div class="group cursor-pointer flex flex-col bg-white rounded-2xl overflow-hidden border border-neutral-200/70 hover:border-neutral-400 transition-all shadow-xs" onclick="openProductModal('${p.id}')">
        
        <!-- Hero Photo -->
        <div class="relative h-60 bg-neutral-100 overflow-hidden">
          <img 
            src="${p.image_url || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80'}" 
            alt="${p.title}" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
          <div class="absolute top-3 left-3 bg-white/95 backdrop-blur text-neutral-900 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs tracking-wide">
            ${p.category}
          </div>
          <div class="absolute bottom-3 right-3 bg-neutral-950/80 text-white text-[10px] font-medium px-2 py-0.5 rounded">
            ${p.stock > 0 ? `${p.stock} in stock` : 'Sold out'}
          </div>
        </div>

        <!-- Meta -->
        <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div class="flex items-center justify-between text-[11px] text-neutral-500 font-medium">
              <span>Sold by ${p.store_name}</span>
              <span class="text-amber-500 font-semibold">${p.rating ? `★ ${p.rating}` : '★ New'}</span>
            </div>

            <h3 class="font-bold text-sm text-neutral-950 mt-1 line-clamp-1 group-hover:text-neutral-600 transition-colors">
              ${p.title}
            </h3>

            ${colorDots}
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-neutral-100">
            <span class="text-base font-extrabold text-neutral-950">$${p.price.toFixed(2)} <span class="text-[10px] font-semibold text-neutral-400">USD</span></span>
            <span class="text-xs font-semibold text-neutral-900 group-hover:translate-x-0.5 transition-transform">Customize →</span>
          </div>
        </div>

      </div>
    `;
  }).join('');
}

// 3. Open Product Modal & Interactive Nike-Style Configurator
async function openProductModal(productId) {
  try {
    const res = await fetch(`/api/products/${productId}`);
    const p = await res.json();
    currentModalProduct = p;

    modalTitle.textContent = p.title;
    modalSellerBadge.innerHTML = `Sold by <a href="/store/${p.seller_id}" target="_blank" class="underline font-semibold hover:text-neutral-900">${p.store_name}</a> (${p.store_location || 'Verified Seller'})`;
    modalImage.src = p.image_url || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80';
    modalPrice.textContent = `$${p.price.toFixed(2)} USD`;
    modalDescription.textContent = p.description || 'No additional specifications provided.';
    modalStockStatus.textContent = p.stock > 0 ? `${p.stock} units available` : 'Out of stock';

    if (modalDispatchTime) {
      modalDispatchTime.innerHTML = `• <strong>Vendor dispatch:</strong> ${p.dispatch_time || 'Ships within 24-48 hours'} with package tracking.`;
    }

    selectedQty = 1;
    qtyDisplay.textContent = '1';

    // DYNAMIC COLOR SWATCHES SELECTOR
    if (p.colors && p.colors.length > 0) {
      selectedColor = p.colors[0];
      if (modalSelectedColorLabel) modalSelectedColorLabel.textContent = selectedColor;

      modalColorOptions.innerHTML = p.colors.map((c, i) => `
        <button 
          type="button"
          onclick="selectColor('${c}', this)"
          title="${c}"
          class="color-btn relative w-8 h-8 rounded-full border border-neutral-300 transition-all flex items-center justify-center ${i === 0 ? 'ring-2 ring-neutral-950 ring-offset-2 scale-110' : 'hover:scale-105'}"
          style="background-color: ${getColorHex(c)};"
        >
          ${c.toLowerCase() === 'white' ? '<span class="w-1.5 h-1.5 rounded-full bg-neutral-300"></span>' : ''}
        </button>
      `).join('');
    } else {
      selectedColor = 'Standard';
      if (modalSelectedColorLabel) modalSelectedColorLabel.textContent = 'Standard';
      modalColorOptions.innerHTML = '<span class="text-neutral-400 text-xs">Standard Edition</span>';
    }

    // DYNAMIC NIKE-STYLE SIZE BOXES GRID
    if (p.sizes && p.sizes.length > 0) {
      selectedSize = p.sizes[0];
      if (modalSelectedSizeLabel) modalSelectedSizeLabel.textContent = selectedSize;

      modalSizeOptions.innerHTML = p.sizes.map((s, i) => `
        <button 
          type="button"
          onclick="selectSize('${s}', this)"
          class="size-btn py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${i === 0 ? 'border-neutral-950 bg-neutral-950 text-white shadow-xs' : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400'}"
        >
          ${s}
        </button>
      `).join('');
    } else {
      selectedSize = 'One Size';
      if (modalSelectedSizeLabel) modalSelectedSizeLabel.textContent = 'One Size';
      modalSizeOptions.innerHTML = '<span class="text-neutral-400 text-xs">Standard One Size</span>';
    }

    // Reviews list
    renderReviews(p.reviews, p.rating, p.reviews_count);

    productModalBackdrop.classList.remove('hidden');
  } catch (err) {
    console.error('Error opening product modal:', err);
  }
}

function selectColor(color, btn) {
  selectedColor = color;
  if (modalSelectedColorLabel) modalSelectedColorLabel.textContent = color;

  document.querySelectorAll('.color-btn').forEach(b => {
    b.classList.remove('ring-2', 'ring-neutral-950', 'ring-offset-2', 'scale-110');
  });
  btn.classList.add('ring-2', 'ring-neutral-950', 'ring-offset-2', 'scale-110');
}

function selectSize(size, btn) {
  selectedSize = size;
  if (modalSelectedSizeLabel) modalSelectedSizeLabel.textContent = size;

  document.querySelectorAll('.size-btn').forEach(b => {
    b.classList.remove('border-neutral-950', 'bg-neutral-950', 'text-white', 'shadow-xs');
    b.classList.add('border-neutral-200', 'bg-white', 'text-neutral-800');
  });
  btn.classList.add('border-neutral-950', 'bg-neutral-950', 'text-white', 'shadow-xs');
  btn.classList.remove('border-neutral-200', 'bg-white', 'text-neutral-800');
}

function renderReviews(reviews = [], avgRating = null, count = 0) {
  modalReviewSummary.textContent = avgRating ? `★ ${avgRating} (${count} verified reviews)` : `No reviews yet (${count})`;
  
  if (!reviews || reviews.length === 0) {
    modalReviewsList.innerHTML = '<p class="text-neutral-400 text-xs italic">No reviews yet for this product. Be the first to leave one below.</p>';
    return;
  }

  modalReviewsList.innerHTML = reviews.map(r => `
    <div class="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
      <div class="flex items-center justify-between">
        <span class="font-bold text-neutral-900">${r.author_name}</span>
        <span class="text-amber-500 font-bold">★ ${r.rating}.0</span>
      </div>
      <p class="text-neutral-600 text-xs">${r.comment}</p>
      <div class="text-[10px] text-neutral-400">${r.created_at ? r.created_at.split(' ')[0] : 'Verified Buyer'}</div>
    </div>
  `).join('');
}

// 4. Cart State Management
function addToCartFromModal() {
  if (!currentModalProduct) return;

  const itemKey = `${currentModalProduct.id}-${selectedSize}-${selectedColor}`;
  const existing = cart.find(i => i.itemKey === itemKey);

  if (existing) {
    existing.qty += selectedQty;
  } else {
    cart.push({
      itemKey: itemKey,
      id: currentModalProduct.id,
      seller_id: currentModalProduct.seller_id,
      seller_name: currentModalProduct.store_name,
      title: currentModalProduct.title,
      price: currentModalProduct.price,
      image: currentModalProduct.image_url,
      size: selectedSize,
      color: selectedColor,
      qty: selectedQty
    });
  }

  productModalBackdrop.classList.add('hidden');
  updateCartUI();
  openCartDrawer();
}

function updateCartQuantity(itemKey, delta) {
  const item = cart.find(i => i.itemKey === itemKey);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.itemKey !== itemKey);
  }
  updateCartUI();
}

function removeFromCart(itemKey) {
  cart = cart.filter(i => i.itemKey !== itemKey);
  updateCartUI();
}

function updateCartUI() {
  const totalCount = cart.reduce((acc, i) => acc + i.qty, 0);
  cartCountBadge.textContent = totalCount;
  drawerCartCount.textContent = `(${totalCount} items)`;

  if (cart.length === 0) {
    cartItemsList.innerHTML = '<p class="text-center py-12 text-neutral-400 text-xs">Your shopping bag is empty.</p>';
    cartTotalDisplay.textContent = '$0.00';
    return;
  }

  let total = 0;
  cartItemsList.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    return `
      <div class="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs">
        <img src="${item.image || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80'}" alt="${item.title}" class="w-14 h-14 rounded-lg object-cover bg-white border border-neutral-200 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="text-[10px] text-neutral-500 font-medium">${item.seller_name}</div>
          <h4 class="font-bold text-neutral-950 truncate">${item.title}</h4>
          <div class="text-[11px] text-neutral-600 mt-0.5 flex items-center gap-1.5">
            <span>Size: <strong>${item.size}</strong></span> • 
            <span class="flex items-center gap-1">Color: <span class="w-2.5 h-2.5 rounded-full border border-neutral-300 inline-block" style="background-color: ${getColorHex(item.color)};"></span> <strong>${item.color}</strong></span>
          </div>
          <div class="font-bold text-neutral-950 mt-1">$${item.price.toFixed(2)}</div>
          
          <div class="flex items-center gap-2 mt-1.5">
            <button onclick="updateCartQuantity('${item.itemKey}', -1)" class="w-4 h-4 bg-white border border-neutral-300 rounded font-bold hover:bg-neutral-100">-</button>
            <span class="font-semibold">${item.qty}</span>
            <button onclick="updateCartQuantity('${item.itemKey}', 1)" class="w-4 h-4 bg-white border border-neutral-300 rounded font-bold hover:bg-neutral-100">+</button>
            <button onclick="removeFromCart('${item.itemKey}')" class="text-[10px] text-red-500 hover:text-red-700 ml-auto">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  cartTotalDisplay.textContent = `$${total.toFixed(2)}`;
}

function openCartDrawer() {
  cartDrawer.classList.remove('translate-x-full');
  cartDrawerBackdrop.classList.remove('hidden');
}

function closeCartDrawer() {
  cartDrawer.classList.add('translate-x-full');
  cartDrawerBackdrop.classList.add('hidden');
}

function openPolicyModal() {
  policyModalBackdrop?.classList.remove('hidden');
}

function closePolicyModal() {
  policyModalBackdrop?.classList.add('hidden');
}

// 5. Setup Event Listeners
function setupEvents() {
  closeProductModalBtn?.addEventListener('click', () => {
    productModalBackdrop.classList.add('hidden');
  });

  productModalBackdrop?.addEventListener('click', (e) => {
    if (e.target === productModalBackdrop) {
      productModalBackdrop.classList.add('hidden');
    }
  });

  // Policy Modal
  openPolicyModalBtn?.addEventListener('click', openPolicyModal);
  closePolicyModalBtn?.addEventListener('click', closePolicyModal);
  policyModalBackdrop?.addEventListener('click', (e) => {
    if (e.target === policyModalBackdrop) closePolicyModal();
  });

  qtyMinusBtn?.addEventListener('click', () => {
    if (selectedQty > 1) {
      selectedQty--;
      qtyDisplay.textContent = selectedQty;
    }
  });

  qtyPlusBtn?.addEventListener('click', () => {
    selectedQty++;
    qtyDisplay.textContent = selectedQty;
  });

  modalAddToCartBtn?.addEventListener('click', addToCartFromModal);

  openCartBtn?.addEventListener('click', openCartDrawer);
  closeCartBtn?.addEventListener('click', closeCartDrawer);
  cartDrawerBackdrop?.addEventListener('click', closeCartDrawer);

  let searchTimeout;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadProducts, 250);
  });

  document.querySelectorAll('.cat-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-filter').forEach(b => {
        b.classList.remove('active-cat', 'bg-neutral-950', 'text-white');
        b.classList.add('bg-neutral-100', 'text-neutral-700');
      });
      btn.classList.add('active-cat', 'bg-neutral-950', 'text-white');
      btn.classList.remove('bg-neutral-100', 'text-neutral-700');

      activeCategory = btn.getAttribute('data-cat');
      loadProducts();
    });
  });

  writeReviewForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentModalProduct) return;

    const payload = {
      product_id: currentModalProduct.id,
      author_name: document.getElementById('reviewAuthor').value.trim(),
      rating: parseInt(document.getElementById('reviewRating').value),
      comment: document.getElementById('reviewComment').value.trim()
    };

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        writeReviewForm.reset();
        openProductModal(currentModalProduct.id);
        loadProducts();
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  });

  submitOrderBtn?.addEventListener('click', async () => {
    if (cart.length === 0) {
      alert("Your shopping bag is empty!");
      return;
    }

    const custName = document.getElementById('orderCustName').value.trim();
    const custEmail = document.getElementById('orderCustEmail').value.trim();
    const custPhone = document.getElementById('orderCustPhone').value.trim();
    const custAddress = document.getElementById('orderCustAddress').value.trim();
    const custPayment = document.getElementById('orderCustPayment').value;

    if (!custName || !custEmail || !custAddress) {
      alert("Please provide your name, email, and delivery address to complete your order.");
      return;
    }

    const payload = {
      customer_name: custName,
      customer_email: custEmail,
      customer_phone: custPhone,
      delivery_address: custAddress,
      payment_method: custPayment,
      items: cart
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        closeCartDrawer();
        confirmedOrderId.textContent = data.order_id;
        confirmedCustomerName.textContent = data.customer_name;
        confirmedTotal.textContent = `$${data.total_amount.toFixed(2)}`;

        orderSuccessModal.classList.remove('hidden');
        cart = [];
        updateCartUI();
        loadProducts();
      } else {
        alert(data.error || "Order failed");
      }
    } catch (err) {
      console.error('Error creating order:', err);
    }
  });

  closeOrderSuccessBtn?.addEventListener('click', () => {
    orderSuccessModal.classList.add('hidden');
  });

  // Concierge Assistant Events
  conciergeLauncher?.addEventListener('click', toggleConcierge);
  closeConciergeBtn?.addEventListener('click', closeConcierge);
  clearChatBtn?.addEventListener('click', clearChat);
  conciergeForm?.addEventListener('submit', handleConciergeSubmit);
  setupVoiceInput();
}

// ==========================================
// 6. Concierge Assistant Dynamic Handlers
// ==========================================
let speechRecognition = null;
let isListening = false;

function toggleConcierge() {
  if (!conciergePanel) return;
  if (conciergePanel.classList.contains('hidden')) {
    openConcierge();
  } else {
    closeConcierge();
  }
}

function openConcierge() {
  if (!conciergePanel) return;
  conciergePanel.classList.remove('hidden');
  conciergeLauncher?.classList.add('scale-95', 'opacity-80');
  if (conciergeMessages && conciergeMessages.children.length === 0) {
    renderConciergeGreeting();
  }
  setTimeout(() => conciergeInput?.focus(), 150);
}

function closeConcierge() {
  if (!conciergePanel) return;
  conciergePanel.classList.add('hidden');
  conciergeLauncher?.classList.remove('scale-95', 'opacity-80');
}

function clearChat() {
  if (!conciergeMessages) return;
  conciergeMessages.innerHTML = '';
  renderConciergeGreeting();
}

function renderConciergeGreeting() {
  appendAssistantMessage({
    reply: "Hello! I am your Mercado Concierge. I can help you search our live inventory, recommend shoe sizes, or answer questions about 30-day returns and shipping policies.",
    suggested_actions: [
      "👟 Show live footwear",
      "🔄 30-Day Return Policy",
      "🚚 Delivery Timelines",
      "💵 Cash on Delivery Info"
    ]
  });
}

function handleConciergeSubmit(e) {
  e.preventDefault();
  const text = conciergeInput?.value.trim();
  if (!text) return;
  conciergeInput.value = '';
  sendConciergeMessage(text);
}

async function sendConciergeMessage(text) {
  appendUserMessage(text);
  appendTypingIndicator();

  try {
    const res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();
    removeTypingIndicator();
    appendAssistantMessage(data);
  } catch (err) {
    console.error('Concierge request error:', err);
    removeTypingIndicator();
    appendAssistantMessage({
      reply: "Sorry, I encountered a temporary connection issue. Please try again."
    });
  }
}

function appendUserMessage(text) {
  if (!conciergeMessages) return;
  const div = document.createElement('div');
  div.className = 'flex justify-end';
  div.innerHTML = `
    <div class="bg-neutral-950 text-white px-4 py-2.5 rounded-2xl rounded-br-xs max-w-[85%] leading-relaxed">
      ${escapeHtml(text)}
    </div>
  `;
  conciergeMessages.appendChild(div);
  scrollToBottom();
}

function appendAssistantMessage(data) {
  if (!conciergeMessages) return;
  const div = document.createElement('div');
  div.className = 'flex flex-col gap-2 max-w-[95%]';

  let bubbleHtml = `
    <div class="bg-white border border-neutral-200 text-neutral-900 p-3.5 rounded-2xl rounded-tl-xs leading-relaxed shadow-xs space-y-2">
      <p>${escapeHtml(data.reply || '')}</p>
  `;

  if (data.policy_snippet) {
    const ps = data.policy_snippet;
    bubbleHtml += `
      <div class="mt-2 p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
        <div class="flex items-center justify-between gap-1">
          <span class="font-bold text-[11px] text-neutral-950">${escapeHtml(ps.title || '')}</span>
          <span class="text-[9px] font-bold bg-neutral-900 text-white px-1.5 py-0.5 rounded-full">${escapeHtml(ps.badge || 'Official Policy')}</span>
        </div>
        <p class="text-[10px] text-neutral-600">${escapeHtml(ps.summary || '')}</p>
      </div>
    `;
  }

  if (data.products && data.products.length > 0) {
    bubbleHtml += `
      <div class="mt-3 space-y-2.5">
        ${data.products.map(p => `
          <div class="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 hover:border-neutral-400 transition-all flex flex-col gap-2">
            <div class="flex gap-2.5 items-center">
              <img src="${p.image_url}" alt="${escapeHtml(p.title)}" class="w-14 h-14 rounded-lg object-cover bg-white border border-neutral-200 flex-shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-1">
                  <span class="text-[9px] font-bold text-neutral-500 truncate uppercase">${escapeHtml(p.store_name)}</span>
                  <span class="text-[9px] font-bold ${p.stock > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'} px-1.5 py-0.2 rounded-full">
                    ${p.stock} in stock
                  </span>
                </div>
                <h5 class="font-black text-neutral-950 text-xs truncate mt-0.5">${escapeHtml(p.title)}</h5>
                <div class="text-[11px] font-extrabold text-neutral-900 mt-0.5">$${p.price.toFixed(2)} USD</div>
              </div>
            </div>
            
            <div class="flex items-center justify-between pt-1 border-t border-neutral-200/60 gap-2">
              <div class="flex items-center gap-1 overflow-hidden">
                ${(p.colors || []).slice(0, 4).map(c => `
                  <span class="w-3 h-3 rounded-full border border-neutral-300 inline-block" style="background-color: ${getColorHex(c)};" title="${c}"></span>
                `).join('')}
                ${(p.colors || []).length > 4 ? `<span class="text-[9px] text-neutral-400 font-bold">+${p.colors.length - 4}</span>` : ''}
              </div>
              
              <button onclick="openProductFromChat('${p.id}')" class="bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 transition-transform active:scale-95 shadow-xs">
                <span>Select Size & Add</span>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  bubbleHtml += `</div>`;
  div.innerHTML = bubbleHtml;
  conciergeMessages.appendChild(div);

  renderSuggestionChips(data.suggested_actions || []);
  scrollToBottom();
}

function openProductFromChat(productId) {
  openProductModal(productId);
}

function appendTypingIndicator() {
  if (!conciergeMessages) return;
  const div = document.createElement('div');
  div.id = 'conciergeTypingIndicator';
  div.className = 'flex items-center gap-1.5 bg-white border border-neutral-200 py-2.5 px-3.5 rounded-2xl rounded-tl-xs w-16 shadow-xs';
  div.innerHTML = `
    <span class="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></span>
    <span class="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
    <span class="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
  `;
  conciergeMessages.appendChild(div);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById('conciergeTypingIndicator');
  el?.remove();
}

function renderSuggestionChips(chips) {
  if (!conciergeSuggestions) return;
  if (!chips || chips.length === 0) {
    conciergeSuggestions.classList.add('hidden');
    conciergeSuggestions.innerHTML = '';
    return;
  }

  conciergeSuggestions.classList.remove('hidden');
  conciergeSuggestions.innerHTML = chips.map(chip => `
    <button 
      type="button" 
      onclick="handleChipClick('${escapeHtml(chip)}')" 
      class="text-[10px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 py-1 px-2.5 rounded-full whitespace-nowrap transition-colors flex-shrink-0"
    >
      ${escapeHtml(chip)}
    </button>
  `).join('');
}

function handleChipClick(chipText) {
  sendConciergeMessage(chipText);
}

function scrollToBottom() {
  if (conciergeMessages) {
    conciergeMessages.scrollTop = conciergeMessages.scrollHeight;
  }
}

function setupVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceMicBtn?.classList.add('opacity-40');
    voiceMicBtn?.setAttribute('title', 'Voice dictation is supported in Chrome, Edge, and Safari');
    return;
  }

  speechRecognition = new SpeechRecognition();
  speechRecognition.continuous = false;
  speechRecognition.interimResults = false;

  speechRecognition.onstart = () => {
    isListening = true;
    micListeningPulse?.classList.remove('hidden');
    voiceMicBtn?.classList.add('border-red-500', 'bg-red-50', 'text-red-600');
  };

  speechRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (conciergeInput) {
      conciergeInput.value = transcript;
      sendConciergeMessage(transcript);
    }
  };

  speechRecognition.onerror = (e) => {
    console.warn('Speech recognition warning:', e.error);
    stopListening();
  };

  speechRecognition.onend = () => {
    stopListening();
  };

  voiceMicBtn?.addEventListener('click', () => {
    if (isListening) {
      speechRecognition.stop();
    } else {
      try {
        speechRecognition.start();
      } catch (e) {
        console.error('Speech recognition error:', e);
      }
    }
  });
}

function stopListening() {
  isListening = false;
  micListeningPulse?.classList.add('hidden');
  voiceMicBtn?.classList.remove('border-red-500', 'bg-red-50', 'text-red-600');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
