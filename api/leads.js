const BREVO_API_URL = "https://api.brevo.com/v3";

const json = (response, statusCode, body) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
};

const safeStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({ unserializable: true, message: error.message });
  }
};

const parseRequestBody = (request) => {
  const body = request.body;

  if (!body) return {};
  if (typeof body === "object" && !Buffer.isBuffer(body)) return body;

  const raw = Buffer.isBuffer(body) ? body.toString("utf8") : String(body);
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Lead endpoint body parse error", safeStringify({
      message: error.message,
      rawBodyPreview: raw.slice(0, 500),
    }));
    return {};
  }
};

const normalizeText = (value = "") => String(value || "").trim();

const getBrevoDate = (date = new Date()) => date.toISOString().slice(0, 10);

const formatDisplayDate = (value = "") => {
  const raw = normalizeText(value);
  if (!raw) return "";

  const datePart = raw.includes("T") ? raw.slice(0, 10) : raw;
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return raw;

  return `${match[3]}-${match[2]}-${match[1].slice(2)}`;
};

const normalizeContactPreference = (value = "") => {
  const preference = normalizeText(value);
  const normalized = preference.toLowerCase();

  if (normalized === "correo" || normalized === "email" || normalized === "correo electrónico" || normalized === "correo electronico") {
    return "Correo electrónico";
  }

  if (normalized === "whatsapp") return "WhatsApp";

  return preference;
};

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

const parseBrevoListId = (value) => Number(String(value || "").replace("#", "").trim());

const getListIdForType = (type) => {
  if (type === "FUNDAE") return parseBrevoListId(process.env.BREVO_FUNDAE_LIST_ID);
  if (type === "Contacto") return parseBrevoListId(process.env.BREVO_CONTACT_LIST_ID);
  return parseBrevoListId(process.env.BREVO_DIAGNOSTIC_LIST_ID);
};

const classifyBrevoError = (status, text = "") => {
  const normalized = text.toLowerCase();

  if (status === 401 || normalized.includes("unauthorized") || normalized.includes("api key")) {
    return "API key incorrecta o ausente";
  }

  if (normalized.includes("list") || normalized.includes("listid") || normalized.includes("list id")) {
    return "list ID incorrecto o lista inexistente";
  }

  if (normalized.includes("already exists") || normalized.includes("duplicate_parameter") || normalized.includes("duplicate")) {
    return "contacto ya existente en Brevo";
  }

  if (normalized.includes("attribute") || normalized.includes("attributes") || normalized.includes("not a valid attribute")) {
    return "atributo inexistente o tipo de atributo incorrecto en Brevo";
  }

  if (normalized.includes("phone") || normalized.includes("sms") || normalized.includes("mobile") || normalized.includes("invalid parameter")) {
    return "formato de teléfono incorrecto o identificador externo no aceptado";
  }

  if (normalized.includes("sender") || normalized.includes("not verified") || normalized.includes("not allowed")) {
    return "sender email no verificado o no permitido";
  }

  return "error de Brevo sin clasificar";
};

const brevoFetch = async (path, options = {}) => {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    const error = new Error("Missing BREVO_API_KEY");
    error.category = "API key incorrecta o ausente";
    console.error("Brevo configuration error", safeStringify({
      category: error.category,
      brevoApiKeyExists: false,
      path,
    }));
    throw error;
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
    const category = classifyBrevoError(response.status, text);
    console.error("Brevo API error", safeStringify({
      category,
      path,
      status: response.status,
      response: text,
      requestBody: options.body,
    }));
    const error = new Error(`Brevo API error ${response.status}: ${text}`);
    error.category = category;
    error.status = response.status;
    error.responseBody = text;
    throw error;
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
    <p><strong>Nombre:</strong> ${lead.name || "No indicado"}</p>
    <p><strong>Empresa:</strong> ${lead.company || "No indicado"}</p>
    <p><strong>Email:</strong> ${lead.email || "No indicado"}</p>
    <p><strong>Teléfono:</strong> ${lead.phone || "No indicado"}</p>
    <p><strong>Preferencia de contacto:</strong> ${lead.contactPreference || "No indicado"}</p>
    <p><strong>Fecha de envío:</strong> ${formatDisplayDate(lead.submittedAt)}</p>
    <p><strong>Estado:</strong> Nuevo</p>
    <p><strong>Mensaje:</strong> ${(lead.message || "No indicado").replace(/\n/g, "<br>")}</p>
    <p><strong>Áreas:</strong> ${lead.areas || "No indicado"}</p>
  `;

  await brevoFetch("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: adminEmail, name: "Kairvia" }],
      replyTo: lead.email ? { email: lead.email, name: lead.name || "Lead" } : undefined,
      subject: `Nuevo lead Kairvia: ${lead.name || lead.company || "sin nombre"}`,
      htmlContent,
    }),
  });
};

const validateBrevoListId = (formType) => {
  const listId = getListIdForType(formType);

  if (!Number.isInteger(listId) || listId <= 0) {
    const error = new Error(`Brevo list ID inválido para ${formType}. Revisa la variable de entorno y usa solo el número, por ejemplo 2, sin #.`);
    error.category = "list ID incorrecto o lista inexistente";
    throw error;
  }

  return listId;
};

const getContactIdentifier = (lead) => lead.email || (lead.phone && lead.contactPreference === "WhatsApp" ? `whatsapp:${lead.phone}` : "");

const addAttribute = (attributes, key, value) => {
  if (value !== undefined && value !== null && String(value).trim() !== "") {
    attributes[key] = value;
  }
};

const buildContactPayload = (lead) => {
  const listId = validateBrevoListId(lead.formType);
  const phone = lead.phone || "";
  const isWhatsappLead = lead.contactPreference === "WhatsApp";
  const attributes = {};

  addAttribute(attributes, "NOMBRE", lead.name);
  addAttribute(attributes, "EMPRESA", lead.company);
  addAttribute(attributes, "PREFERENCIA_CONTACTO", lead.contactPreference || (lead.email ? "Correo electrónico" : ""));
  addAttribute(attributes, "FECHA_ENVIO", lead.submittedAt || getBrevoDate());
  addAttribute(attributes, "ESTADO", "Nuevo");
  addAttribute(attributes, "MENSAJE", lead.message);
  addAttribute(attributes, "AREAS", lead.areas);

  if (phone) {
    addAttribute(attributes, "TELEFONO", phone);
    addAttribute(attributes, "SMS", phone);

    if (isWhatsappLead) {
      addAttribute(attributes, "WHATSAPP", phone);
    }
  }

  const payload = {
    updateEnabled: true,
    listIds: [listId],
    attributes,
  };

  if (lead.email) {
    payload.email = lead.email;
  } else if (isWhatsappLead && phone) {
    payload.ext_id = `whatsapp:${phone}`;
  } else {
    payload.ext_id = `${lead.formType || "Lead"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  return payload;
};

const buildUpdatePayload = (lead) => ({
  attributes: buildContactPayload(lead).attributes,
  listIds: [validateBrevoListId(lead.formType)],
});

const requiredContactAttributes = [
  { name: "NOMBRE", type: "text" },
  { name: "EMPRESA", type: "text" },
  { name: "WHATSAPP", type: "text" },
  { name: "TELEFONO", type: "text" },
  { name: "SMS", type: "text" },
  { name: "PREFERENCIA_CONTACTO", type: "text" },
  { name: "FECHA_ENVIO", type: "date" },
  { name: "AREAS", type: "text" },
  { name: "ESTADO", type: "text" },
  { name: "MENSAJE", type: "text" },
];

let attributesReady = false;

const ensureContactAttributes = async () => {
  if (attributesReady) return;

  await Promise.all(requiredContactAttributes.map(async ({ name, type }) => {
    try {
      await brevoFetch(`/contacts/attributes/normal/${encodeURIComponent(name)}`, {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      console.log("Brevo attribute created", safeStringify({ name, type }));
    } catch (error) {
      const details = `${error.message || ""} ${error.responseBody || ""}`.toLowerCase();
      const alreadyExists = details.includes("already exists") || details.includes("duplicate") || details.includes("exists");

      if (!alreadyExists) {
        console.error("Brevo attribute setup warning", safeStringify({
          name,
          type,
          status: error.status,
          category: error.category,
          responseBody: error.responseBody,
          message: error.message,
        }));
      }
    }
  }));

  attributesReady = true;
};

const saveLead = async (lead) => {
  const payload = buildContactPayload(lead);
  const identifier = getContactIdentifier(lead);
  console.log("Saving Brevo lead", safeStringify({
    brevoApiKeyExists: Boolean(process.env.BREVO_API_KEY),
    formType: lead.formType,
    rawListIds: {
      diagnostic: process.env.BREVO_DIAGNOSTIC_LIST_ID || null,
      contact: process.env.BREVO_CONTACT_LIST_ID || null,
      fundae: process.env.BREVO_FUNDAE_LIST_ID || null,
    },
    selectedListId: payload.listIds?.[0],
    hasEmail: Boolean(lead.email),
    phone: lead.phone,
    identifier,
    extId: payload.ext_id,
    attributes: payload.attributes,
    payload,
  }));

  await ensureContactAttributes();

  try {
    await brevoFetch("/contacts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return;
  } catch (error) {
    if (error.category !== "contacto ya existente en Brevo") {
      throw error;
    }

    const updatePayload = buildUpdatePayload(lead);
    const encodedIdentifier = encodeURIComponent(identifier);
    console.error("Brevo contact exists, updating contact", safeStringify({
      originalCategory: error.category,
      originalMessage: error.message,
      identifier,
      updatePayload,
    }));

    await brevoFetch(`/contacts/${encodedIdentifier}`, {
      method: "PUT",
      body: JSON.stringify(updatePayload),
    });
  }
};

const mapContactToLead = (contact, sourceList = "") => {
  const attrs = contact.attributes || {};
  const rawDate = attrs.FECHA_ENVIO || contact.modifiedAt || contact.createdAt || "";
  return {
    id: contact.id || contact.email || contact.ext_id,
    date: formatDisplayDate(rawDate),
    dateRaw: rawDate,
    sourceList,
    name: attrs.NOMBRE || "",
    company: attrs.EMPRESA || "",
    email: contact.email || "",
    phone: attrs.TELEFONO || attrs.SMS || "",
    whatsapp: attrs.WHATSAPP || attrs.TELEFONO || attrs.SMS || "",
    contactPreference: attrs.PREFERENCIA_CONTACTO || "",
    message: attrs.MENSAJE || "",
    areas: attrs.AREAS || "",
    status: attrs.ESTADO || "Nuevo",
  };
};

const listContactsFromList = async (listId, sourceList) => {
  if (!listId) return [];
  const result = await brevoFetch(`/contacts/lists/${listId}/contacts?limit=500&offset=0&sort=desc`);
  return (result.contacts || []).map((contact) => ({ ...contact, __sourceList: sourceList }));
};

const handlePost = async (request, response) => {
  const body = parseRequestBody(request);
  const formType = normalizeText(body.formType);
  const contactPreference = normalizeContactPreference(body.contactPreference || body.contactMethod || (normalizeText(body.email) ? "Correo electrónico" : ""));
  const email = normalizeText(body.email).toLowerCase();
  const phone = normalizeSpanishPhone(body.phone || body.whatsapp || body.telefono);
  const name = normalizeText(body.name || body.nombre);
  const company = normalizeText(body.company || body.empresa);

  if (!formType || !name) {
    return json(response, 400, { error: "Missing required lead fields" });
  }

  if (contactPreference === "Correo electrónico" && !email) {
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
    contactPreference: contactPreference || (email ? "Correo electrónico" : ""),
    message: normalizeText(body.message || body.mensaje),
    areas: Array.isArray(body.areas) ? body.areas.join(", ") : normalizeText(body.areas),
    submittedAt: getBrevoDate(),
  };

  console.log("Lead endpoint received", safeStringify({
    method: request.method,
    brevoApiKeyExists: Boolean(process.env.BREVO_API_KEY),
    formType,
    contactPreference,
    hasEmail: Boolean(email),
    normalizedPhone: phone,
    listId: getListIdForType(formType),
    rawListIds: {
      diagnostic: process.env.BREVO_DIAGNOSTIC_LIST_ID || null,
      contact: process.env.BREVO_CONTACT_LIST_ID || null,
      fundae: process.env.BREVO_FUNDAE_LIST_ID || null,
    },
  }));

  await saveLead(lead);

  const notifications = [];

  try {
    await sendAdminNotification(lead);
    notifications.push("admin");
  } catch (error) {
    console.error("Brevo admin notification error", safeStringify({
      category: error.category || classifyBrevoError(0, error.message),
      message: error.message,
      formType: lead.formType,
      email: lead.email,
      phone: lead.phone,
    }));
  }

  if (email) {
    try {
      await sendConfirmationEmail({ name, email });
      notifications.push("confirmation");
    } catch (error) {
      console.error("Brevo confirmation email error", safeStringify({
        category: error.category || classifyBrevoError(0, error.message),
        message: error.message,
        email,
        formType: lead.formType,
      }));
    }
  }

  return json(response, 200, { ok: true, phone, notifications });
};

const handleGet = async (request, response) => {
  const password = request.query?.password || request.headers["x-admin-password"];

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return json(response, 401, { error: "Unauthorized" });
  }

  const lists = [
    { id: parseBrevoListId(process.env.BREVO_DIAGNOSTIC_LIST_ID), sourceList: "Diagnóstico" },
    { id: parseBrevoListId(process.env.BREVO_CONTACT_LIST_ID), sourceList: "Contacto" },
    { id: parseBrevoListId(process.env.BREVO_FUNDAE_LIST_ID), sourceList: "FUNDAE" },
  ].filter((list) => Boolean(list.id));

  const contacts = (await Promise.all(lists.map((list) => listContactsFromList(list.id, list.sourceList)))).flat();
  const seen = new Map();

  contacts.forEach((contact) => {
    const lead = mapContactToLead(contact, contact.__sourceList);
    const key = lead.id || `${lead.email}-${lead.date}`;
    seen.set(key, lead);
  });

  const leads = Array.from(seen.values()).sort((a, b) => String(b.dateRaw).localeCompare(String(a.dateRaw)));
  return json(response, 200, { leads });
};

export default async function handler(request, response) {
  try {
    if (request.method === "OPTIONS") {
      response.setHeader("Allow", "GET, POST, OPTIONS");
      response.statusCode = 204;
      return response.end();
    }

    if (request.method === "POST") return await handlePost(request, response);
    if (request.method === "GET") return await handleGet(request, response);

    response.setHeader("Allow", "GET, POST, OPTIONS");
    return json(response, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Lead endpoint error", safeStringify({
      category: error.category || classifyBrevoError(0, error.message),
      message: error.message,
      stack: error.stack,
      method: request.method,
      body: request.body,
    }));
    return json(response, 500, {
      error: "Ha ocurrido un problema al enviar la solicitud. Por favor, inténtelo de nuevo en unos minutos.",
    });
  }
}
