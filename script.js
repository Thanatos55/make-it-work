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
