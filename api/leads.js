const BREVO_API_URL = "https://api.brevo.com/v3";

const json = (response, statusCode, body) => {
  response.status(statusCode).json(body);
};

const normalizeText = (value = "") => String(value || "").trim();

const normalizeSpanishPhone = (value = "") => {
  const raw = normalizeText(value);

  if (!raw) return "";

  let phone = raw.replace(/[\s().-]/g, "");

  if (phone.startsWith("00")) {
    phone = `+${phone.slice(2)}`;
  }

  if (phone.startsWith("+")) {
    return `+${phone.slice(1).replace(/\D/g, "")}`;
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 9) {
    return `+34${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("34")) {
    return `+${digits}`;
  }

  return digits ? `+${digits}` : "";
};

const getListIdForType = (type) => {
  if (type === "FUNDAE") return Number(process.env.BREVO_FUNDAE_LIST_ID);
  if (type === "Contacto") return Number(process.env.BREVO_CONTACT_LIST_ID);
  return Number(process.env.BREVO_DIAGNOSTIC_LIST_ID);
};

const brevoFetch = async (path, options = {}) => {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("Missing BREVO_API_KEY");
  }

  const response = await fetch(`${BREVO_API_URL}${path}`, {
    ...options,
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Brevo API error", {
      path,
      status: response.status,
      response: text,
      requestBody: options.body,
    });
    throw new Error(`Brevo API error ${response.status}: ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
};

const getConfirmationText = (name) => `Hola ${name},

Gracias por contactar con Kairvia.

Hemos recibido correctamente sus datos y revisaremos la información de su empresa para preparar una primera valoración sobre posibles oportunidades de automatización con inteligencia artificial.

Nos pondremos en contacto con usted lo antes posible por el canal indicado.

Un saludo,
Equipo de Kairvia`;

const sendConfirmationEmail = async ({ name, email }) => {
  if (!email) return;

  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Kairvia";

  if (!senderEmail) {
    throw new Error("Missing BREVO_SENDER_EMAIL");
  }

  const htmlContent = getConfirmationText(name).replace(/\n/g, "<br>");

  await brevoFetch("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email, name }],
      subject: "Hemos recibido su solicitud",
      htmlContent,
    }),
  });
};

const sendAdminNotification = async (lead) => {
  const adminEmail = process.env.BREVO_ADMIN_EMAIL;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Kairvia";

  if (!adminEmail || !senderEmail) return;

  const htmlContent = `
    <h2>Nuevo lead Kairvia</h2>
    <p><strong>Tipo:</strong> ${lead.formType}</p>
    <p><strong>Nombre:</strong> ${lead.name || "No indicado"}</p>
    <p><strong>Empresa:</strong> ${lead.company || "No indicada"}</p>
    <p><strong>Email:</strong> ${lead.email || "No indicado"}</p>
    <p><strong>WhatsApp/Teléfono:</strong> ${lead.phone || "No indicado"}</p>
    <p><strong>Preferencia:</strong> ${lead.contactPreference || "No indicada"}</p>
    <p><strong>Áreas:</strong> ${lead.areas || "No indicadas"}</p>
    <p><strong>Mensaje:</strong></p>
    <p>${(lead.message || "Sin mensaje").replace(/\n/g, "<br>")}</p>
  `;

  await brevoFetch("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: adminEmail, name: "Kairvia" }],
      replyTo: lead.email ? { email: lead.email, name: lead.name || "Lead" } : undefined,
      subject: `Nuevo lead ${lead.formType}: ${lead.name || lead.company || "sin nombre"}`,
      htmlContent,
    }),
  });
};

const buildContactPayload = (lead) => {
  const listId = getListIdForType(lead.formType);
  const submittedAt = lead.submittedAt || new Date().toISOString();
  const phone = lead.phone || "";
  const externalId = `${lead.formType || "Lead"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (!listId) {
    throw new Error(`Missing Brevo list id for ${lead.formType}`);
  }

  const payload = {
    updateEnabled: true,
    listIds: [listId],
    attributes: {
      NOMBRE: lead.name || "",
      EMPRESA: lead.company || "",
      WHATSAPP: phone,
      TELEFONO: phone,
      SMS: phone,
      TIPO_FORMULARIO: lead.formType || "",
      PREFERENCIA_CONTACTO: lead.contactPreference || "",
      MENSAJE: lead.message || "",
      AREAS: lead.areas || "",
      FECHA_ENVIO: submittedAt,
      ESTADO: "Nuevo",
    },
  };

  if (lead.email) {
    payload.email = lead.email;
  } else if (phone) {
    payload.sms = phone;
    payload.ext_id = externalId;
  } else {
    payload.ext_id = externalId;
  }

  return payload;
};

const saveLead = async (lead) => {
  const payload = buildContactPayload(lead);
  console.log("Saving Brevo lead", {
    formType: lead.formType,
    hasEmail: Boolean(lead.email),
    phone: lead.phone,
    listIds: payload.listIds,
  });

  await brevoFetch("/contacts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

const mapContactToLead = (contact) => {
  const attrs = contact.attributes || {};
  return {
    id: contact.id || contact.email || contact.ext_id,
    date: attrs.FECHA_ENVIO || contact.modifiedAt || contact.createdAt || "",
    formType: attrs.TIPO_FORMULARIO || "",
    name: attrs.NOMBRE || "",
    company: attrs.EMPRESA || "",
    email: contact.email || "",
    whatsapp: attrs.WHATSAPP || attrs.SMS || attrs.TELEFONO || "",
    contactPreference: attrs.PREFERENCIA_CONTACTO || "",
    message: attrs.MENSAJE || "",
    areas: attrs.AREAS || "",
    status: attrs.ESTADO || "Nuevo",
  };
};

const listContactsFromList = async (listId) => {
  if (!listId) return [];
  const result = await brevoFetch(`/contacts/lists/${listId}/contacts?limit=500&offset=0&sort=desc`);
  return result.contacts || [];
};

const handlePost = async (request, response) => {
  const body = request.body || {};
  const formType = normalizeText(body.formType);
  const contactPreference = normalizeText(body.contactPreference || body.contactMethod);
  const email = normalizeText(body.email).toLowerCase();
  const phone = normalizeSpanishPhone(body.phone || body.whatsapp || body.telefono);
  const name = normalizeText(body.name || body.nombre);
  const company = normalizeText(body.company || body.empresa);

  if (!formType || !name) {
    return json(response, 400, { error: "Missing required lead fields" });
  }

  if (contactPreference === "Correo" && !email) {
    return json(response, 400, { error: "Email is required for email preference" });
  }

  if (contactPreference === "WhatsApp" && !phone) {
    return json(response, 400, { error: "Phone is required for WhatsApp preference" });
  }

  const lead = {
    formType,
    name,
    email,
    phone,
    company,
    contactPreference,
    message: normalizeText(body.message || body.mensaje),
    areas: Array.isArray(body.areas) ? body.areas.join(", ") : normalizeText(body.areas),
    submittedAt: new Date().toISOString(),
  };

  await saveLead(lead);

  const notifications = [];

  try {
    await sendAdminNotification(lead);
    notifications.push("admin");
  } catch (error) {
    console.error("Brevo admin notification error", {
      message: error.message,
      formType: lead.formType,
      email: lead.email,
      phone: lead.phone,
    });
  }

  if (email) {
    try {
      await sendConfirmationEmail({ name, email });
      notifications.push("confirmation");
    } catch (error) {
      console.error("Brevo confirmation email error", {
        message: error.message,
        email,
        formType: lead.formType,
      });
    }
  }

  return json(response, 200, { ok: true, phone, notifications });
};

const handleGet = async (request, response) => {
  const password = request.query?.password || request.headers["x-admin-password"];

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return json(response, 401, { error: "Unauthorized" });
  }

  const listIds = [
    Number(process.env.BREVO_DIAGNOSTIC_LIST_ID),
    Number(process.env.BREVO_CONTACT_LIST_ID),
    Number(process.env.BREVO_FUNDAE_LIST_ID),
  ].filter(Boolean);

  const contacts = (await Promise.all(listIds.map(listContactsFromList))).flat();
  const seen = new Map();

  contacts.forEach((contact) => {
    const lead = mapContactToLead(contact);
    const key = lead.id || `${lead.email}-${lead.date}`;
    seen.set(key, lead);
  });

  const leads = Array.from(seen.values()).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return json(response, 200, { leads });
};

export default async function handler(request, response) {
  try {
    if (request.method === "OPTIONS") {
      response.setHeader("Allow", "GET, POST, OPTIONS");
      return response.status(204).end();
    }

    if (request.method === "POST") return handlePost(request, response);
    if (request.method === "GET") return handleGet(request, response);

    response.setHeader("Allow", "GET, POST, OPTIONS");
    return json(response, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Lead endpoint error", {
      message: error.message,
      stack: error.stack,
      method: request.method,
      body: request.body,
    });
    return json(response, 500, { error: error.message || "Unexpected error" });
  }
}
