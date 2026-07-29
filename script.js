const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const navLinks = document.querySelectorAll(".nav-menu a");
const form = document.querySelector(".contact-form");
const formNote = document.querySelector(".form-note");
const contactMethodInputs = form?.querySelectorAll('input[name="contact_method"]') || [];
const contactEmailField = form?.querySelector(".contact-email-field");
const contactEmailInput = form?.querySelector('input[name="email"]');
const contactPhoneField = form?.querySelector(".contact-phone-field");
const contactPhoneInput = form?.querySelector('input[name="telefono"]');
const areaMultiselect = document.querySelector("[data-area-multiselect]");
const areaToggle = document.querySelector(".area-multiselect-toggle");
const areaSummary = document.querySelector("[data-area-summary]");
const areaValue = document.querySelector("[data-areas-value]");
let areaPanel = null;
const areaOptions = [
  "Administración y documentación",
  "Contabilidad y facturación",
  "Compras y proveedores",
  "Ventas y CRM",
  "Atención al cliente",
  "Marketing",
  "RRHH",
  "Dirección y reporting",
  "Operaciones internas",
  "Otro",
];
const selectedAreas = new Set();
const otherAreaField = document.querySelector(".other-area-field");

const siteHeader = document.querySelector(".site-header");
const heroSection = document.querySelector(".hero");
const heroStage = document.querySelector(".hero-stage");
const dashboardShell = document.querySelector(".dashboard-shell");
const mobileHeroQuery = window.matchMedia("(max-width: 768px)");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let tickingHero = false;
let isHeroScrollBound = false;
let mobilePanelObserver = null;
let dashboardGlowFrame = null;
let dashboardGlowTarget = { x: 50, y: 50, opacity: 0 };

const closeNavMenu = () => {
  navMenu?.classList.remove("open");
  navToggle?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("nav-open");
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const isMobileHero = () => mobileHeroQuery.matches;

const resetDesktopHeroProgress = () => {
  document.documentElement.style.setProperty("--hero-progress", "0");
  document.documentElement.style.setProperty("--hero-text-progress", "0");
  document.documentElement.style.setProperty("--arc-progress", "0");
  document.documentElement.style.setProperty("--arc-glint-rotate", "-26deg");
  heroSection?.classList.remove("text-hidden", "panel-front", "panel-active", "chart-active");
};

const updateScrollState = () => {
  const scrollY = window.scrollY || 0;
  siteHeader?.classList.toggle("is-scrolled", scrollY > 12);

  if (!heroSection || isMobileHero()) return;

  const rect = heroSection.getBoundingClientRect();
  const travel = Math.max(heroSection.offsetHeight - window.innerHeight, 1);
  const progress = clamp(-rect.top / travel);
  const panelProgress = clamp((progress - 0.1) / 0.78);
  const textProgress = clamp((progress - 0.1) / 0.24);
  const arcProgress = clamp((progress - 0.12) / 0.42);
  const arcRotation = -26 + arcProgress * 52;

  document.documentElement.style.setProperty("--hero-progress", panelProgress.toFixed(3));
  document.documentElement.style.setProperty("--hero-text-progress", textProgress.toFixed(3));
  document.documentElement.style.setProperty("--arc-progress", arcProgress.toFixed(3));
  document.documentElement.style.setProperty("--arc-glint-rotate", `${arcRotation.toFixed(2)}deg`);
  heroSection.classList.toggle("text-hidden", progress >= 0.34);
  heroSection.classList.toggle("panel-front", progress >= 0.22);
  heroSection.classList.toggle("panel-active", panelProgress > 0.62);
  heroSection.classList.toggle("chart-active", panelProgress > 0.72);
};

const requestScrollUpdate = () => {
  if (tickingHero) return;
  tickingHero = true;
  window.requestAnimationFrame(() => {
    updateScrollState();
    tickingHero = false;
  });
};

const bindHeroScroll = () => {
  if (isHeroScrollBound || isMobileHero()) return;
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  isHeroScrollBound = true;
};

const unbindHeroScroll = () => {
  if (!isHeroScrollBound) return;
  window.removeEventListener("scroll", requestScrollUpdate);
  isHeroScrollBound = false;
};

const setupMobilePanelAnimation = () => {
  if (!dashboardShell) return;

  mobilePanelObserver?.disconnect();
  mobilePanelObserver = null;

  if (!isMobileHero()) {
    dashboardShell.classList.remove("mobile-panel-visible", "mobile-panel-animating");
    return;
  }

  resetDesktopHeroProgress();

  if (reducedMotionQuery.matches) {
    dashboardShell.classList.add("mobile-panel-visible");
    dashboardShell.classList.remove("mobile-panel-animating");
    return;
  }

  dashboardShell.classList.remove("mobile-panel-visible", "mobile-panel-animating");
  mobilePanelObserver = new IntersectionObserver(
    (entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      dashboardShell.classList.add("mobile-panel-animating");
      requestAnimationFrame(() => dashboardShell.classList.add("mobile-panel-visible"));
      observer.disconnect();
      mobilePanelObserver = null;
    },
    { rootMargin: "0px 0px -22% 0px", threshold: 0.12 }
  );
  mobilePanelObserver.observe(dashboardShell);
};

const syncHeroMode = () => {
  if (isMobileHero()) {
    unbindHeroScroll();
    resetDesktopHeroProgress();
  } else {
    setupMobilePanelAnimation();
    bindHeroScroll();
    requestScrollUpdate();
    return;
  }
  setupMobilePanelAnimation();
};

updateScrollState();
syncHeroMode();
window.addEventListener("resize", syncHeroMode, { passive: true });
mobileHeroQuery.addEventListener?.("change", syncHeroMode);
reducedMotionQuery.addEventListener?.("change", syncHeroMode);

dashboardShell?.addEventListener("transitionend", (event) => {
  if (event.propertyName !== "transform") return;
  dashboardShell.classList.remove("mobile-panel-animating");
});

const canUseHeroPointerMotion = () =>
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const resetHeroPointerMotion = () => {
  document.documentElement.style.setProperty("--hero-tilt-x", "0deg");
  document.documentElement.style.setProperty("--hero-tilt-y", "0deg");
};

const applyDashboardGlow = () => {
  dashboardGlowFrame = null;
  if (!dashboardShell) return;
  dashboardShell.style.setProperty("--dashboard-glow-x", `${dashboardGlowTarget.x.toFixed(2)}px`);
  dashboardShell.style.setProperty("--dashboard-glow-y", `${dashboardGlowTarget.y.toFixed(2)}px`);
  dashboardShell.style.setProperty("--dashboard-glow-opacity", String(dashboardGlowTarget.opacity));
};

const requestDashboardGlowUpdate = () => {
  if (dashboardGlowFrame) return;
  dashboardGlowFrame = window.requestAnimationFrame(applyDashboardGlow);
};

heroStage?.addEventListener("pointermove", (event) => {
  if (!canUseHeroPointerMotion()) return;
  const rect = heroStage.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  document.documentElement.style.setProperty("--hero-tilt-x", `${(-y * 2.2).toFixed(2)}deg`);
  document.documentElement.style.setProperty("--hero-tilt-y", `${(x * 2.8).toFixed(2)}deg`);
});

heroStage?.addEventListener("pointerleave", resetHeroPointerMotion);

dashboardShell?.addEventListener("pointermove", (event) => {
  if (!canUseHeroPointerMotion()) return;
  const rect = dashboardShell.getBoundingClientRect();
  dashboardGlowTarget = {
    x: ((event.clientX - rect.left) / rect.width) * dashboardShell.offsetWidth,
    y: ((event.clientY - rect.top) / rect.height) * dashboardShell.offsetHeight,
    opacity: 1,
  };
  requestDashboardGlowUpdate();
});

dashboardShell?.addEventListener("pointerleave", () => {
  dashboardGlowTarget = { ...dashboardGlowTarget, opacity: 0 };
  requestDashboardGlowUpdate();
});

window.addEventListener("blur", () => {
  resetHeroPointerMotion();
  dashboardGlowTarget = { ...dashboardGlowTarget, opacity: 0 };
  requestDashboardGlowUpdate();
});

navToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  const isOpen = navMenu.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("nav-open", isOpen);
});

navLinks.forEach((link) => {
  link.addEventListener("click", closeNavMenu);
});

document.addEventListener("click", (event) => {
  if (!document.body.classList.contains("nav-open")) return;
  if (navMenu?.contains(event.target) || navToggle?.contains(event.target)) return;
  closeNavMenu();
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

const getSelectedAreas = () => Array.from(selectedAreas);

const updateAreaMultiselect = () => {
  const selectedAreaList = getSelectedAreas();

  if (areaSummary) {
    if (selectedAreaList.length === 0) {
      areaSummary.textContent = "Seleccione una o varias áreas";
    } else if (selectedAreaList.length === 1) {
      areaSummary.textContent = "1 área seleccionada";
    } else {
      areaSummary.textContent = `${selectedAreaList.length} áreas seleccionadas`;
    }
  }

  if (areaValue) {
    areaValue.value = selectedAreaList.join(", ");
  }

  if (otherAreaField) {
    otherAreaField.hidden = !selectedAreas.has("Otro");
  }
};

const renderAreaPanel = () => {
  if (!areaMultiselect || areaPanel) return areaPanel;

  areaPanel = document.createElement("div");
  areaPanel.className = "area-multiselect-panel";
  areaPanel.id = "area-multiselect-panel";
  areaPanel.setAttribute("role", "group");
  areaPanel.setAttribute("aria-label", "Áreas que quiere mejorar");

  areaOptions.forEach((option) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "areas[]";
    checkbox.value = option;
    checkbox.checked = selectedAreas.has(option);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedAreas.add(option);
      } else {
        selectedAreas.delete(option);
      }
      updateAreaMultiselect();
    });

    label.append(checkbox, document.createTextNode(option));
    areaPanel.append(label);
  });

  areaMultiselect.append(areaPanel);
  return areaPanel;
};

const removeAreaPanel = () => {
  areaPanel?.remove();
  areaPanel = null;
};

const setAreaPanelOpen = (isOpen) => {
  if (!areaToggle || !areaMultiselect) return;

  areaToggle.setAttribute("aria-expanded", String(isOpen));
  areaMultiselect.classList.toggle("is-open", isOpen);

  if (!isOpen) {
    removeAreaPanel();
    return;
  }

  const panel = renderAreaPanel();
  if (!panel) return;

  panel.classList.remove("is-up");
  const toggleRect = areaToggle.getBoundingClientRect();
  const availableBelow = window.innerHeight - toggleRect.bottom;
  const availableAbove = toggleRect.top;
  panel.classList.toggle("is-up", availableBelow < 300 && availableAbove > availableBelow);
};

setAreaPanelOpen(false);

areaToggle?.addEventListener("click", () => {
  setAreaPanelOpen(!areaMultiselect?.classList.contains("is-open"));
});
document.addEventListener("click", (event) => {
  if (areaMultiselect && !areaMultiselect.contains(event.target)) {
    setAreaPanelOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setAreaPanelOpen(false);
    closeNavMenu();
  }
});

updateAreaMultiselect();

const submitLead = async (payload) => {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let details = null;

    try {
      details = await response.json();
    } catch (error) {
      details = { status: response.status, error: "Respuesta no JSON del endpoint" };
    }

    console.error("Lead submission failed", details);
    throw new Error("Ha ocurrido un problema al enviar la solicitud. Por favor, inténtelo de nuevo en unos minutos.");
  }

  return response.json();
};

const fundaeTrigger = document.querySelector("[data-fundae-open]");
const diagnosticTriggers = document.querySelectorAll("[data-diagnostic-open]");
const copilotTriggers = document.querySelectorAll("[data-copilot-open]");

let isFundaeModalOpen = false;

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);

const getTrainingPercentage = (employees) => {
  if (employees <= 9) return 1;
  if (employees <= 49) return 0.75;
  if (employees <= 249) return 0.6;
  return 0.5;
};

const bindContactValidationMessages = (formElement) => {
  if (!formElement) return;

  formElement.querySelectorAll('input[name="whatsapp"], input[name="phone"], input[name="telefono"]').forEach((input) => {
    input.addEventListener("invalid", () => {
      if (!input.validity.valid) {
        input.setCustomValidity("Introduce un número de WhatsApp válido.");
      }
    });
    input.addEventListener("input", () => input.setCustomValidity(""));
  });

  formElement.querySelectorAll('input[name="email"]').forEach((input) => {
    input.addEventListener("invalid", () => {
      if (!input.validity.valid) {
        input.setCustomValidity("Introduce un correo electrónico válido.");
      }
    });
    input.addEventListener("input", () => input.setCustomValidity(""));
  });
};

const getFundaeModalMarkup = () => `
  <div class="fundae-modal" id="fundae-modal">
    <div class="fundae-modal-backdrop" data-fundae-close></div>
    <section class="fundae-modal-panel" role="dialog" aria-modal="true" aria-labelledby="fundae-modal-title">
      <button class="fundae-modal-close" type="button" aria-label="Cerrar calculadora" data-fundae-close>×</button>
      <p class="eyebrow">Calculadora FUNDAE</p>
      <h2 id="fundae-modal-title">Calcule el crédito formativo de su empresa</h2>
      <div class="fundae-modal-copy">
        <p>
          Este cálculo es una estimación orientativa realizada a partir de los datos introducidos. El crédito formativo real puede variar, ya que su cálculo depende de la plantilla media, las cotizaciones por formación profesional del año anterior y otras circunstancias específicas de cada empresa que esta calculadora simplificada puede no contemplar.
        </p>
        <p>
          Para conocer el importe que tiene asignado oficialmente su empresa, deberá consultarlo directamente en la aplicación de FUNDAE o realizar el cálculo mediante su simulador oficial.
        </p>
        <div class="fundae-official-links">
          <a class="btn btn-secondary" href="https://simuladorcredito.fundae.es/" target="_blank" rel="noopener noreferrer">Calcular en el simulador oficial de FUNDAE <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <form class="fundae-calculator-form">
        <fieldset class="contact-method full">
          <legend>¿Cómo prefiere que le contactemos?</legend>
          <div class="contact-method-options">
            <label class="contact-method-option">
              <input type="radio" name="contact_method" value="whatsapp" required />
              <span>WhatsApp</span>
            </label>
            <label class="contact-method-option">
              <input type="radio" name="contact_method" value="email" />
              <span>Correo electrónico</span>
            </label>
          </div>
        </fieldset>
        <label>
          Nombre
          <input type="text" name="name" autocomplete="name" required />
        </label>
        <label>
          Nombre de la empresa
          <input type="text" name="company" autocomplete="organization" required />
        </label>
        <label class="full fundae-whatsapp-field">
          Número de WhatsApp
          <input type="tel" name="phone" autocomplete="tel" placeholder="Ej. +34 600 000 000" pattern="[+0-9 ]{9,18}" title="Introduce un número de WhatsApp válido." required />
        </label>
        <label class="full fundae-email-field" hidden>
          Correo electrónico
          <input type="email" name="email" autocomplete="email" placeholder="Ej. nombre@empresa.com" />
        </label>
        <label class="fundae-number-field">
          <span class="fundae-field-label">Plantilla media del año anterior</span>
          <span class="fundae-field-help">Indique el número medio de trabajadores que tuvo la empresa durante el año anterior. Si no conoce el dato exacto, introduzca una cifra aproximada; el resultado de esta calculadora será orientativo.</span>
          <input type="number" name="employees" min="1" step="1" inputmode="numeric" required />
        </label>
        <label class="fundae-number-field">
          <span class="fundae-field-label">Base de otras cotizaciones del año anterior</span>
          <span class="fundae-field-help fundae-field-help-spacer" aria-hidden="true"></span>
          <input type="number" name="contribution_base" min="0" step="0.01" inputmode="decimal" required />
        </label>
        <label class="full">
          Nuevos trabajadores incorporados <span>(opcional)</span>
          <input type="number" name="new_workers" min="0" step="1" inputmode="numeric" />
        </label>
        <button class="btn btn-primary full" type="submit">Calcular crédito</button>
      </form>
      <div class="fundae-result" hidden aria-live="polite">
        <p class="fundae-result-heading">Estimación orientativa de su crédito</p>
        <p class="fundae-result-main"></p>
        <p class="fundae-result-official-note">El importe mostrado no constituye la asignación oficial de FUNDAE. Consulte la aplicación oficial para conocer el crédito definitivo disponible para su empresa.</p>
        <p class="fundae-result-employee"></p>
        <p class="fundae-result-message">
          Le ayudamos a interpretar el resultado y a gestionar la documentación y los trámites necesarios para aprovechar correctamente el crédito formativo que corresponda a su empresa.
        </p>
        <button class="btn btn-primary" type="button" data-fundae-contact>Quiero que me ayuden a gestionarlo</button>
      </div>
    </section>
  </div>
`;

const bindFundaeModalEvents = () => {
  const fundaeModal = document.querySelector("#fundae-modal");
  const fundaeForm = fundaeModal?.querySelector(".fundae-calculator-form");
  const fundaeResult = fundaeModal?.querySelector(".fundae-result");
  const fundaeResultMain = fundaeModal?.querySelector(".fundae-result-main");
  const fundaeResultEmployee = fundaeModal?.querySelector(".fundae-result-employee");
  const fundaeContactButton = fundaeModal?.querySelector("[data-fundae-contact]");

  const updateFundaeContactFields = ({ clearValue = false } = {}) => {
    const method = fundaeForm?.querySelector('input[name="contact_method"]:checked')?.value || "";
    const usesWhatsapp = method === "whatsapp";
    const usesEmail = method === "email";
    const phoneField = fundaeForm?.querySelector(".fundae-whatsapp-field");
    const phoneInput = fundaeForm?.querySelector('input[name="phone"]');
    const emailField = fundaeForm?.querySelector(".fundae-email-field");
    const emailInput = fundaeForm?.querySelector('input[name="email"]');

    if (phoneField && emailField && phoneInput && emailInput) {
      phoneField.hidden = !usesWhatsapp;
      emailField.hidden = !usesEmail;
      phoneInput.type = "tel";
      phoneInput.autocomplete = "tel";
      phoneInput.placeholder = "Ej. +34 600 000 000";
      phoneInput.required = usesWhatsapp;
      phoneInput.disabled = !usesWhatsapp;
      emailInput.type = "email";
      emailInput.autocomplete = "email";
      emailInput.placeholder = "Ej. nombre@empresa.com";
      emailInput.required = usesEmail;
      emailInput.disabled = !usesEmail;

      if (clearValue) {
        phoneInput.value = "";
        emailInput.value = "";
      }

      phoneInput.setCustomValidity("");
      emailInput.setCustomValidity("");
    }
  };

  bindContactValidationMessages(fundaeForm);

  fundaeForm?.querySelectorAll('input[name="contact_method"]').forEach((input) => {
    input.addEventListener("change", () => updateFundaeContactFields({ clearValue: true }));
  });
  updateFundaeContactFields();

  fundaeModal?.querySelectorAll("[data-fundae-close]").forEach((button) => {
    button.addEventListener("click", () => setFundaeModalOpen(false));
  });

  fundaeForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(fundaeForm);
    const employees = Math.max(1, Math.round(Number(formData.get("employees")) || 0));
    const contributionBase = Math.max(0, Number(formData.get("contribution_base")) || 0);
    const newWorkers = Math.max(0, Math.round(Number(formData.get("new_workers")) || 0));

    const professionalTrainingFee = contributionBase * 0.007;
    const percentageCredit = professionalTrainingFee * getTrainingPercentage(employees);
    const minimumCredit = employees >= 1 && employees <= 5 ? Math.max(percentageCredit, 420) : percentageCredit;
    const totalCredit = minimumCredit + newWorkers * 65;
    const creditPerEmployee = totalCredit / employees;

    const contactMethod = String(formData.get("contact_method") || "");
    const usesEmailContact = contactMethod === "email";
    const leadPayload = {
      formType: "FUNDAE",
      contactPreference: usesEmailContact ? "Correo electrónico" : "WhatsApp",
      name: String(formData.get("name") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      email: usesEmailContact ? String(formData.get("email") || "").trim() : "",
      phone: usesEmailContact ? "" : String(formData.get("phone") || "").trim(),
      message: `Crédito estimado: ${formatCurrency(totalCredit)}. Crédito por empleado: ${formatCurrency(creditPerEmployee)}. Empleados: ${employees}. Base otras cotizaciones: ${contributionBase}. Nuevos trabajadores: ${newWorkers}.`,
      areas: "Formación IA bonificable FUNDAE",
    };

    try {
      await submitLead(leadPayload);
      fundaeResultMain.textContent = `Su empresa podría disponer de aproximadamente ${formatCurrency(totalCredit)} de crédito FUNDAE.`;
      fundaeResultEmployee.textContent = `Esto equivale a unos ${formatCurrency(creditPerEmployee)} por empleado. Hemos guardado sus datos para contactar con usted por el canal indicado.`;
      fundaeResult.hidden = false;
    } catch (error) {
      console.error("FUNDAE lead error", error);
      fundaeResultMain.textContent = error.message;
      fundaeResultEmployee.textContent = "";
      fundaeResult.hidden = false;
    }
  });

  fundaeContactButton?.addEventListener("click", () => {
    setFundaeModalOpen(false);
    document.querySelector("#contacto")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

const setFundaeModalOpen = (isOpen) => {
  const existingModal = document.querySelector("#fundae-modal");

  if (isOpen) {
    if (existingModal) return;
    isFundaeModalOpen = true;
    document.body.insertAdjacentHTML("beforeend", getFundaeModalMarkup());
    document.body.classList.add("modal-open");
    bindFundaeModalEvents();
    return;
  }

  isFundaeModalOpen = false;
  existingModal?.remove();
  document.body.classList.remove("modal-open");
};

fundaeTrigger?.addEventListener("click", (event) => {
  event.preventDefault();
  setFundaeModalOpen(true);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isFundaeModalOpen) {
    setFundaeModalOpen(false);
  }
});

let isDiagnosticModalOpen = false;

const confirmationMessage = (name) => `Hola ${name},

Gracias por solicitar su diagnóstico gratuito.

Hemos recibido correctamente sus datos y revisaremos la información de su empresa para preparar una primera valoración sobre posibles oportunidades de automatización con inteligencia artificial.

Nos pondremos en contacto con usted lo antes posible para comentar los siguientes pasos.

Un saludo,
Equipo de Kairvia`;

const getDiagnosticModalMarkup = () => `
  <div class="fundae-modal diagnostic-modal" id="diagnostic-modal">
    <div class="fundae-modal-backdrop" data-diagnostic-close></div>
    <section class="fundae-modal-panel diagnostic-modal-panel" role="dialog" aria-modal="true" aria-labelledby="diagnostic-modal-title">
      <button class="fundae-modal-close" type="button" aria-label="Cerrar diagnóstico" data-diagnostic-close>×</button>
      <p class="eyebrow">Diagnóstico gratuito</p>
      <h2 id="diagnostic-modal-title">Solicite su diagnóstico gratuito</h2>
      <p class="fundae-modal-copy">
        Déjenos sus datos y prepararemos un diagnóstico gratuito para detectar oportunidades de automatización con IA en su empresa. Le contactaremos lo antes posible.
      </p>
      <form class="diagnostic-form">
        <fieldset class="contact-method full">
          <legend>¿Cómo prefiere que le contactemos?</legend>
          <div class="contact-method-options">
            <label class="contact-method-option">
              <input type="radio" name="contact_method" value="whatsapp" checked />
              <span>WhatsApp</span>
            </label>
            <label class="contact-method-option">
              <input type="radio" name="contact_method" value="email" />
              <span>Correo electrónico</span>
            </label>
          </div>
        </fieldset>
        <p class="diagnostic-recommendation full" data-diagnostic-contact-copy>
          Recomendamos el contacto por WhatsApp para agilizar el proceso y poder resolver cualquier duda de forma más rápida.
        </p>
        <label>
          Nombre
          <input type="text" name="name" autocomplete="name" required />
        </label>
        <label>
          Nombre de empresa
          <input type="text" name="company" autocomplete="organization" required />
        </label>
        <label class="full diagnostic-whatsapp-field">
          Número de WhatsApp
          <input type="tel" name="whatsapp" autocomplete="tel" placeholder="Ej. +34 600 000 000" pattern="[+0-9 ]{9,18}" title="Introduce un número de WhatsApp válido." required />
        </label>
        <label class="full diagnostic-email-field" hidden>
          Correo electrónico
          <input type="email" name="email" autocomplete="email" placeholder="Ej. nombre@empresa.com" />
        </label>
        <label class="full">
          Cuéntenos un poco sobre su empresa
          <textarea name="message" rows="4" placeholder="Sector al que se dedica, número aproximado de empleados, procesos que le gustaría mejorar…"></textarea>
        </label>
        <button class="btn btn-primary full" type="submit">Solicitar diagnóstico gratuito</button>
        <p class="diagnostic-status full" role="status" aria-live="polite"></p>
      </form>
    </section>
  </div>
`;

const updateDiagnosticContactFields = (diagnosticForm, { clearValue = false } = {}) => {
  const method = diagnosticForm.querySelector('input[name="contact_method"]:checked')?.value || "whatsapp";
  const whatsappField = diagnosticForm.querySelector(".diagnostic-whatsapp-field");
  const whatsappInput = diagnosticForm.querySelector('input[name="whatsapp"]');
  const emailField = diagnosticForm.querySelector(".diagnostic-email-field");
  const emailInput = diagnosticForm.querySelector('input[name="email"]');
  const contactCopy = diagnosticForm.querySelector("[data-diagnostic-contact-copy]");

  if (!whatsappField || !whatsappInput || !emailField || !emailInput) return;

  const usesWhatsapp = method === "whatsapp";
  whatsappField.hidden = !usesWhatsapp;
  emailField.hidden = usesWhatsapp;
  whatsappInput.type = "tel";
  whatsappInput.autocomplete = "tel";
  whatsappInput.placeholder = "Ej. +34 600 000 000";
  whatsappInput.required = usesWhatsapp;
  whatsappInput.disabled = !usesWhatsapp;
  emailInput.type = "email";
  emailInput.autocomplete = "email";
  emailInput.placeholder = "Ej. nombre@empresa.com";
  emailInput.required = !usesWhatsapp;
  emailInput.disabled = usesWhatsapp;

  if (clearValue) {
    whatsappInput.value = "";
    emailInput.value = "";
  }

  whatsappInput.setCustomValidity("");
  emailInput.setCustomValidity("");

  if (contactCopy) {
    contactCopy.textContent = usesWhatsapp
      ? "Recomendamos el contacto por WhatsApp para agilizar el proceso y poder resolver cualquier duda de forma más rápida."
      : "Nos pondremos en contacto con usted por correo electrónico utilizando la dirección indicada.";
  }
};

const setDiagnosticModalOpen = (isOpen) => {
  const existingModal = document.querySelector("#diagnostic-modal");

  if (isOpen) {
    if (existingModal) return;
    isDiagnosticModalOpen = true;
    document.body.insertAdjacentHTML("beforeend", getDiagnosticModalMarkup());
    document.body.classList.add("modal-open");
    bindDiagnosticModalEvents();
    document.querySelector('#diagnostic-modal input[name="name"]')?.focus();
    return;
  }

  isDiagnosticModalOpen = false;
  existingModal?.remove();
  document.body.classList.remove("modal-open");
};

const bindDiagnosticModalEvents = () => {
  const diagnosticModal = document.querySelector("#diagnostic-modal");
  const diagnosticForm = diagnosticModal?.querySelector(".diagnostic-form");
  const diagnosticStatus = diagnosticModal?.querySelector(".diagnostic-status");

  bindContactValidationMessages(diagnosticForm);

  diagnosticModal?.querySelectorAll("[data-diagnostic-close]").forEach((button) => {
    button.addEventListener("click", () => setDiagnosticModalOpen(false));
  });

  diagnosticForm?.querySelectorAll('input[name="contact_method"]').forEach((input) => {
    input.addEventListener("change", () => updateDiagnosticContactFields(diagnosticForm, { clearValue: true }));
  });

  if (diagnosticForm) {
    updateDiagnosticContactFields(diagnosticForm);
  }

  diagnosticForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = diagnosticForm.querySelector('button[type="submit"]');
    const formData = new FormData(diagnosticForm);
    const contactMethod = String(formData.get("contact_method") || "whatsapp");
    const usesEmailContact = contactMethod === "email";
    const payload = {
      formType: "Diagnóstico",
      contactPreference: usesEmailContact ? "Correo electrónico" : "WhatsApp",
      name: String(formData.get("name") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      phone: usesEmailContact ? "" : String(formData.get("whatsapp") || "").trim(),
      email: usesEmailContact ? String(formData.get("email") || "").trim() : "",
      message: String(formData.get("message") || "").trim(),
      areas: "Diagnóstico IA",
    };

    diagnosticStatus.textContent = "Enviando solicitud...";
    diagnosticStatus.classList.remove("error");
    submitButton.disabled = true;

    try {
      await submitLead(payload);
      diagnosticForm.reset();
      updateDiagnosticContactFields(diagnosticForm);
      diagnosticStatus.textContent = payload.email
        ? "Solicitud enviada correctamente. Le hemos enviado un email de confirmación."
        : "Solicitud enviada correctamente. Hemos guardado sus datos para contactarle por WhatsApp.";
    } catch (error) {
      console.error("Diagnostic lead error", error);
      diagnosticStatus.textContent = error.message;
      diagnosticStatus.classList.add("error");
    } finally {
      submitButton.disabled = false;
    }
  });
};

diagnosticTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    closeNavMenu();
    setDiagnosticModalOpen(true);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isDiagnosticModalOpen) {
    setDiagnosticModalOpen(false);
  }
});


let isCopilotModalOpen = false;

const getCopilotModalMarkup = () => `
  <div class="fundae-modal copilot-modal" id="copilot-modal">
    <div class="fundae-modal-backdrop" data-copilot-backdrop></div>
    <section class="fundae-modal-panel diagnostic-modal-panel copilot-modal-panel" role="dialog" aria-modal="true" aria-labelledby="copilot-modal-title">
      <button class="fundae-modal-close" type="button" aria-label="Cerrar formulario de Copilot" data-copilot-close>×</button>
      <p class="eyebrow">Microsoft 365 Copilot</p>
      <h2 id="copilot-modal-title">Implementar Microsoft 365 Copilot</h2>
      <p class="fundae-modal-copy">
        Cuéntenos cómo trabaja actualmente su equipo y le ayudaremos a valorar la implantación de Microsoft 365 Copilot, identificar casos de uso y preparar su adopción.
      </p>
      <form class="copilot-form">
        <label>
          Nombre
          <input type="text" name="name" autocomplete="name" required />
        </label>
        <label>
          Nombre de empresa
          <input type="text" name="company" autocomplete="organization" required />
        </label>
        <label>
          Número aproximado de empleados
          <select name="employees_range" required>
            <option value="">Seleccione una opción</option>
            <option value="1–10">1–10</option>
            <option value="11–50">11–50</option>
            <option value="51–250">51–250</option>
            <option value="Más de 250">Más de 250</option>
          </select>
        </label>
        <fieldset class="contact-method">
          <legend>¿Utilizan actualmente Microsoft 365?</legend>
          <div class="contact-method-options">
            <label class="contact-method-option">
              <input type="radio" name="uses_microsoft_365" value="Sí" required />
              <span>Sí</span>
            </label>
            <label class="contact-method-option">
              <input type="radio" name="uses_microsoft_365" value="No" />
              <span>No</span>
            </label>
          </div>
        </fieldset>
        <div class="full form-field">
          <span class="field-label">Aplicaciones que utiliza el equipo</span>
          <input type="hidden" name="microsoft_apps" data-copilot-multiselect-value="apps" />
          <div class="area-multiselect copilot-multiselect" data-copilot-multiselect="apps">
            <button class="area-multiselect-toggle" type="button" aria-expanded="false" aria-haspopup="listbox" aria-controls="copilot-apps-panel">
              <span data-copilot-multiselect-summary>Seleccione una o varias aplicaciones</span>
            </button>
          </div>
        </div>
        <fieldset class="contact-method full">
          <legend>¿Cómo prefiere que le contactemos?</legend>
          <div class="contact-method-options">
            <label class="contact-method-option">
              <input type="radio" name="contact_method" value="whatsapp" checked />
              <span>WhatsApp</span>
            </label>
            <label class="contact-method-option">
              <input type="radio" name="contact_method" value="email" />
              <span>Correo electrónico</span>
            </label>
          </div>
        </fieldset>
        <label class="full copilot-whatsapp-field">
          Número de WhatsApp
          <input type="tel" name="whatsapp" autocomplete="tel" placeholder="Ej. +34 600 000 000" pattern="[+0-9 ]{9,18}" title="Introduce un número de WhatsApp válido." required />
        </label>
        <label class="full copilot-email-field" hidden>
          Correo electrónico
          <input type="email" name="email" autocomplete="email" placeholder="Ej. nombre@empresa.com" />
        </label>
        <label class="full">
          Mensaje adicional
          <textarea name="message" rows="4" placeholder="Cuéntenos qué tareas quiere agilizar o qué dudas tiene sobre Microsoft Copilot."></textarea>
        </label>
        <button class="btn btn-primary full" type="submit">Solicitar valoración de Copilot</button>
        <p class="copilot-status full" role="status" aria-live="polite"></p>
      </form>
    </section>
  </div>
`;

const copilotMultiselectOptions = {
  apps: ["Outlook", "Teams", "Word", "Excel", "PowerPoint", "SharePoint", "OneDrive", "Otras"],
};

const getCopilotFormHasData = (formElement) => {
  if (!formElement) return false;
  return Array.from(formElement.elements).some((element) => {
    if (!element.name || element.type === "hidden" || element.type === "submit") return false;
    if (element.type === "radio" && element.name === "contact_method") return false;
    if ((element.type === "radio" || element.type === "checkbox") && element.checked) return true;
    return "value" in element && String(element.value || "").trim() !== "";
  });
};

const updateCopilotContactFields = (copilotForm, { clearValue = false } = {}) => {
  const method = copilotForm.querySelector('input[name="contact_method"]:checked')?.value || "whatsapp";
  const whatsappField = copilotForm.querySelector(".copilot-whatsapp-field");
  const whatsappInput = copilotForm.querySelector('input[name="whatsapp"]');
  const emailField = copilotForm.querySelector(".copilot-email-field");
  const emailInput = copilotForm.querySelector('input[name="email"]');

  if (!whatsappField || !whatsappInput || !emailField || !emailInput) return;

  const usesWhatsapp = method === "whatsapp";
  whatsappField.hidden = !usesWhatsapp;
  emailField.hidden = usesWhatsapp;
  whatsappInput.type = "tel";
  whatsappInput.autocomplete = "tel";
  whatsappInput.placeholder = "Ej. +34 600 000 000";
  whatsappInput.required = usesWhatsapp;
  whatsappInput.disabled = !usesWhatsapp;
  emailInput.type = "email";
  emailInput.autocomplete = "email";
  emailInput.placeholder = "Ej. nombre@empresa.com";
  emailInput.required = !usesWhatsapp;
  emailInput.disabled = usesWhatsapp;

  if (clearValue) {
    whatsappInput.value = "";
    emailInput.value = "";
  }

  whatsappInput.setCustomValidity("");
  emailInput.setCustomValidity("");
};

const setCopilotMultiselectOpen = (container, isOpen) => {
  const panel = container?.querySelector(".area-multiselect-panel");
  const toggle = container?.querySelector(".area-multiselect-toggle");
  if (!container || !panel || !toggle) return;

  container.classList.toggle("is-open", isOpen);
  panel.hidden = !isOpen;
  toggle.setAttribute("aria-expanded", String(isOpen));
};

const closeAllCopilotMultiselects = (except = null) => {
  document.querySelectorAll("#copilot-modal [data-copilot-multiselect]").forEach((container) => {
    if (container !== except) setCopilotMultiselectOpen(container, false);
  });
};

const bindCopilotMultiselects = (copilotForm) => {
  copilotForm.querySelectorAll("[data-copilot-multiselect]").forEach((container) => {
    const type = container.dataset.copilotMultiselect;
    const options = copilotMultiselectOptions[type] || [];
    const hiddenInput = copilotForm.querySelector(`[data-copilot-multiselect-value="${type}"]`);
    const summary = container.querySelector("[data-copilot-multiselect-summary]");
    const toggle = container.querySelector(".area-multiselect-toggle");
    const panelId = "copilot-apps-panel";
    const defaultText = "Seleccione una o varias aplicaciones";

    container.insertAdjacentHTML("beforeend", `
      <div class="area-multiselect-panel" id="${panelId}" role="listbox" hidden>
        ${options.map((option) => `
          <label>
            <input type="checkbox" value="${option}" />
            <span>${option}</span>
          </label>
        `).join("")}
      </div>
    `);

    const update = () => {
      const selected = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
      hiddenInput.value = selected.join(", ");
      summary.textContent = selected.length === 0
        ? defaultText
        : selected.length === 1
          ? "1 opción seleccionada"
          : `${selected.length} opciones seleccionadas`;
    };

    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      closeAllCopilotMultiselects(container);
      setCopilotMultiselectOpen(container, !isOpen);
    });

    toggle.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle.click();
      }
    });

    container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", update);
    });

    update();
  });
};

const setCopilotModalOpen = (isOpen, { force = false } = {}) => {
  const existingModal = document.querySelector("#copilot-modal");

  if (isOpen) {
    if (existingModal) return;
    isCopilotModalOpen = true;
    document.body.insertAdjacentHTML("beforeend", getCopilotModalMarkup());
    document.body.classList.add("modal-open");
    bindCopilotModalEvents();
    document.querySelector('#copilot-modal input[name="name"]')?.focus();
    return;
  }

  const copilotForm = existingModal?.querySelector(".copilot-form");
  if (!force && getCopilotFormHasData(copilotForm)) return;

  isCopilotModalOpen = false;
  existingModal?.remove();
  document.body.classList.remove("modal-open");
};

const bindCopilotModalEvents = () => {
  const copilotModal = document.querySelector("#copilot-modal");
  const copilotForm = copilotModal?.querySelector(".copilot-form");
  const copilotStatus = copilotModal?.querySelector(".copilot-status");

  if (!copilotForm) return;

  bindContactValidationMessages(copilotForm);
  bindCopilotMultiselects(copilotForm);
  updateCopilotContactFields(copilotForm);

  copilotModal?.querySelector("[data-copilot-close]")?.addEventListener("click", () => setCopilotModalOpen(false, { force: true }));
  copilotModal?.querySelector("[data-copilot-backdrop]")?.addEventListener("click", () => setCopilotModalOpen(false));

  copilotForm.querySelectorAll('input[name="contact_method"]').forEach((input) => {
    input.addEventListener("change", () => updateCopilotContactFields(copilotForm, { clearValue: true }));
  });

  copilotModal?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-copilot-multiselect]")) {
      closeAllCopilotMultiselects();
    }
  });

  copilotForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = copilotForm.querySelector('button[type="submit"]');
    const formData = new FormData(copilotForm);
    const apps = String(formData.get("microsoft_apps") || "").trim();

    if (!apps) {
      copilotStatus.textContent = "Seleccione al menos una aplicación que utilice el equipo.";
      copilotStatus.classList.add("error");
      copilotForm.querySelector('[data-copilot-multiselect="apps"] .area-multiselect-toggle')?.focus();
      return;
    }


    const contactMethod = String(formData.get("contact_method") || "whatsapp");
    const usesEmailContact = contactMethod === "email";
    const baseMessage = String(formData.get("message") || "").trim();
    const employeesRange = String(formData.get("employees_range") || "").trim();
    const microsoft365Usage = String(formData.get("uses_microsoft_365") || "").trim();
    const payload = {
      formType: "Microsoft Copilot",
      origin: "microsoft_copilot",
      contactPreference: usesEmailContact ? "Correo electrónico" : "WhatsApp",
      name: String(formData.get("name") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      phone: usesEmailContact ? "" : String(formData.get("whatsapp") || "").trim(),
      email: usesEmailContact ? String(formData.get("email") || "").trim() : "",
      employeesRange,
      microsoft365Usage,
      microsoftApps: apps,
      areas: `Microsoft 365 Copilot. Aplicaciones: ${apps}`,
      message: [
        `Origen: Microsoft 365 Copilot`,
        `Número aproximado de empleados: ${employeesRange}`,
        `Uso actual de Microsoft 365: ${microsoft365Usage}`,
        `Aplicaciones que utiliza el equipo: ${apps}`,
        baseMessage ? `Mensaje adicional: ${baseMessage}` : "Mensaje adicional: No indicado",
      ].join("\n"),
    };

    copilotStatus.textContent = "Enviando solicitud...";
    copilotStatus.classList.remove("error");
    submitButton.disabled = true;

    try {
      await submitLead(payload);
      copilotForm.reset();
      copilotForm.querySelectorAll("[data-copilot-multiselect]").forEach((container) => {
        const type = container.dataset.copilotMultiselect;
        const defaultText = "Seleccione una o varias aplicaciones";
        container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
          checkbox.checked = false;
        });
        const hiddenInput = copilotForm.querySelector(`[data-copilot-multiselect-value="${type}"]`);
        const summary = container.querySelector("[data-copilot-multiselect-summary]");
        if (hiddenInput) hiddenInput.value = "";
        if (summary) summary.textContent = defaultText;
        setCopilotMultiselectOpen(container, false);
      });
      updateCopilotContactFields(copilotForm);
      closeAllCopilotMultiselects();
      copilotStatus.textContent = payload.email
        ? "Solicitud enviada correctamente. Le hemos enviado un email de confirmación."
        : "Solicitud enviada correctamente. Hemos guardado sus datos para contactarle por WhatsApp.";
    } catch (error) {
      console.error("Copilot lead error", error);
      copilotStatus.textContent = error.message;
      copilotStatus.classList.add("error");
    } finally {
      submitButton.disabled = false;
    }
  });
};

copilotTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    closeNavMenu();
    setCopilotModalOpen(true);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (isCopilotModalOpen) setCopilotModalOpen(false, { force: true });
    closeAllCopilotMultiselects();
  }
});


const getContactFormMethod = () =>
  form?.querySelector('input[name="contact_method"]:checked')?.value || "email";

const updateContactFormMethod = ({ clearValue = false } = {}) => {
  if (!contactEmailField || !contactEmailInput || !contactPhoneField || !contactPhoneInput) return;

  const usesEmail = getContactFormMethod() === "email";
  contactEmailField.hidden = !usesEmail;
  contactPhoneField.hidden = usesEmail;
  contactEmailInput.type = "email";
  contactEmailInput.autocomplete = "email";
  contactEmailInput.placeholder = "nombre@empresa.com";
  contactEmailInput.required = usesEmail;
  contactEmailInput.disabled = !usesEmail;
  contactPhoneInput.type = "tel";
  contactPhoneInput.autocomplete = "tel";
  contactPhoneInput.placeholder = "+34 600 000 000";
  contactPhoneInput.required = !usesEmail;
  contactPhoneInput.disabled = usesEmail;

  if (clearValue) {
    contactEmailInput.value = "";
    contactPhoneInput.value = "";
  }

  contactEmailInput.setCustomValidity("");
  contactPhoneInput.setCustomValidity("");
  formNote?.classList.remove("error");
};

bindContactValidationMessages(form);
contactMethodInputs.forEach((input) => {
  input.addEventListener("change", () => updateContactFormMethod({ clearValue: true }));
});
updateContactFormMethod();

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const selectedAreaList = getSelectedAreas();

  if (areaOptions.length && selectedAreaList.length === 0) {
    formNote.textContent = "Seleccione al menos un área que quiera mejorar.";
    areaToggle?.focus();
    return;
  }

  const formData = new FormData(form);
  const contactMethod = getContactFormMethod();
  const usesEmailContact = contactMethod === "email";
  const payload = {
    formType: "Contacto",
    contactPreference: usesEmailContact ? "Correo electrónico" : "WhatsApp",
    name: String(formData.get("nombre") || "").trim(),
    company: String(formData.get("empresa") || "").trim(),
    email: usesEmailContact ? String(formData.get("email") || "").trim() : "",
    phone: usesEmailContact ? "" : String(formData.get("telefono") || "").trim(),
    areas: selectedAreaList.join(", "),
    message: String(formData.get("mensaje") || "").trim(),
  };

  formNote.textContent = "Enviando solicitud...";

  try {
    await submitLead(payload);
    form.reset();
    selectedAreas.clear();
    updateAreaMultiselect();
    updateContactFormMethod();
    setAreaPanelOpen(false);
    formNote.textContent = payload.email
      ? "Solicitud enviada correctamente. Le hemos enviado un email de confirmación."
      : "Solicitud enviada correctamente. Hemos guardado sus datos para contactarle.";
  } catch (error) {
    console.error("Contact lead error", error);
    formNote.textContent = error.message;
  }
});
