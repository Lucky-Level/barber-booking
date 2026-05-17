// Barber Booking - Admin panel logic
const db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

let adminPassword = sessionStorage.getItem('bb_admin_pwd') || '';

// Auto-login if session exists
if (adminPassword) {
  db.rpc('verify_admin_password', { pwd: adminPassword }).then(({ data }) => {
    if (data) {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('admin-panel').classList.remove('hidden');
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('av-date').value = today;
      document.getElementById('apt-filter-date').value = today;
      loadAvailability();
      loadAppointments();
    } else {
      adminPassword = '';
      sessionStorage.removeItem('bb_admin_pwd');
    }
  });
}

// --- Login ---
async function doLogin() {
  const pwd = document.getElementById('password-input').value;
  const errorEl = document.getElementById('login-error');

  const { data, error } = await db.rpc('verify_admin_password', { pwd });

  if (error || !data) {
    errorEl.textContent = 'Senha incorreta';
    errorEl.classList.remove('hidden');
    return;
  }

  adminPassword = pwd;
  sessionStorage.setItem('bb_admin_pwd', pwd);
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-panel').classList.remove('hidden');

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('av-date').value = today;
  document.getElementById('apt-filter-date').value = today;

  loadAvailability();
  loadAppointments();
}

function logout() {
  adminPassword = '';
  sessionStorage.removeItem('bb_admin_pwd');
  document.getElementById('admin-panel').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('password-input').value = '';
}

// --- Tabs ---
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.getElementById('tab-availability').classList.toggle('hidden', tab !== 'availability');
  document.getElementById('tab-appointments').classList.toggle('hidden', tab !== 'appointments');
  document.getElementById('tab-products').classList.toggle('hidden', tab !== 'products');
  document.getElementById('tab-orders').classList.toggle('hidden', tab !== 'orders');

  if (tab === 'products') loadAdminProducts();
  if (tab === 'orders') loadOrders();
}

// --- Availability ---
async function loadAvailability() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await db
    .from('availability')
    .select('*')
    .gte('date', today)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  const list = document.getElementById('avail-list');
  const empty = document.getElementById('avail-empty');

  if (!data || data.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  list.innerHTML = data.map(a => {
    const d = new Date(a.date + 'T00:00:00');
    const dayName = weekdays[d.getDay()];
    const dateParts = a.date.split('-');
    const dateFormatted = `${dateParts[2]}/${dateParts[1]}`;
    const start = a.start_time.slice(0, 5);
    const end = a.end_time.slice(0, 5);

    return `
      <li class="avail-item">
        <div class="info">
          <strong>${dayName} ${dateFormatted}</strong> &mdash; ${start} ate ${end}
        </div>
        <button class="delete-btn" onclick="deleteAvailability('${a.id}')" title="Remover">&#10005;</button>
      </li>
    `;
  }).join('');
}

async function addAvailability() {
  const date = document.getElementById('av-date').value;
  const start = document.getElementById('av-start').value;
  const end = document.getElementById('av-end').value;

  if (!date || !start || !end) return;
  if (start >= end) {
    alert('Horario de inicio deve ser antes do fim');
    return;
  }

  const { data } = await db.rpc('admin_manage_availability', {
    pwd: adminPassword,
    action: 'insert',
    av_date: date,
    av_start: start,
    av_end: end
  });

  if (data?.error) {
    alert(data.error);
    return;
  }

  loadAvailability();
}

async function deleteAvailability(id) {
  if (!confirm('Remover esta disponibilidade?')) return;

  await db.rpc('admin_manage_availability', {
    pwd: adminPassword,
    action: 'delete',
    av_id: id
  });

  loadAvailability();
}

// --- Appointments ---
async function loadAppointments() {
  const date = document.getElementById('apt-filter-date').value;
  if (!date) return;

  const { data } = await db
    .from('appointments')
    .select('*, services(name, duration_minutes)')
    .eq('date', date)
    .order('start_time', { ascending: true });

  const container = document.getElementById('apt-list');
  const empty = document.getElementById('apt-empty');

  if (!data || data.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  container.innerHTML = data.map(apt => {
    const start = apt.start_time.slice(0, 5);
    const end = apt.end_time.slice(0, 5);
    const isCancelled = apt.status === 'cancelled';
    const cls = isCancelled ? 'apt-item cancelled' : 'apt-item';
    const cancelBtn = isCancelled ? '' :
      `<button class="btn btn-danger btn-sm" onclick="cancelAppointment('${apt.id}')">Cancelar</button>`;

    return `
      <div class="${cls}">
        <div>
          <div class="client">${apt.client_name}</div>
          <div class="details">
            ${apt.services?.name || 'Servico'} &mdash; ${start} - ${end}
          </div>
          <div class="details">${apt.client_phone}</div>
          ${isCancelled ? '<div class="details" style="color:var(--danger)">CANCELADO</div>' : ''}
        </div>
        ${cancelBtn}
      </div>
    `;
  }).join('');
}

async function cancelAppointment(id) {
  if (!confirm('Cancelar este agendamento?')) return;

  await db.rpc('admin_cancel_appointment', {
    pwd: adminPassword,
    apt_id: id
  });

  loadAppointments();
}

// --- Products ---
async function loadAdminProducts() {
  const { data } = await db.from('products')
    .select('*')
    .order('created_at', { ascending: false });

  const container = document.getElementById('products-list');
  const empty = document.getElementById('products-empty');

  if (!data || data.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  container.innerHTML = data.map(p => `
    <div class="avail-item" style="flex-wrap: wrap; gap: 8px;">
      <div class="info" style="flex: 1;">
        <strong>${p.name}</strong> &mdash; ${Number(p.price).toFixed(2)} EUR
        <div style="font-size: 0.75rem; color: var(--text-muted);">${p.description || ''}</div>
        <div style="font-size: 0.7rem; color: ${p.active ? 'var(--success)' : 'var(--danger)'};">${p.active ? 'Ativo' : 'Inativo'}</div>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="btn btn-outline btn-sm" onclick="toggleProduct('${p.id}', ${!p.active}, event)">${p.active ? 'Desativar' : 'Ativar'}</button>
        <button class="delete-btn" onclick="deleteProduct('${p.id}', event)" title="Remover">&#10005;</button>
      </div>
    </div>
  `).join('');
}

// Selected image file (from camera or gallery)
let selectedImageFile = null;

function handleImageSelect(input) {
  const file = input.files[0];
  const preview = document.getElementById('prod-image-preview');
  if (file) {
    selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.innerHTML = `<img src="${ev.target.result}">`;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  } else {
    selectedImageFile = null;
    preview.classList.add('hidden');
    preview.innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
});

async function uploadProductImage(file) {
  const ext = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await db.storage
    .from('product-images')
    .upload(fileName, file, { contentType: file.type });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  // Get public URL
  const { data: urlData } = db.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

async function addProduct() {
  const name = document.getElementById('prod-name').value.trim();
  const desc = document.getElementById('prod-desc').value.trim();
  const price = parseFloat(document.getElementById('prod-price').value);

  if (!name || !price) {
    alert('Nome e preco sao obrigatorios');
    return;
  }

  let imageUrl = null;
  if (selectedImageFile) {
    imageUrl = await uploadProductImage(selectedImageFile);
    if (!imageUrl) {
      alert('Erro ao fazer upload da imagem. Tente novamente.');
      return;
    }
  }

  const { data } = await db.rpc('admin_manage_product', {
    pwd: adminPassword,
    action: 'insert',
    p_name: name,
    p_description: desc || null,
    p_price: price,
    p_image_url: imageUrl,
    p_active: true
  });

  if (data?.error) {
    alert(data.error);
    return;
  }

  // Clear form
  document.getElementById('prod-name').value = '';
  document.getElementById('prod-desc').value = '';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-image-camera').value = '';
  document.getElementById('prod-image-gallery').value = '';
  document.getElementById('prod-image-preview').classList.add('hidden');
  selectedImageFile = null;

  loadAdminProducts();
}

async function toggleProduct(id, active, event) {
  if (event) event.stopPropagation();
  await db.rpc('admin_manage_product', {
    pwd: adminPassword,
    action: 'update',
    p_id: id,
    p_active: active
  });
  loadAdminProducts();
}

async function deleteProduct(id, event) {
  if (event) event.stopPropagation();
  if (!confirm('Remover este produto?')) return;

  try {
    const { data, error } = await db.rpc('admin_manage_product', {
      pwd: adminPassword,
      action: 'delete',
      p_id: id
    });
    if (error) console.error('Delete error:', error);
  } catch (e) {
    console.error('Delete exception:', e);
  }
  loadAdminProducts();
}

// --- Orders ---
async function loadOrders() {
  const { data } = await db.from('orders')
    .select('*, products(name, price)')
    .order('created_at', { ascending: false });

  const container = document.getElementById('orders-list');
  const empty = document.getElementById('orders-empty');

  if (!data || data.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  const statusLabels = {
    pending: 'Pendente',
    paid: 'Pago',
    delivered: 'Entregue',
    cancelled: 'Cancelado'
  };
  const statusColors = {
    pending: 'var(--accent)',
    paid: 'var(--success)',
    delivered: 'var(--text-muted)',
    cancelled: 'var(--danger)'
  };

  container.innerHTML = data.map(o => {
    const date = new Date(o.created_at).toLocaleDateString('pt-BR');
    return `
      <div class="avail-item" style="flex-wrap: wrap; gap: 8px;">
        <div class="info" style="flex: 1;">
          <strong>${o.products?.name || 'Produto'}</strong> &mdash; ${Number(o.products?.price || 0).toFixed(2)} EUR
          <div style="font-size: 0.8rem;">${o.client_name} - ${o.client_phone}</div>
          <div style="font-size: 0.75rem; color: ${statusColors[o.status]};">${statusLabels[o.status]} | ${date}</div>
        </div>
        <div style="display:flex; gap:4px; flex-wrap:wrap;">
          ${o.status === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${o.id}','paid')">Pago</button>` : ''}
          ${o.status === 'paid' ? `<button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${o.id}','delivered')">Entregue</button>` : ''}
          ${o.status !== 'cancelled' ? `<button class="btn btn-danger btn-sm" onclick="updateOrderStatus('${o.id}','cancelled')">Cancelar</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function updateOrderStatus(id, status) {
  await db.rpc('admin_manage_order', {
    pwd: adminPassword,
    action: 'update_status',
    o_id: id,
    o_status: status
  });
  loadOrders();
}
