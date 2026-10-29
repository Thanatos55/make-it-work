import {
  AuthError,
  acceptInvite,
  getUser,
  handleAuthCallback,
  login,
  logout,
  requestPasswordRecovery,
  updateUser,
} from 'https://esm.sh/@netlify/identity@2.0.0';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
));

const showView = (name) => {
  $$('[data-view]').forEach((view) => { view.hidden = view.dataset.view !== name; });
};

const setMessage = (form, text, isError = false) => {
  const message = $('[data-message]', form);
  message.textContent = text || '';
  message.classList.toggle('is-error', isError);
  message.hidden = !text;
};

const api = async (url, options = {}) => {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  if (response.status === 401) {
    showView('login');
    throw new Error('Your session has expired. Please log in again.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
};

const sendJson = (url, method, body) => api(url, {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/* ---------- Bookings ---------- */

const STATUS_LABELS = { new: 'New', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
let bookings = [];

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const renderBookings = () => {
  const target = $('#bookings-list');
  const filter = $('[data-booking-filter]').value;
  const visible = filter ? bookings.filter((booking) => booking.status === filter) : bookings;

  const newCount = bookings.filter((booking) => booking.status === 'new').length;
  const badge = $('[data-new-count]');
  badge.textContent = newCount;
  badge.hidden = newCount === 0;

  if (!visible.length) {
    target.innerHTML = `<div class="empty-state">${filter ? `No ${STATUS_LABELS[filter].toLowerCase()} bookings.` : 'No bookings yet.'}</div>`;
    return;
  }

  target.innerHTML = visible.map((booking) => `
    <article class="admin-card booking-item status-${escapeHtml(booking.status)}">
      <header class="booking-header">
        <div>
          <h3>${escapeHtml(booking.fullName)}</h3>
          <p class="muted">${escapeHtml(booking.service)} · received ${formatDate(booking.createdAt)}</p>
        </div>
        <select data-booking-status="${booking.id}" aria-label="Booking status">
          ${Object.entries(STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${booking.status === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </header>
      <dl class="booking-details">
        <div><dt>Preferred</dt><dd>${formatDate(booking.preferredDate)} at ${escapeHtml(booking.preferredTime)}</dd></div>
        <div><dt>Phone</dt><dd><a href="tel:${escapeHtml(booking.telephone)}">${escapeHtml(booking.telephone)}</a></dd></div>
        <div><dt>Email</dt><dd>${booking.email ? `<a href="mailto:${escapeHtml(booking.email)}">${escapeHtml(booking.email)}</a>` : '<span class="muted">Not given</span>'}</dd></div>
        <div><dt>Postcode</dt><dd>${escapeHtml(booking.postcode)}</dd></div>
        <div class="full"><dt>Job</dt><dd>${escapeHtml(booking.description)}</dd></div>
      </dl>
      ${booking.photoKeys.length ? `
        <div class="booking-photos">
          ${booking.photoKeys.map((key) => `<a href="/api/images/${escapeHtml(key)}" target="_blank" rel="noreferrer"><img src="/api/images/${escapeHtml(key)}" alt="Photo from ${escapeHtml(booking.fullName)}" loading="lazy" /></a>`).join('')}
        </div>` : ''}
      <div class="card-actions">
        <button type="button" class="danger" data-delete-booking="${booking.id}">Delete</button>
      </div>
    </article>
  `).join('');
};

const loadBookings = async () => {
  bookings = await api('/api/bookings');
  renderBookings();
};

$('[data-booking-filter]').addEventListener('change', renderBookings);

/* ---------- Gallery ---------- */

let galleryItems = [];
const galleryForm = $('#gallery-form');

const resetGalleryForm = () => {
  galleryForm.reset();
  galleryForm.elements.id.value = '';
  $('[data-gallery-form-title]').textContent = 'Upload a photo';
  $('[data-gallery-file]').hidden = false;
  setMessage(galleryForm, '');
};

const renderGallery = () => {
  const target = $('#gallery-list');
  if (!galleryItems.length) {
    target.innerHTML = '<div class="empty-state">No photos yet. Upload your first one above.</div>';
    return;
  }
  target.innerHTML = galleryItems.map((item) => `
    <article class="admin-card gallery-item">
      <img src="/api/images/${escapeHtml(item.imageKey)}" alt="${escapeHtml(item.title)}" loading="lazy" />
      <h3>${escapeHtml(item.title)}</h3>
      ${item.caption ? `<p>${escapeHtml(item.caption)}</p>` : ''}
      <p class="muted">Order: ${item.sortOrder}</p>
      <div class="card-actions">
        <button type="button" data-edit-gallery="${item.id}">Edit</button>
        <button type="button" class="danger" data-delete-gallery="${item.id}">Delete</button>
      </div>
    </article>
  `).join('');
};

const loadGallery = async () => {
  galleryItems = await api('/api/gallery');
  renderGallery();
};

galleryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = galleryForm.elements.id.value;
  const button = $('[type="submit"]', galleryForm);
  button.disabled = true;
  setMessage(galleryForm, id ? 'Saving…' : 'Uploading…');

  try {
    if (id) {
      await sendJson(`/api/gallery/${id}`, 'PUT', {
        title: galleryForm.elements.title.value,
        caption: galleryForm.elements.caption.value,
        sortOrder: galleryForm.elements.sortOrder.value,
      });
    } else {
      const file = galleryForm.elements.image.files[0];
      if (!file) throw new Error('Please choose a photo to upload.');
      const formData = new FormData(galleryForm);
      formData.set('image', await window.resizeImage(file, 2000));
      await api('/api/gallery', { method: 'POST', body: formData });
    }
    resetGalleryForm();
    setMessage(galleryForm, 'Saved.');
    await loadGallery();
  } catch (error) {
    setMessage(galleryForm, error.message, true);
  } finally {
    button.disabled = false;
  }
});

$('[data-clear-gallery]').addEventListener('click', resetGalleryForm);

/* ---------- Services ---------- */

let services = [];
const serviceForm = $('#service-form');

const resetServiceForm = () => {
  serviceForm.reset();
  serviceForm.elements.id.value = '';
  $('[data-service-form-title]').textContent = 'Add a service';
  setMessage(serviceForm, '');
};

const renderServices = () => {
  const target = $('#services-list');
  if (!services.length) {
    target.innerHTML = '<div class="empty-state">No services yet.</div>';
    return;
  }
  target.innerHTML = services.map((service) => `
    <article class="admin-card ${service.visible ? '' : 'is-hidden'}">
      <h3>${escapeHtml(service.name)} ${service.visible ? '' : '<span class="tag">Hidden</span>'}</h3>
      <p>${escapeHtml(service.description)}</p>
      <p class="muted">Order: ${service.sortOrder}</p>
      <div class="card-actions">
        <button type="button" data-edit-service="${service.id}">Edit</button>
        <button type="button" class="danger" data-delete-service="${service.id}">Delete</button>
      </div>
    </article>
  `).join('');
};

const loadServices = async () => {
  services = await api('/api/services?all=1');
  renderServices();
};

serviceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = serviceForm.elements.id.value;
  const button = $('[type="submit"]', serviceForm);
  button.disabled = true;

  try {
    const body = {
      name: serviceForm.elements.name.value,
      description: serviceForm.elements.description.value,
      sortOrder: serviceForm.elements.sortOrder.value,
      visible: serviceForm.elements.visible.checked,
    };
    await sendJson(id ? `/api/services/${id}` : '/api/services', id ? 'PUT' : 'POST', body);
    resetServiceForm();
    setMessage(serviceForm, 'Saved.');
    await loadServices();
  } catch (error) {
    setMessage(serviceForm, error.message, true);
  } finally {
    button.disabled = false;
  }
});

$('[data-clear-service]').addEventListener('click', resetServiceForm);

/* ---------- Shared click handling ---------- */

document.addEventListener('change', async (event) => {
  const select = event.target.closest('[data-booking-status]');
  if (!select) return;
  try {
    const updated = await sendJson(`/api/bookings/${select.dataset.bookingStatus}`, 'PATCH', { status: select.value });
    bookings = bookings.map((booking) => (booking.id === updated.id ? updated : booking));
    renderBookings();
  } catch (error) {
    alert(error.message);
  }
});

document.addEventListener('click', async (event) => {
  const tab = event.target.closest('[data-tab]');
  if (tab) {
    $$('[data-tab]').forEach((button) => button.classList.toggle('active', button === tab));
    $$('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== tab.dataset.tab; });
    return;
  }

  const editGallery = event.target.closest('[data-edit-gallery]');
  if (editGallery) {
    const item = galleryItems.find((entry) => String(entry.id) === editGallery.dataset.editGallery);
    if (!item) return;
    galleryForm.elements.id.value = item.id;
    galleryForm.elements.title.value = item.title;
    galleryForm.elements.caption.value = item.caption;
    galleryForm.elements.sortOrder.value = item.sortOrder;
    $('[data-gallery-form-title]').textContent = 'Edit photo details';
    $('[data-gallery-file]').hidden = true;
    setMessage(galleryForm, '');
    galleryForm.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const editService = event.target.closest('[data-edit-service]');
  if (editService) {
    const item = services.find((entry) => String(entry.id) === editService.dataset.editService);
    if (!item) return;
    serviceForm.elements.id.value = item.id;
    serviceForm.elements.name.value = item.name;
    serviceForm.elements.description.value = item.description;
    serviceForm.elements.sortOrder.value = item.sortOrder;
    serviceForm.elements.visible.checked = item.visible;
    $('[data-service-form-title]').textContent = `Edit “${item.name}”`;
    setMessage(serviceForm, '');
    serviceForm.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const deletions = [
    ['data-delete-booking', '/api/bookings', 'Delete this booking? This cannot be undone.', loadBookings],
    ['data-delete-gallery', '/api/gallery', 'Delete this photo from the gallery?', loadGallery],
    ['data-delete-service', '/api/services', 'Delete this service? (Tip: untick "Show on website" to hide it instead.)', loadServices],
  ];
  for (const [attribute, base, prompt, reload] of deletions) {
    const button = event.target.closest(`[${attribute}]`);
    if (!button) continue;
    if (!confirm(prompt)) return;
    try {
      await api(`${base}/${button.getAttribute(attribute)}`, { method: 'DELETE' });
      await reload();
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  if (event.target.closest('[data-logout]')) {
    await logout().catch(() => {});
    showView('login');
  }
});

/* ---------- Authentication ---------- */

const openDashboard = async (user) => {
  $$('[data-user-email]').forEach((element) => { element.textContent = user.email; });
  if (!user.roles?.includes('admin')) {
    showView('no-access');
    return;
  }
  showView('dashboard');
  await Promise.all([loadBookings(), loadGallery(), loadServices()]).catch((error) => alert(error.message));
};

const loginForm = $('#login-form');
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(loginForm, '');
  try {
    const user = await login(loginForm.elements.email.value, loginForm.elements.password.value);
    loginForm.reset();
    await openDashboard(user);
  } catch (error) {
    setMessage(loginForm, error instanceof AuthError && error.status === 401 ? 'Invalid email or password.' : error.message, true);
  }
});

$('[data-forgot]').addEventListener('click', async () => {
  const email = loginForm.elements.email.value;
  if (!email) {
    setMessage(loginForm, 'Enter your email address first, then click "Forgot password?".', true);
    return;
  }
  try {
    await requestPasswordRecovery(email);
    setMessage(loginForm, 'If that email has an account, a password reset link is on its way.');
  } catch (error) {
    setMessage(loginForm, error.message, true);
  }
});

// Invite and password-reset links land here; both ask for a new password.
let pendingInvite = null;
const passwordForm = $('#password-form');
passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = passwordForm.elements.password.value;
  try {
    const user = pendingInvite ? await acceptInvite(pendingInvite, password) : await updateUser({ password });
    pendingInvite = null;
    passwordForm.reset();
    await openDashboard(user);
  } catch (error) {
    setMessage(passwordForm, error.message, true);
  }
});

const start = async () => {
  try {
    const result = await handleAuthCallback();
    if (result?.type === 'invite') {
      pendingInvite = result.token;
      $('[data-password-title]').textContent = 'Welcome! Choose a password';
      showView('set-password');
      return;
    }
    if (result?.type === 'recovery') {
      $('[data-password-title]').textContent = 'Choose a new password';
      showView('set-password');
      return;
    }
  } catch (error) {
    showView('login');
    setMessage(loginForm, error.message, true);
    return;
  }

  const user = await getUser();
  if (user) await openDashboard(user);
  else showView('login');
};

start();
