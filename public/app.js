// Global Application State
const state = {
  activeTab: 'dashboard',
  fileTree: null,
  activeFilePath: null,
  isEditingFile: false,
  logs: [],
  logsPollInterval: null,
  shopifyProducts: [],
  miraklOffers: [],
  miraklOrders: [],
  mappedProducts: []
};

// DOM Elements
const elements = {
  navItems: document.querySelectorAll('.nav-item'),
  tabContents: document.querySelectorAll('.tab-content'),
  currentViewTitle: document.getElementById('current-view-title'),
  
  // Status Elements
  shopifyIndicator: document.getElementById('shopify-status-indicator'),
  miraklIndicator: document.getElementById('mirakl-status-indicator'),
  shopifyBadge: document.getElementById('shopify-badge'),
  miraklBadge: document.getElementById('mirakl-badge'),
  shopifyInfoUrl: document.getElementById('shopify-info-url'),
  shopifyInfoLocations: document.getElementById('shopify-info-locations'),
  miraklInfoUrl: document.getElementById('mirakl-info-url'),
  miraklInfoName: document.getElementById('mirakl-info-name'),
  miraklInfoId: document.getElementById('mirakl-info-id'),
  shopifyConnError: document.getElementById('shopify-conn-error'),
  miraklConnError: document.getElementById('mirakl-conn-error'),
  refreshStatusBtn: document.getElementById('refresh-status-btn'),
  
  // KPIs
  kpiProducts: document.getElementById('kpi-products-count'),
  kpiOffers: document.getElementById('kpi-offers-count'),
  kpiOrders: document.getElementById('kpi-orders-count'),
  kpiSyncInterval: document.getElementById('kpi-sync-interval'),
  
  // Sync Actions
  triggerSyncMenuBtn: document.getElementById('trigger-sync-menu-btn'),
  syncDropdown: document.getElementById('sync-dropdown'),
  syncProductsAction: document.getElementById('sync-products-action'),
  syncInventoryAction: document.getElementById('sync-inventory-action'),
  syncOrdersAction: document.getElementById('sync-orders-action'),
  btnSyncProducts: document.getElementById('btn-sync-products'),
  btnSyncInventory: document.getElementById('btn-sync-inventory'),
  btnSyncOrders: document.getElementById('btn-sync-orders'),
  
  // Modal
  syncModal: document.getElementById('sync-modal'),
  closeModal: document.getElementById('close-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalStatusText: document.getElementById('modal-status-text'),
  modalResults: document.getElementById('modal-results'),
  modalResultsText: document.getElementById('modal-results-text'),
  
  // Toast
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message'),
  toastIcon: document.getElementById('toast-icon'),
  
  // File Explorer
  fileTreeContainer: document.getElementById('file-tree'),
  refreshTreeBtn: document.getElementById('refresh-tree-btn'),
  activeFilePathSpan: document.getElementById('active-file-path'),
  activeFileIcon: document.getElementById('active-file-icon'),
  editFileBtn: document.getElementById('edit-file-btn'),
  saveFileBtn: document.getElementById('save-file-btn'),
  cancelEditBtn: document.getElementById('cancel-edit-btn'),
  codeContent: document.getElementById('code-content'),
  codeEditArea: document.getElementById('code-edit-area'),
  codeDisplayWrapper: document.getElementById('code-display-wrapper'),
  
  // Data Browsers
  searchProducts: document.getElementById('search-products'),
  tableProducts: document.getElementById('table-products').querySelector('tbody'),
  noProductsMsg: document.getElementById('no-products-msg'),
  
  searchOffers: document.getElementById('search-offers'),
  tableOffers: document.getElementById('table-offers').querySelector('tbody'),
  noOffersMsg: document.getElementById('no-offers-msg'),
  
  searchOrders: document.getElementById('search-orders'),
  tableOrders: document.getElementById('table-orders').querySelector('tbody'),
  noOrdersMsg: document.getElementById('no-orders-msg'),

  // Sync Monitor
  searchMonitor: document.getElementById('search-monitor'),
  filterMonitorStatus: document.getElementById('filter-monitor-status'),
  btnSyncAllMismatched: document.getElementById('btn-sync-all-mismatched'),
  tableMonitor: document.getElementById('table-monitor').querySelector('tbody'),
  noMonitorMsg: document.getElementById('no-monitor-msg'),
  monitorCountSynced: document.getElementById('monitor-count-synced'),
  monitorCountMismatches: document.getElementById('monitor-count-mismatches'),
  monitorCountShopifyOnly: document.getElementById('monitor-count-shopify-only'),
  monitorCountMiraklOnly: document.getElementById('monitor-count-mirakl-only'),
  
  // Logs
  logTerminal: document.getElementById('log-terminal'),
  clearLogsBtn: document.getElementById('clear-logs-btn'),
  logFilters: document.querySelectorAll('[data-log-filter]')
};

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupConnectionChecks();
  setupSyncTriggers();
  setupSyncMonitor();
  setupFileExplorer();
  setupDataBrowsers();
  setupLogsView();
  setupSettings();
  
  // Initial Loads
  checkPlatformConnection();
  loadKpis();
});

// Toast Helper
function showToast(message, type = 'info') {
  elements.toastMessage.textContent = message;
  elements.toast.className = `toast show ${type}`;
  
  // Set Icon
  elements.toastIcon.className = 'bi';
  if (type === 'success') elements.toastIcon.classList.add('bi-check-circle-fill');
  else if (type === 'error') elements.toastIcon.classList.add('bi-exclamation-triangle-fill');
  else elements.toastIcon.classList.add('bi-info-circle-fill');
  
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 4000);
}

// Navigation Handler
function setupNavigation() {
  elements.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = item.getAttribute('data-tab');
      switchTab(tab);
    });
  });
  
  // Sync dropdown toggle
  elements.triggerSyncMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.syncDropdown.classList.toggle('show');
  });
  
  document.addEventListener('click', () => {
    elements.syncDropdown.classList.remove('show');
  });
}

function switchTab(tabName) {
  state.activeTab = tabName;
  
  // Update Navigation UI
  elements.navItems.forEach(item => {
    if (item.getAttribute('data-tab') === tabName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Update View Visibilities
  elements.tabContents.forEach(content => {
    if (content.id === `view-${tabName}`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
  
  // Update Title
  const titles = {
    dashboard: 'Dashboard Overview',
    explorer: 'Project File Explorer',
    products: 'Shopify Product Catalog',
    offers: 'Nordstrom Mirakl Offers',
    orders: 'Nordstrom Mirakl Orders',
    logs: 'System Logs',
    settings: 'Integration Settings',
    monitor: 'Product Sync Monitor'
  };
  elements.currentViewTitle.textContent = titles[state.activeTab] || 'SyncHub';
  
  // Specific Tab Loads
  if (tabName === 'explorer') {
    loadFileTree();
  } else if (tabName === 'products') {
    loadShopifyProducts();
  } else if (tabName === 'offers') {
    loadMiraklOffers();
  } else if (tabName === 'orders') {
    loadMiraklOrders();
  } else if (tabName === 'monitor') {
    loadMappedProducts();
  } else if (tabName === 'logs') {
    loadLogs();
    startLogsPolling();
  } else if (tabName === 'settings') {
    loadSettings();
  }
  
  if (tabName !== 'logs') {
    stopLogsPolling();
  }
}

// Connection Health Checking
function setupConnectionChecks() {
  elements.refreshStatusBtn.addEventListener('click', () => {
    checkPlatformConnection();
    loadKpis();
  });
}

async function checkPlatformConnection() {
  // Reset Loading UI
  elements.shopifyIndicator.querySelector('.status-dot').className = 'status-dot status-loading';
  elements.shopifyIndicator.querySelector('.status-text').textContent = 'Shopify: Checking...';
  elements.miraklIndicator.querySelector('.status-dot').className = 'status-dot status-loading';
  elements.miraklIndicator.querySelector('.status-text').textContent = 'Mirakl: Checking...';
  
  elements.shopifyBadge.className = 'status-badge badge-loading';
  elements.shopifyBadge.textContent = 'Checking...';
  elements.miraklBadge.className = 'status-badge badge-loading';
  elements.miraklBadge.textContent = 'Checking...';
  
  try {
    const res = await fetch('/api/connection-status');
    const data = await res.json();
    
    // Shopify Status
    if (data.shopify.connected) {
      elements.shopifyIndicator.querySelector('.status-dot').className = 'status-dot status-connected';
      elements.shopifyIndicator.querySelector('.status-text').textContent = 'Shopify: Connected';
      elements.shopifyBadge.className = 'status-badge badge-connected';
      elements.shopifyBadge.textContent = 'Active';
      elements.shopifyConnError.classList.add('hidden');
    } else {
      elements.shopifyIndicator.querySelector('.status-dot').className = 'status-dot status-disconnected';
      elements.shopifyIndicator.querySelector('.status-text').textContent = 'Shopify: Disconnected';
      elements.shopifyBadge.className = 'status-badge badge-disconnected';
      elements.shopifyBadge.textContent = 'Error';
      
      elements.shopifyConnError.textContent = typeof data.shopify.error === 'object' ? JSON.stringify(data.shopify.error, null, 2) : data.shopify.error;
      elements.shopifyConnError.classList.remove('hidden');
    }
    elements.shopifyInfoUrl.textContent = data.shopify.shopUrl || 'Undefined';
    elements.shopifyInfoLocations.textContent = data.shopify.locationsCount || 0;
    
    // Mirakl Status
    if (data.mirakl.connected) {
      elements.miraklIndicator.querySelector('.status-dot').className = 'status-dot status-connected';
      elements.miraklIndicator.querySelector('.status-text').textContent = 'Mirakl: Connected';
      elements.miraklBadge.className = 'status-badge badge-connected';
      elements.miraklBadge.textContent = 'Active';
      elements.miraklConnError.classList.add('hidden');
    } else {
      elements.miraklIndicator.querySelector('.status-dot').className = 'status-dot status-disconnected';
      elements.miraklIndicator.querySelector('.status-text').textContent = 'Mirakl: Disconnected';
      elements.miraklBadge.className = 'status-badge badge-disconnected';
      elements.miraklBadge.textContent = 'Error';
      
      elements.miraklConnError.textContent = typeof data.mirakl.error === 'object' ? JSON.stringify(data.mirakl.error, null, 2) : data.mirakl.error;
      elements.miraklConnError.classList.remove('hidden');
    }
    elements.miraklInfoUrl.textContent = data.mirakl.url || 'Undefined';
    elements.miraklInfoName.textContent = data.mirakl.shopName || 'Unknown Shop';
    elements.miraklInfoId.textContent = data.mirakl.shopId || 'Undefined';
    
  } catch (err) {
    showToast('Failed to check server API connections', 'error');
    console.error(err);
  }
}

// KPI Loader
async function loadKpis() {
  try {
    // We can extract counts by calling the data lists
    const productsRes = await fetch('/api/data/products').catch(() => null);
    const offersRes = await fetch('/api/data/offers').catch(() => null);
    const ordersRes = await fetch('/api/data/orders').catch(() => null);
    
    if (productsRes && productsRes.ok) {
      const products = await productsRes.json();
      elements.kpiProducts.textContent = products.length;
    } else {
      elements.kpiProducts.textContent = 'N/A';
    }
    
    if (offersRes && offersRes.ok) {
      const offers = await offersRes.json();
      elements.kpiOffers.textContent = offers.length;
    } else {
      elements.kpiOffers.textContent = 'N/A';
    }
    
    if (ordersRes && ordersRes.ok) {
      const orders = await ordersRes.json();
      elements.kpiOrders.textContent = orders.length;
    } else {
      elements.kpiOrders.textContent = 'N/A';
    }
    
  } catch (err) {
    console.error('Error loading KPIs', err);
  }
}

// Sync Execution Modal and Requests
function setupSyncTriggers() {
  const triggerSync = async (endpoint, title) => {
    // Show Modal
    elements.modalTitle.textContent = title;
    elements.modalStatusText.textContent = 'Executing synchronization... Please wait.';
    elements.modalResults.classList.add('hidden');
    elements.syncModal.classList.add('show');
    
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        elements.modalStatusText.innerHTML = `<span style="color: var(--color-success); font-weight: 600;"><i class="bi bi-check-circle-fill"></i> Synchronization completed successfully!</span>`;
        showToast('Sync completed successfully', 'success');
      } else {
        elements.modalStatusText.innerHTML = `<span style="color: var(--color-error); font-weight: 600;"><i class="bi bi-exclamation-octagon-fill"></i> Synchronization failed</span>`;
        showToast('Sync failed', 'error');
      }
      
      elements.modalResultsText.textContent = JSON.stringify(data, null, 2);
      elements.modalResults.classList.remove('hidden');
      
      // Refresh KPIs and health checks
      loadKpis();
      checkPlatformConnection();
    } catch (err) {
      elements.modalStatusText.innerHTML = `<span style="color: var(--color-error); font-weight: 600;"><i class="bi bi-x-circle-fill"></i> Connection to local integration server lost</span>`;
      elements.modalResultsText.textContent = err.message;
      elements.modalResults.classList.remove('hidden');
      showToast('Network error during sync execution', 'error');
    }
  };
  
  // Event listeners for dropdown quicksync
  elements.syncProductsAction.addEventListener('click', (e) => {
    e.preventDefault();
    triggerSync('/sync/products', 'Sync Shopify Products to Mirakl');
  });
  elements.syncInventoryAction.addEventListener('click', (e) => {
    e.preventDefault();
    triggerSync('/sync/inventory', 'Sync Inventory Levels to Mirakl');
  });
  elements.syncOrdersAction.addEventListener('click', (e) => {
    e.preventDefault();
    triggerSync('/sync/orders', 'Import Mirakl Orders to Shopify');
  });
  
  // Event listeners for action cards
  elements.btnSyncProducts.addEventListener('click', () => {
    triggerSync('/sync/products', 'Sync Shopify Products to Mirakl');
  });
  elements.btnSyncInventory.addEventListener('click', () => {
    triggerSync('/sync/inventory', 'Sync Inventory Levels to Mirakl');
  });
  elements.btnSyncOrders.addEventListener('click', () => {
    triggerSync('/sync/orders', 'Import Mirakl Orders to Shopify');
  });
  
  // Close Modal
  elements.closeModal.addEventListener('click', () => {
    elements.syncModal.classList.remove('show');
  });
  elements.syncModal.addEventListener('click', (e) => {
    if (e.target === elements.syncModal) {
      elements.syncModal.classList.remove('show');
    }
  });
}

// File Explorer Logic
function setupFileExplorer() {
  elements.refreshTreeBtn.addEventListener('click', loadFileTree);
  
  elements.editFileBtn.addEventListener('click', () => {
    if (!state.activeFilePath) return;
    enterEditMode();
  });
  
  elements.cancelEditBtn.addEventListener('click', () => {
    exitEditMode(false);
  });
  
  elements.saveFileBtn.addEventListener('click', async () => {
    if (!state.activeFilePath) return;
    
    const updatedContent = elements.codeEditArea.value;
    
    // Disable save button to prevent double-submit
    elements.saveFileBtn.disabled = true;
    elements.saveFileBtn.textContent = 'Saving...';
    
    try {
      const res = await fetch('/api/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: state.activeFilePath,
          content: updatedContent
        })
      });
      const data = await res.json();
      
      if (data.success) {
        showToast(`Saved ${state.activeFilePath.split('/').pop()}`, 'success');
        elements.codeContent.textContent = updatedContent;
        exitEditMode(true);
        
        // If they edited the .env, trigger fresh connection tests immediately!
        if (state.activeFilePath.endsWith('.env')) {
          checkPlatformConnection();
        }
      } else {
        showToast(`Failed to save file: ${data.error}`, 'error');
        elements.saveFileBtn.disabled = false;
        elements.saveFileBtn.textContent = 'Save Changes';
      }
    } catch (err) {
      showToast('Error sending file save request', 'error');
      elements.saveFileBtn.disabled = false;
      elements.saveFileBtn.textContent = 'Save Changes';
    }
  });
}

async function loadFileTree() {
  elements.fileTreeContainer.innerHTML = `<div class="loading-spinner-center"><div class="spinner"></div></div>`;
  
  try {
    const res = await fetch('/api/project-files');
    const data = await res.json();
    state.fileTree = data;
    
    elements.fileTreeContainer.innerHTML = '';
    const rootTreeEl = buildTreeHtml(data);
    elements.fileTreeContainer.appendChild(rootTreeEl);
  } catch (err) {
    elements.fileTreeContainer.innerHTML = `<div style="color: var(--color-error); font-size: 0.82rem; padding: 10px;">Failed to load files</div>`;
    console.error(err);
  }
}

function buildTreeHtml(node) {
  const nodeEl = document.createElement('div');
  nodeEl.className = 'tree-node';
  
  const itemEl = document.createElement('div');
  itemEl.className = `node-item ${node.type}`;
  
  // Icon
  const icon = document.createElement('i');
  if (node.type === 'directory') {
    icon.className = 'bi bi-folder-fill';
  } else {
    // Custom file icons
    const name = node.name.toLowerCase();
    if (name.endsWith('.js')) icon.className = 'bi bi-filetype-js';
    else if (name.endsWith('.json')) icon.className = 'bi bi-filetype-json';
    else if (name.endsWith('.md')) icon.className = 'bi bi-filetype-md';
    else if (name.startsWith('.env')) icon.className = 'bi bi-key-fill';
    else icon.className = 'bi bi-file-earmark-text-fill';
  }
  
  const text = document.createElement('span');
  text.textContent = node.name;
  
  itemEl.appendChild(icon);
  itemEl.appendChild(text);
  nodeEl.appendChild(itemEl);
  
  if (node.type === 'directory') {
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';
    
    // Sort directories first, then alphabetical
    const sortedChildren = [...node.children].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    sortedChildren.forEach(child => {
      childrenContainer.appendChild(buildTreeHtml(child));
    });
    
    nodeEl.appendChild(childrenContainer);
    
    itemEl.addEventListener('click', () => {
      const isExpanded = childrenContainer.classList.toggle('open');
      icon.className = isExpanded ? 'bi bi-folder2-open' : 'bi bi-folder-fill';
    });
  } else {
    itemEl.addEventListener('click', () => {
      // Remove selected class from others
      document.querySelectorAll('.node-item.file').forEach(el => el.classList.remove('selected'));
      itemEl.classList.add('selected');
      loadFileContent(node.path);
    });
  }
  
  return nodeEl;
}

async function loadFileContent(filePath) {
  if (state.isEditingFile) {
    if (!confirm('You have unsaved changes. Discard them?')) return;
    exitEditMode(false);
  }
  
  state.activeFilePath = filePath;
  elements.activeFilePathSpan.textContent = filePath;
  elements.editFileBtn.disabled = true;
  elements.codeContent.textContent = 'Loading file contents...';
  
  // Set Icon
  const name = filePath.split('/').pop().toLowerCase();
  elements.activeFileIcon.className = 'bi';
  if (name.endsWith('.js')) elements.activeFileIcon.classList.add('bi-filetype-js');
  else if (name.endsWith('.json')) elements.activeFileIcon.classList.add('bi-filetype-json');
  else if (name.endsWith('.md')) elements.activeFileIcon.classList.add('bi-filetype-md');
  else if (name.startsWith('.env')) elements.activeFileIcon.classList.add('bi-key-fill');
  else elements.activeFileIcon.classList.add('bi-file-earmark-code');

  try {
    const res = await fetch(`/api/file-content?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    
    if (res.ok) {
      elements.codeContent.textContent = data.content;
      elements.editFileBtn.disabled = false;
      elements.codeEditArea.value = data.content;
    } else {
      elements.codeContent.textContent = `Error: ${data.error}`;
    }
  } catch (err) {
    elements.codeContent.textContent = `Failed to load file from server.`;
  }
}

function enterEditMode() {
  state.isEditingFile = true;
  elements.codeDisplayWrapper.classList.add('hidden');
  elements.codeEditArea.classList.remove('hidden');
  
  elements.editFileBtn.classList.add('hidden');
  elements.saveFileBtn.classList.remove('hidden');
  elements.saveFileBtn.disabled = false;
  elements.saveFileBtn.textContent = 'Save Changes';
  elements.cancelEditBtn.classList.remove('hidden');
  
  elements.codeEditArea.focus();
}

function exitEditMode(saveSuccess = false) {
  state.isEditingFile = false;
  elements.codeDisplayWrapper.classList.remove('hidden');
  elements.codeEditArea.classList.add('hidden');
  
  elements.editFileBtn.classList.remove('hidden');
  elements.saveFileBtn.classList.add('hidden');
  elements.cancelEditBtn.classList.add('hidden');
  
  if (!saveSuccess) {
    // Reset textarea value to matches displayed content
    elements.codeEditArea.value = elements.codeContent.textContent;
  }
}

// Data Browsers Management (Shopify products, Mirakl orders/offers)
function setupDataBrowsers() {
  // Search products
  elements.searchProducts.addEventListener('input', () => {
    renderShopifyProductsTable();
  });
  
  // Search offers
  elements.searchOffers.addEventListener('input', () => {
    renderMiraklOffersTable();
  });
  
  // Search orders
  elements.searchOrders.addEventListener('input', () => {
    renderMiraklOrdersTable();
  });
}

// Shopify Products
async function loadShopifyProducts() {
  elements.tableProducts.innerHTML = `<tr><td colspan="6" class="text-center"><div class="spinner"></div> Loading products...</td></tr>`;
  elements.noProductsMsg.classList.add('hidden');
  
  try {
    const res = await fetch('/api/data/products');
    if (!res.ok) throw new Error('API failed');
    state.shopifyProducts = await res.json();
    renderShopifyProductsTable();
  } catch (err) {
    elements.tableProducts.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load Shopify products. Check credentials.</td></tr>`;
  }
}

function renderShopifyProductsTable() {
  const query = elements.searchProducts.value.toLowerCase();
  elements.tableProducts.innerHTML = '';
  
  const filtered = state.shopifyProducts.filter(p => {
    const titleMatch = p.title.toLowerCase().includes(query);
    const skuMatch = p.variants.some(v => v.sku && v.sku.toLowerCase().includes(query));
    return titleMatch || skuMatch;
  });
  
  if (filtered.length === 0) {
    elements.noProductsMsg.classList.remove('hidden');
    return;
  }
  elements.noProductsMsg.classList.add('hidden');
  
  filtered.forEach(p => {
    const firstVariant = p.variants[0] || {};
    const sku = firstVariant.sku || 'No SKU';
    const price = firstVariant.price || '0.00';
    const qty = p.variants.reduce((acc, v) => acc + (v.inventory_quantity || 0), 0);
    const status = p.status === 'active' ? 'active' : 'draft';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="product-cell">
          <img src="${p.image?.src || 'https://placehold.co/50x50?text=Shopify'}" class="product-img" onerror="this.src='https://placehold.co/50x50?text=Shopify'">
          <div class="product-info">
            <span class="product-title-txt">${p.title}</span>
            <span class="product-id-txt">ID: ${p.id}</span>
          </div>
        </div>
      </td>
      <td><span class="sku-badge">${sku}</span></td>
      <td>$${price}</td>
      <td style="font-weight: 600;">${qty}</td>
      <td>${p.variants.length}</td>
      <td><span class="data-badge ${status === 'active' ? 'badge-success' : 'badge-warning'}">${status}</span></td>
    `;
    elements.tableProducts.appendChild(tr);
  });
}

// Mirakl Offers
async function loadMiraklOffers() {
  elements.tableOffers.innerHTML = `<tr><td colspan="6" class="text-center"><div class="spinner"></div> Loading offers...</td></tr>`;
  elements.noOffersMsg.classList.add('hidden');
  
  try {
    const res = await fetch('/api/data/offers');
    if (!res.ok) throw new Error('API failed');
    state.miraklOffers = await res.json();
    renderMiraklOffersTable();
  } catch (err) {
    elements.tableOffers.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load Mirakl offers. Check credentials.</td></tr>`;
  }
}

function renderMiraklOffersTable() {
  const query = elements.searchOffers.value.toLowerCase();
  elements.tableOffers.innerHTML = '';
  
  const filtered = state.miraklOffers.filter(o => {
    const skuMatch = o['product-id'] && o['product-id'].toLowerCase().includes(query);
    const titleMatch = o['product-title'] && o['product-title'].toLowerCase().includes(query);
    return skuMatch || titleMatch;
  });
  
  if (filtered.length === 0) {
    elements.noOffersMsg.classList.remove('hidden');
    return;
  }
  elements.noOffersMsg.classList.add('hidden');
  
  filtered.forEach(o => {
    const sku = o['product-id'] || 'N/A';
    const title = o['product-title'] || 'Unknown Offer';
    const price = o.price || '0.00';
    const qty = o.quantity !== undefined ? o.quantity : 0;
    const stateCode = o['state-code'] || '11';
    const availableStart = o['available-start-date'] || 'N/A';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="sku-badge">${sku}</span></td>
      <td style="font-weight: 500;">${title}</td>
      <td>$${price}</td>
      <td style="font-weight: 600;">${qty}</td>
      <td><span class="data-badge badge-success">${stateCode} (New)</span></td>
      <td>${availableStart}</td>
    `;
    elements.tableOffers.appendChild(tr);
  });
}

// Mirakl Orders
async function loadMiraklOrders() {
  elements.tableOrders.innerHTML = `<tr><td colspan="6" class="text-center"><div class="spinner"></div> Loading orders...</td></tr>`;
  elements.noOrdersMsg.classList.add('hidden');
  
  try {
    const res = await fetch('/api/data/orders');
    if (!res.ok) throw new Error('API failed');
    state.miraklOrders = await res.json();
    renderMiraklOrdersTable();
  } catch (err) {
    elements.tableOrders.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load Mirakl orders. Check credentials.</td></tr>`;
  }
}

function renderMiraklOrdersTable() {
  const query = elements.searchOrders.value.toLowerCase();
  elements.tableOrders.innerHTML = '';
  
  const filtered = state.miraklOrders.filter(o => {
    const idMatch = o.order_id && o.order_id.toLowerCase().includes(query);
    const customerMatch = o.customer && (
      (o.customer.firstname && o.customer.firstname.toLowerCase().includes(query)) ||
      (o.customer.lastname && o.customer.lastname.toLowerCase().includes(query))
    );
    return idMatch || customerMatch;
  });
  
  if (filtered.length === 0) {
    elements.noOrdersMsg.classList.remove('hidden');
    return;
  }
  elements.noOrdersMsg.classList.add('hidden');
  
  filtered.forEach(o => {
    const orderId = o.order_id || 'N/A';
    const customer = o.customer ? `${o.customer.firstname} ${o.customer.lastname}` : 'N/A';
    const email = o.customer?.email || 'N/A';
    const lineCount = o.order_lines ? o.order_lines.length : 0;
    const totalAmount = o.total_price || '0.00';
    const orderState = o.order_state || 'WAITING_ACCEPTANCE';
    
    // Status Badge
    let statusClass = 'badge-warning';
    if (orderState === 'SHIPPED') statusClass = 'badge-success';
    else if (orderState === 'STAGING') statusClass = 'badge-info';
    else if (orderState === 'REFUSED' || orderState === 'CANCELLED') statusClass = 'badge-error';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="sku-badge" style="background-color: var(--color-accent-glow); color: #fff;">${orderId}</span></td>
      <td style="font-weight: 500;">${customer}</td>
      <td class="font-mono" style="font-size: 0.78rem;">${email}</td>
      <td>${lineCount} item(s)</td>
      <td style="font-weight: 600;">$${totalAmount}</td>
      <td><span class="data-badge ${statusClass}">${orderState}</span></td>
    `;
    elements.tableOrders.appendChild(tr);
  });
}

// Logs Console Handler
let lastLogsLength = 0;
let activeLogFilter = 'all';

function setupLogsView() {
  elements.clearLogsBtn.addEventListener('click', () => {
    elements.logTerminal.innerHTML = '';
    showToast('Local console logs cleared', 'info');
  });
  
  elements.logFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.logFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLogFilter = btn.getAttribute('data-log-filter');
      renderLogs();
    });
  });
}

function startLogsPolling() {
  stopLogsPolling();
  loadLogs();
  state.logsPollInterval = setInterval(loadLogs, 2000);
}

function stopLogsPolling() {
  if (state.logsPollInterval) {
    clearInterval(state.logsPollInterval);
    state.logsPollInterval = null;
  }
}

async function loadLogs() {
  try {
    const res = await fetch('/api/logs');
    const logs = await res.json();
    state.logs = logs;
    
    // Only re-render if logs count changed
    if (logs.length !== lastLogsLength) {
      lastLogsLength = logs.length;
      renderLogs();
    }
  } catch (err) {
    console.error('Error fetching logs', err);
  }
}

function renderLogs() {
  const atBottom = elements.logTerminal.scrollHeight - elements.logTerminal.scrollTop <= elements.logTerminal.clientHeight + 40;
  elements.logTerminal.innerHTML = '';
  
  const filteredLogs = state.logs.filter(log => {
    if (activeLogFilter === 'all') return true;
    if (activeLogFilter === 'info' && log.type === 'info') return true;
    if (activeLogFilter === 'success' && log.type === 'success') return true;
    if (activeLogFilter === 'error' && log.type === 'error') return true;
    return false;
  });
  
  if (filteredLogs.length === 0) {
    elements.logTerminal.innerHTML = `<div style="color: var(--color-text-muted); font-style: italic;">No logs found for filter: ${activeLogFilter}</div>`;
    return;
  }
  
  filteredLogs.forEach(log => {
    const timeStr = new Date(log.timestamp).toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${log.type}`;
    entry.innerHTML = `
      <span class="log-time">[${timeStr}]</span>
      <span class="log-tag">[${log.type}]</span>
      <span class="log-msg">${log.message}</span>
    `;
    elements.logTerminal.appendChild(entry);
  });
  
  // Auto scroll
  if (atBottom) {
    elements.logTerminal.scrollTop = elements.logTerminal.scrollHeight;
  }
}

function setupSettings() {
  const saveBtn = document.getElementById('save-settings-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      
      const payload = {
        SHOPIFY_PRODUCT_STATUS: document.getElementById('setting-shopify-status').value,
        SYNC_INTERVAL_MINUTES: document.getElementById('setting-sync-interval').value,
        SHOPIFY_SHOP_URL: document.getElementById('setting-shopify-url').value,
        SHOPIFY_API_VERSION: document.getElementById('setting-shopify-version').value,
        SHOPIFY_ACCESS_TOKEN: document.getElementById('setting-shopify-token').value,
        SHOPIFY_CLIENT_ID: document.getElementById('setting-shopify-client-id').value,
        SHOPIFY_CLIENT_SECRET: document.getElementById('setting-shopify-client-secret').value,
        MIRAKL_API_URL: document.getElementById('setting-mirakl-url').value,
        MIRAKL_API_KEY: document.getElementById('setting-mirakl-key').value,
        MIRAKL_SHOP_ID: document.getElementById('setting-mirakl-shop-id').value,
        PORT: document.getElementById('setting-server-port').value
      };
      
      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
          showToast('Settings saved successfully and rescheduled jobs', 'success');
          checkPlatformConnection();
          loadKpis();
        } else {
          showToast(`Failed to save settings: ${data.error}`, 'error');
        }
      } catch (err) {
        showToast('Network error saving settings', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-save-fill"></i> Save Configuration';
      }
    });
  }
}

async function loadSettings() {
  const saveBtn = document.getElementById('save-settings-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Loading...';
  
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    
    document.getElementById('setting-shopify-status').value = data.SHOPIFY_PRODUCT_STATUS || 'active';
    document.getElementById('setting-sync-interval').value = data.SYNC_INTERVAL_MINUTES || '15';
    document.getElementById('setting-shopify-url').value = data.SHOPIFY_SHOP_URL || '';
    document.getElementById('setting-shopify-version').value = data.SHOPIFY_API_VERSION || '';
    document.getElementById('setting-shopify-token').value = data.SHOPIFY_ACCESS_TOKEN || '';
    document.getElementById('setting-shopify-client-id').value = data.SHOPIFY_CLIENT_ID || '';
    document.getElementById('setting-shopify-client-secret').value = data.SHOPIFY_CLIENT_SECRET || '';
    document.getElementById('setting-mirakl-url').value = data.MIRAKL_API_URL || '';
    document.getElementById('setting-mirakl-key').value = data.MIRAKL_API_KEY || '';
    document.getElementById('setting-mirakl-shop-id').value = data.MIRAKL_SHOP_ID || '';
    document.getElementById('setting-server-port').value = data.PORT || '3000';
    
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="bi bi-save-fill"></i> Save Configuration';
  } catch (err) {
    showToast('Failed to load configuration settings', 'error');
    saveBtn.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error Loading';
  }
}

// Sync Monitor Logic
function setupSyncMonitor() {
  if (elements.searchMonitor) {
    elements.searchMonitor.addEventListener('input', renderMonitorTable);
  }
  if (elements.filterMonitorStatus) {
    elements.filterMonitorStatus.addEventListener('change', renderMonitorTable);
  }
  if (elements.btnSyncAllMismatched) {
    elements.btnSyncAllMismatched.addEventListener('click', async () => {
      const mismatches = state.mappedProducts.filter(p => 
        p.syncStatus === 'price_mismatch' || 
        p.syncStatus === 'stock_mismatch' || 
        p.syncStatus === 'price_and_stock_mismatch' ||
        p.syncStatus === 'shopify_only'
      );
      
      if (mismatches.length === 0) {
        showToast('No mismatched products found to sync', 'info');
        return;
      }
      
      if (!confirm(`Are you sure you want to sync all ${mismatches.length} mismatched products?`)) return;
      
      elements.btnSyncAllMismatched.disabled = true;
      elements.btnSyncAllMismatched.innerHTML = `<span class="spinner" style="width: 14px; height: 14px; display: inline-block;"></span> Syncing...`;
      
      try {
        const skus = mismatches.map(p => p.sku);
        const res = await fetch('/api/sync/skus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skus })
        });
        const data = await res.json();
        
        if (data.success) {
          showToast(`Successfully synced ${mismatches.length} items to Mirakl`, 'success');
          loadMappedProducts();
        } else {
          showToast(`Failed to sync: ${data.error || data.message}`, 'error');
        }
      } catch (err) {
        showToast(`Error during bulk sync: ${err.message}`, 'error');
      } finally {
        elements.btnSyncAllMismatched.disabled = false;
        elements.btnSyncAllMismatched.innerHTML = `<i class="bi bi-arrow-repeat"></i> Sync Mismatched`;
      }
    });
  }
}

async function loadMappedProducts() {
  if (!elements.tableMonitor) return;
  
  elements.tableMonitor.innerHTML = `<tr><td colspan="8" class="text-center"><div class="spinner"></div> Loading sync data...</td></tr>`;
  elements.noMonitorMsg.classList.add('hidden');
  
  // Set initial summary stats to loading state
  elements.monitorCountSynced.textContent = '...';
  elements.monitorCountMismatches.textContent = '...';
  elements.monitorCountShopifyOnly.textContent = '...';
  elements.monitorCountMiraklOnly.textContent = '...';

  try {
    const res = await fetch('/api/data/mapped-products');
    if (!res.ok) throw new Error('API request failed');
    
    state.mappedProducts = await res.json();
    
    // Calculate and render summary stats
    let synced = 0;
    let mismatches = 0;
    let shopifyOnly = 0;
    let miraklOnly = 0;
    
    state.mappedProducts.forEach(p => {
      if (p.syncStatus === 'synced') synced++;
      else if (p.syncStatus === 'shopify_only') shopifyOnly++;
      else if (p.syncStatus === 'mirakl_only') miraklOnly++;
      else mismatches++;
    });
    
    elements.monitorCountSynced.textContent = synced;
    elements.monitorCountMismatches.textContent = mismatches;
    elements.monitorCountShopifyOnly.textContent = shopifyOnly;
    elements.monitorCountMiraklOnly.textContent = miraklOnly;
    
    renderMonitorTable();
  } catch (err) {
    elements.tableMonitor.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load sync comparison details. Check backend logs and connection.</td></tr>`;
    elements.monitorCountSynced.textContent = 'Err';
    elements.monitorCountMismatches.textContent = 'Err';
    elements.monitorCountShopifyOnly.textContent = 'Err';
    elements.monitorCountMiraklOnly.textContent = 'Err';
  }
}

function renderMonitorTable() {
  if (!elements.tableMonitor) return;
  
  const query = elements.searchMonitor.value.toLowerCase().trim();
  const filter = elements.filterMonitorStatus.value;
  elements.tableMonitor.innerHTML = '';
  
  const filtered = state.mappedProducts.filter(p => {
    // 1. Filter by search query
    const titleMatch = p.title && p.title.toLowerCase().includes(query);
    const skuMatch = p.sku && p.sku.toLowerCase().includes(query);
    const matchesSearch = titleMatch || skuMatch;
    if (!matchesSearch) return false;
    
    // 2. Filter by status dropdown
    if (filter === 'all') return true;
    if (filter === 'synced') return p.syncStatus === 'synced';
    if (filter === 'mismatch') {
      return p.syncStatus === 'price_mismatch' || 
             p.syncStatus === 'stock_mismatch' || 
             p.syncStatus === 'price_and_stock_mismatch';
    }
    if (filter === 'shopify_only') return p.syncStatus === 'shopify_only';
    if (filter === 'mirakl_only') return p.syncStatus === 'mirakl_only';
    
    return true;
  });
  
  if (filtered.length === 0) {
    elements.noMonitorMsg.classList.remove('hidden');
    return;
  }
  elements.noMonitorMsg.classList.add('hidden');
  
  filtered.forEach(p => {
    const tr = document.createElement('tr');
    
    // Badge generation
    let badgeHtml = '';
    switch (p.syncStatus) {
      case 'synced':
        badgeHtml = `<span class="data-badge badge-synced"><i class="bi bi-check-circle-fill"></i> Synced</span>`;
        break;
      case 'shopify_only':
        badgeHtml = `<span class="data-badge badge-shopify-only"><i class="bi bi-shopify"></i> Shopify Only</span>`;
        break;
      case 'mirakl_only':
        badgeHtml = `<span class="data-badge badge-mirakl-only"><i class="bi bi-tags-fill"></i> Mirakl Only</span>`;
        break;
      case 'price_mismatch':
        badgeHtml = `<span class="data-badge badge-mismatch"><i class="bi bi-cash-stack"></i> Price Alert</span>`;
        break;
      case 'stock_mismatch':
        badgeHtml = `<span class="data-badge badge-mismatch"><i class="bi bi-boxes"></i> Stock Alert</span>`;
        break;
      case 'price_and_stock_mismatch':
        badgeHtml = `<span class="data-badge badge-mismatch"><i class="bi bi-exclamation-triangle-fill"></i> Sync Mismatch</span>`;
        break;
    }
    
    // Color coding values
    const isPriceMismatch = p.syncStatus === 'price_mismatch' || p.syncStatus === 'price_and_stock_mismatch';
    const isStockMismatch = p.syncStatus === 'stock_mismatch' || p.syncStatus === 'price_and_stock_mismatch';
    
    const shopPriceText = p.shopifyPrice !== null ? `$${parseFloat(p.shopifyPrice).toFixed(2)}` : '—';
    const mirPriceText = p.miraklPrice !== null ? `$${parseFloat(p.miraklPrice).toFixed(2)}` : '—';
    
    const shopStockText = p.shopifyStock !== null ? p.shopifyStock : '—';
    const mirStockText = p.miraklStock !== null ? p.miraklStock : '—';
    
    const priceCellClass = isPriceMismatch ? 'val-mismatch' : 'val-match';
    const stockCellClass = isStockMismatch ? 'val-mismatch' : 'val-match';
    
    // Image placeholder
    const imageHtml = p.imageUrl 
      ? `<img src="${p.imageUrl}" class="product-img" onerror="this.src='https://placehold.co/50x50?text=Shopify'">`
      : `<div class="product-img" style="display: flex; align-items: center; justify-content: center; font-size: 1.2rem; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);"><i class="bi ${p.syncStatus === 'mirakl_only' ? 'bi-tags' : 'bi-bag'}"></i></div>`;
      
    // Action button
    let actionBtnHtml = '';
    if (p.syncStatus === 'mirakl_only') {
      actionBtnHtml = `<button class="btn-inline-sync" disabled><i class="bi bi-slash-circle"></i> N/A</button>`;
    } else {
      actionBtnHtml = `<button class="btn-inline-sync" data-sku="${p.sku}"><i class="bi bi-cloud-arrow-up-fill"></i> Sync</button>`;
    }
    
    tr.innerHTML = `
      <td>
        <div class="product-cell">
          ${imageHtml}
          <div class="product-info">
            <span class="product-title-txt">${p.title}</span>
            <span class="product-id-txt" style="font-size: 0.72rem;">${p.variantTitle ? `Variant: ${p.variantTitle}` : 'Default Variant'}</span>
          </div>
        </div>
      </td>
      <td><span class="sku-badge">${p.sku}</span></td>
      <td><span class="${priceCellClass}">${shopPriceText}</span></td>
      <td><span class="${priceCellClass}">${mirPriceText}</span></td>
      <td><span class="${stockCellClass}" style="font-weight: 600;">${shopStockText}</span></td>
      <td><span class="${stockCellClass}" style="font-weight: 600;">${mirStockText}</span></td>
      <td>${badgeHtml}</td>
      <td>${actionBtnHtml}</td>
    `;
    
    // Bind click listener for sync button
    const syncBtn = tr.querySelector('.btn-inline-sync');
    if (syncBtn && !syncBtn.disabled) {
      syncBtn.addEventListener('click', async () => {
        syncBtn.disabled = true;
        syncBtn.innerHTML = `<span class="spinner" style="width: 10px; height: 10px; display: inline-block;"></span>`;
        
        try {
          const res = await fetch('/api/sync/sku', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku: p.sku })
          });
          const data = await res.json();
          
          if (data.success) {
            showToast(`Synced ${p.sku} to Mirakl successfully`, 'success');
            loadMappedProducts(); // Reload all to refresh UI
          } else {
            showToast(`Failed to sync SKU ${p.sku}: ${data.error}`, 'error');
            syncBtn.disabled = false;
            syncBtn.innerHTML = `<i class="bi bi-cloud-arrow-up-fill"></i> Sync`;
          }
        } catch (err) {
          showToast(`Error syncing SKU ${p.sku}`, 'error');
          syncBtn.disabled = false;
          syncBtn.innerHTML = `<i class="bi bi-cloud-arrow-up-fill"></i> Sync`;
        }
      });
    }
    
    elements.tableMonitor.appendChild(tr);
  });
}
