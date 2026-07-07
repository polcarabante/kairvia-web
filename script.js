const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const navLinks = document.querySelectorAll(".nav-menu a");
const form = document.querySelector(".contact-form");
const formNote = document.querySelector(".form-note");
const areaMultiselect = document.querySelector("[data-area-multiselect]");
const areaToggle = document.querySelector(".area-multiselect-toggle");
const areaSummary = document.querySelector("[data-area-summary]");
const areaValue = document.querySelector("[data-areas-value]");
const areaPanel = document.querySelector(".area-multiselect-panel");
const areaCheckboxes = document.querySelectorAll('input[name="areas[]"]');
const otherAreaField = document.querySelector(".other-area-field");

navToggle?.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("nav-open", isOpen);
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
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

const getSelectedAreas = () =>
  Array.from(areaCheckboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

const updateAreaMultiselect = () => {
  const selectedAreas = getSelectedAreas();

  if (areaSummary) {
    if (selectedAreas.length === 0) {
      areaSummary.textContent = "Selecciona una o varias áreas";
    } else if (selectedAreas.length <= 3) {
      areaSummary.textContent = selectedAreas.join(", ");
    } else {
      areaSummary.textContent = `${selectedAreas.length} áreas seleccionadas`;
    }
  }

  if (areaValue) {
    areaValue.value = selectedAreas.join(", ");
  }

  if (otherAreaField) {
    otherAreaField.hidden = !selectedAreas.includes("Otro");
  }
};

const setAreaPanelOpen = (isOpen) => {
  if (!areaPanel || !areaToggle) return;
  areaPanel.hidden = !isOpen;
  areaToggle.setAttribute("aria-expanded", String(isOpen));
};

areaToggle?.addEventListener("click", () => {
  setAreaPanelOpen(areaPanel?.hidden ?? true);
});

areaCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", updateAreaMultiselect);
});

document.addEventListener("click", (event) => {
  if (areaMultiselect && !areaMultiselect.contains(event.target)) {
    setAreaPanelOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setAreaPanelOpen(false);
  }
});

updateAreaMultiselect();

const submitLead = async (payload) => {
  const isLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);

  if (isLocalPreview) {
    return { ok: true, localPreview: true };
  }

  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "No se pudo guardar el lead en Brevo";

    try {
      const data = await response.json();
      message = data.category ? `${data.category}: ${data.error || message}` : data.error || message;
    } catch (error) {
      message = `${message}. Estado HTTP: ${response.status}`;
    }

    throw new Error(message);
  }

  return response.json();
};

const fundaeTrigger = document.querySelector("[data-fundae-open]");
const diagnosticTriggers = document.querySelectorAll("[data-diagnostic-open]");

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

const getFundaeModalMarkup = () => `
  <div class="fundae-modal" id="fundae-modal">
    <div class="fundae-modal-backdrop" data-fundae-close></div>
    <section class="fundae-modal-panel" role="dialog" aria-modal="true" aria-labelledby="fundae-modal-title">
      <button class="fundae-modal-close" type="button" aria-label="Cerrar calculadora" data-fundae-close>×</button>
      <p class="eyebrow">Calculadora FUNDAE</p>
      <h2 id="fundae-modal-title">Calcula el crédito formativo de tu empresa</h2>
      <p class="fundae-modal-copy">
        Introduce los datos de tu empresa y obtén una estimación inmediata del crédito disponible para formación.
      </p>
      <form class="fundae-calculator-form">
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
        <label>
          Nombre
          <input type="text" name="name" autocomplete="name" required />
        </label>
        <label>
          Nombre de la empresa
          <input type="text" name="company" autocomplete="organization" required />
        </label>
        <label class="full fundae-whatsapp-field">
          WhatsApp o teléfono
          <input type="tel" name="phone" autocomplete="tel" required />
        </label>
        <label class="full fundae-email-field" hidden>
          Email
          <input type="email" name="email" autocomplete="email" />
        </label>
        <label>
          Número medio de empleados
          <input type="number" name="employees" min="1" step="1" inputmode="numeric" required />
        </label>
        <label>
          Base de otras cotizaciones del año anterior
          <input type="number" name="contribution_base" min="0" step="0.01" inputmode="decimal" required />
        </label>
        <label class="full">
          Nuevos trabajadores incorporados <span>opcional</span>
          <input type="number" name="new_workers" min="0" step="1" inputmode="numeric" />
        </label>
        <button class="btn btn-primary full" type="submit">Calcular crédito</button>
      </form>
      <div class="fundae-result" hidden aria-live="polite">
        <p class="fundae-result-main"></p>
        <p class="fundae-result-employee"></p>
        <p class="fundae-result-message">
          Te ayudamos a aprovechar hasta el 100% del crédito FUNDAE disponible para formar a tu equipo en inteligencia artificial, acompañándote durante todo el proceso.
        </p>
        <button class="btn btn-primary" type="button" data-fundae-contact>Quiero que me ayudéis a gestionarlo</button>
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

  const updateFundaeContactFields = () => {
    const method = fundaeForm?.querySelector('input[name="contact_method"]:checked')?.value || "whatsapp";
    const usesWhatsapp = method === "whatsapp";
    const phoneField = fundaeForm?.querySelector(".fundae-whatsapp-field");
    const phoneInput = fundaeForm?.querySelector('input[name="phone"]');
    const emailField = fundaeForm?.querySelector(".fundae-email-field");
    const emailInput = fundaeForm?.querySelector('input[name="email"]');

    if (phoneField && emailField && phoneInput && emailInput) {
      phoneField.hidden = !usesWhatsapp;
      emailField.hidden = usesWhatsapp;
      phoneInput.required = usesWhatsapp;
      emailInput.required = !usesWhatsapp;
    }
  };

  fundaeForm?.querySelectorAll('input[name="contact_method"]').forEach((input) => {
    input.addEventListener("change", updateFundaeContactFields);
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

    const contactMethod = String(formData.get("contact_method") || "whatsapp");
    const leadPayload = {
      formType: "FUNDAE",
      contactPreference: contactMethod === "email" ? "Correo" : "WhatsApp",
      name: String(formData.get("name") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      message: `Crédito estimado: ${formatCurrency(totalCredit)}. Crédito por empleado: ${formatCurrency(creditPerEmployee)}. Empleados: ${employees}. Base otras cotizaciones: ${contributionBase}. Nuevos trabajadores: ${newWorkers}.`,
      areas: "Formación IA bonificable FUNDAE",
    };

    try {
      await submitLead(leadPayload);
      fundaeResultMain.textContent = `Tu empresa podría disponer de aproximadamente ${formatCurrency(totalCredit)} de crédito FUNDAE.`;
      fundaeResultEmployee.textContent = `Esto equivale a unos ${formatCurrency(creditPerEmployee)} por empleado. Hemos guardado tus datos para contactar contigo por el canal indicado.`;
      fundaeResult.hidden = false;
    } catch (error) {
      fundaeResultMain.textContent = `No se ha podido guardar la solicitud: ${error.message}`;
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
    document.querySelector('#fundae-modal input[name="company"]')?.focus();
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
      <h2 id="diagnostic-modal-title">Solicita tu diagnóstico gratuito</h2>
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
        <p class="diagnostic-recommendation full">
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
          <input type="tel" name="whatsapp" autocomplete="tel" required />
        </label>
        <label class="full diagnostic-email-field" hidden>
          Email
          <input type="email" name="email" autocomplete="email" />
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

const updateDiagnosticContactFields = (diagnosticForm) => {
  const method = diagnosticForm.querySelector('input[name="contact_method"]:checked')?.value || "whatsapp";
  const whatsappField = diagnosticForm.querySelector(".diagnostic-whatsapp-field");
  const whatsappInput = diagnosticForm.querySelector('input[name="whatsapp"]');
  const emailField = diagnosticForm.querySelector(".diagnostic-email-field");
  const emailInput = diagnosticForm.querySelector('input[name="email"]');

  const usesWhatsapp = method === "whatsapp";
  whatsappField.hidden = !usesWhatsapp;
  emailField.hidden = usesWhatsapp;
  whatsappInput.required = usesWhatsapp;
  emailInput.required = !usesWhatsapp;
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

  diagnosticModal?.querySelectorAll("[data-diagnostic-close]").forEach((button) => {
    button.addEventListener("click", () => setDiagnosticModalOpen(false));
  });

  diagnosticForm?.querySelectorAll('input[name="contact_method"]').forEach((input) => {
    input.addEventListener("change", () => updateDiagnosticContactFields(diagnosticForm));
  });

  if (diagnosticForm) {
    updateDiagnosticContactFields(diagnosticForm);
  }

  diagnosticForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = diagnosticForm.querySelector('button[type="submit"]');
    const formData = new FormData(diagnosticForm);
    const contactMethod = String(formData.get("contact_method") || "whatsapp");
    const payload = {
      formType: "Diagnóstico",
      contactPreference: contactMethod === "email" ? "Correo" : "WhatsApp",
      name: String(formData.get("name") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      phone: String(formData.get("whatsapp") || "").trim(),
      email: String(formData.get("email") || "").trim(),
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
        : "Solicitud enviada correctamente. Guardamos sus datos para contactarle por WhatsApp.";
    } catch (error) {
      diagnosticStatus.textContent = `No se ha podido enviar la solicitud: ${error.message}`;
      diagnosticStatus.classList.add("error");
    } finally {
      submitButton.disabled = false;
    }
  });
};

diagnosticTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    setDiagnosticModalOpen(true);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isDiagnosticModalOpen) {
    setDiagnosticModalOpen(false);
  }
});


form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const selectedAreas = getSelectedAreas();

  if (areaCheckboxes.length && selectedAreas.length === 0) {
    formNote.textContent = "Selecciona al menos un área que quieras mejorar.";
    areaToggle?.focus();
    return;
  }

  const formData = new FormData(form);
  const payload = {
    formType: "Contacto",
    contactPreference: "Correo",
    name: String(formData.get("nombre") || "").trim(),
    company: String(formData.get("empresa") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("telefono") || "").trim(),
    areas: selectedAreas.join(", "),
    message: String(formData.get("mensaje") || "").trim(),
  };

  formNote.textContent = "Enviando solicitud...";

  try {
    await submitLead(payload);
    form.reset();
    updateAreaMultiselect();
    formNote.textContent = payload.email
      ? "Solicitud enviada correctamente. Le hemos enviado un email de confirmación."
      : "Solicitud enviada correctamente. Guardamos sus datos para contactarle.";
  } catch (error) {
    formNote.textContent = `No se ha podido enviar la solicitud: ${error.message}`;
  }
});
