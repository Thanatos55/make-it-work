document.addEventListener('DOMContentLoaded', () => {
  const state = window.MakeItWorkData;

  const readServices = () => state.read(state.STORAGE_KEYS.services, state.serviceSeed);
  const readGallery = () => state.read(state.STORAGE_KEYS.gallery, state.gallerySeed);
  const readBookings = () => state.read(state.STORAGE_KEYS.bookings, []);

  const renderServices = () => {
    const target = document.querySelector('#services-list');
    if (!target) return;

    const services = readServices();
    if (!services.length) {
      target.innerHTML = '<div class="empty-state">No services yet.</div>';
      return;
    }

    target.innerHTML = services
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((service) => `
        <article class="admin-card">
          <h3>${service.name}</h3>
          <p>${service.description}</p>
          <div class="card-actions">
            <button type="button" data-edit-service="${service.id}">Edit</button>
            <button type="button" class="secondary" data-delete-service="${service.id}">Delete</button>
          </div>
        </article>
      `)
      .join('');
  };

  const renderGallery = () => {
    const target = document.querySelector('#gallery-list');
    if (!target) return;

    const gallery = readGallery();
    if (!gallery.length) {
      target.innerHTML = '<div class="empty-state">No gallery items yet.</div>';
      return;
    }

    target.innerHTML = gallery
      .map((item) => `
        <article class="admin-card gallery-item">
          <img src="${item.image}" alt="${item.title}" />
          <div>
            <h3>${item.title}</h3>
            <p>${item.category}</p>
            <div class="card-actions">
              <button type="button" data-edit-gallery="${item.id}">Edit</button>
              <button type="button" class="secondary" data-delete-gallery="${item.id}">Delete</button>
            </div>
          </div>
        </article>
      `)
      .join('');
  };

  const renderBookings = () => {
    const target = document.querySelector('#bookings-list');
    if (!target) return;

    const bookings = readBookings();
    if (!bookings.length) {
      target.innerHTML = '<div class="empty-state">No bookings yet.</div>';
      return;
    }

    target.innerHTML = bookings
      .map((booking) => `
        <article class="admin-card booking-item">
          <div><span class="booking-label">Name</span><p>${booking.fullName}</p></div>
          <div><span class="booking-label">Service</span><p>${booking.service}</p></div>
          <div><span class="booking-label">Preferred date</span><p>${booking.date}</p></div>
          <div><span class="booking-label">Phone</span><p>${booking.telephone}</p></div>
          <div><span class="booking-label">Email</span><p>${booking.email}</p></div>
          <div><span class="booking-label">Job</span><p>${booking.description}</p></div>
        </article>
      `)
      .join('');
  };

  const renderAll = () => {
    renderServices();
    renderGallery();
    renderBookings();
  };

  const serviceForm = document.querySelector('#service-form');
  if (serviceForm) {
    serviceForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(serviceForm);
      const serviceId = formData.get('id') || `service-${Date.now()}`;
      const name = String(formData.get('name') || '').trim();
      const description = String(formData.get('description') || '').trim();

      if (!name || !description) return;

      const services = readServices();
      const index = services.findIndex((service) => service.id === serviceId);
      const item = { id: serviceId, name, description, order: index >= 0 ? services[index].order : services.length + 1 };

      if (index >= 0) {
        services[index] = item;
      } else {
        services.push(item);
      }

      state.write(state.STORAGE_KEYS.services, services);
      serviceForm.reset();
      renderAll();
    });

    document.querySelector('[data-clear-service]').addEventListener('click', () => {
      serviceForm.reset();
      serviceForm.querySelector('[name="id"]').value = '';
    });
  }

  const galleryForm = document.querySelector('#gallery-form');
  if (galleryForm) {
    galleryForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(galleryForm);
      const galleryId = formData.get('id') || `gallery-${Date.now()}`;
      const title = String(formData.get('title') || '').trim();
      const category = String(formData.get('category') || '').trim();
      const image = String(formData.get('image') || '').trim();

      if (!title || !category || !image) return;

      const gallery = readGallery();
      const index = gallery.findIndex((item) => item.id === galleryId);
      const item = { id: galleryId, title, category, image };

      if (index >= 0) {
        gallery[index] = item;
      } else {
        gallery.push(item);
      }

      state.write(state.STORAGE_KEYS.gallery, gallery);
      galleryForm.reset();
      renderAll();
    });

    document.querySelector('[data-clear-gallery]').addEventListener('click', () => {
      galleryForm.reset();
      galleryForm.querySelector('[name="id"]').value = '';
    });
  }

  document.addEventListener('click', (event) => {
    const serviceButton = event.target.closest('[data-edit-service]');
    if (serviceButton) {
      const services = readServices();
      const item = services.find((service) => service.id === serviceButton.dataset.editService);
      if (!item) return;
      serviceForm.querySelector('[name="id"]').value = item.id;
      serviceForm.querySelector('[name="name"]').value = item.name;
      serviceForm.querySelector('[name="description"]').value = item.description;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const deleteServiceButton = event.target.closest('[data-delete-service]');
    if (deleteServiceButton) {
      const services = readServices().filter((service) => service.id !== deleteServiceButton.dataset.deleteService);
      state.write(state.STORAGE_KEYS.services, services);
      renderAll();
    }

    const galleryEdit = event.target.closest('[data-edit-gallery]');
    if (galleryEdit) {
      const gallery = readGallery();
      const item = gallery.find((entry) => entry.id === galleryEdit.dataset.editGallery);
      if (!item) return;
      galleryForm.querySelector('[name="id"]').value = item.id;
      galleryForm.querySelector('[name="title"]').value = item.title;
      galleryForm.querySelector('[name="category"]').value = item.category;
      galleryForm.querySelector('[name="image"]').value = item.image;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const galleryDelete = event.target.closest('[data-delete-gallery]');
    if (galleryDelete) {
      const gallery = readGallery().filter((item) => item.id !== galleryDelete.dataset.deleteGallery);
      state.write(state.STORAGE_KEYS.gallery, gallery);
      renderAll();
    }
  });

  document.querySelector('#reset-demo-data')?.addEventListener('click', () => {
    state.write(state.STORAGE_KEYS.services, state.serviceSeed);
    state.write(state.STORAGE_KEYS.gallery, state.gallerySeed);
    state.write(state.STORAGE_KEYS.bookings, []);
    renderAll();
  });

  renderAll();
});
