const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const navLinks = document.querySelectorAll(".nav-menu a");
const form = document.querySelector(".contact-form");
const formNote = document.querySelector(".form-note");
const areaSelect = document.querySelector(".area-select");
const otherAreaField = document.querySelector(".other-area-field");

navToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("nav-open", isOpen);
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((element) => {
  revealObserver.observe(element);
});

areaSelect.addEventListener("change", () => {
  otherAreaField.hidden = areaSelect.value !== "Otro";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formNote.textContent =
    "Solicitud preparada. Conecta este formulario a tu email, CRM o automatizacion para recibir diagnosticos y priorizar oportunidades.";
});
