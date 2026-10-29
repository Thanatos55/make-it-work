const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navMenu.classList.toggle('menu-open');
  });
}

const pageName = document.body.dataset.page;
const navLinks = document.querySelectorAll('.nav-menu a');
navLinks.forEach((link) => {
  const href = link.getAttribute('href');
  if (!href) return;
  if (pageName === 'home' && href === './index.html') link.classList.add('active');
  if (pageName === 'services' && href === './services.html') link.classList.add('active');
  if (pageName === 'about' && href === './about.html') link.classList.add('active');
  if (pageName === 'gallery' && href === './gallery.html') link.classList.add('active');
  if (pageName === 'contact' && href === './contact.html') link.classList.add('active');
});

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
));

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
};

// Services and the gallery are managed from the admin area; the static markup stays as a fallback.
const servicesGrid = document.querySelector('[data-services-grid]');
const serviceSelect = document.querySelector('[data-service-select]');

if (servicesGrid || serviceSelect) {
  fetchJson('/api/services')
    .then((services) => {
      if (!services.length) return;

      if (servicesGrid) {
        servicesGrid.innerHTML = services.map((service) => `
          <article class="detail-card" id="${escapeHtml(service.slug)}">
            <h2>${escapeHtml(service.name)}</h2>
            <p>${escapeHtml(service.description)}</p>
            <a href="./contact.html#appointment-form" class="small-button">BOOKING</a>
          </article>
        `).join('');
        if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
      }

      if (serviceSelect) {
        const current = serviceSelect.value;
        serviceSelect.innerHTML = '<option value="">Select a service</option>' +
          services.map((service) => `<option>${escapeHtml(service.name)}</option>`).join('');
        serviceSelect.value = current;
      }
    })
    .catch(() => {});
}

const galleryGrid = document.querySelector('[data-gallery-grid]');

if (galleryGrid) {
  fetchJson('/api/gallery')
    .then((items) => {
      if (!items.length) return;
      galleryGrid.innerHTML = items.map((item) => `
        <figure class="gallery-card">
          <img src="/api/images/${escapeHtml(item.imageKey)}" alt="${escapeHtml(item.title)}" loading="lazy" />
          <figcaption>
            <h2>${escapeHtml(item.title)}</h2>
            ${item.caption ? `<p>${escapeHtml(item.caption)}</p>` : ''}
          </figcaption>
        </figure>
      `).join('');
      document.querySelector('[data-gallery-section]').hidden = false;
      document.querySelector('[data-gallery-empty]').textContent = 'A look at some of our recent jobs.';
    })
    .catch(() => {});
}

const appointmentForm = document.querySelector('#appointment-form');

if (appointmentForm) {
  const message = appointmentForm.querySelector('.form-message');
  const submitButton = appointmentForm.querySelector('[type="submit"]');

  const showMessage = (text, isError = false) => {
    message.textContent = text;
    message.classList.toggle('is-error', isError);
    message.hidden = false;
  };

  appointmentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'SENDING…';
    message.hidden = true;

    try {
      const formData = new FormData(appointmentForm);
      const photos = formData.getAll('photo').filter((file) => file instanceof File && file.size > 0);
      formData.delete('photo');
      for (const photo of photos) formData.append('photo', await window.resizeImage(photo));

      const response = await fetch('/api/bookings', { method: 'POST', body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');

      appointmentForm.reset();
      showMessage("Thanks! Your booking request has been sent. We'll be in touch soon to confirm.");
    } catch (error) {
      showMessage(error.message || 'Something went wrong. Please try again.', true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'BOOK APPOINTMENT';
    }
  });
}

// Identity emails (invites, password resets) link to the home page; send them on to the admin area.
if (/(invite|recovery|confirmation|email_change)_token=/.test(location.hash)) {
  location.replace(`/admin/${location.hash}`);
}
