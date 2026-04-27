/**
 * INFIBOT - Flujo completo de conversación
 *
 * FASE 1: Bienvenida y Registro
 *   greeting → ask_name → ask_email → ask_phone → send_policy → wait_policy
 *
 * FASE 2: Menú Principal
 *   menu → (1: consultas | 2: pqr | 3: humano | 4: salir)
 *
 * FASE 3: Ramas
 *   A) Consultas:  consultas → IA responde → (MENU para volver)
 *   B) PQR:        pqr_area → pqr_type → pqr_describe → pqr_confirm → radicado → encuesta
 *   C) Humano:     human_check → (ticket si horario laboral | mensaje si no) → encuesta
 *
 * FASE 4: Finalización
 *   survey_rating → survey_comment → goodbye
 */

const path = require("path");

const sessions = new Map();
const POLICY_PDF_PATH = path.join(__dirname, "..", "assets", "politica-datos.pdf");

// ─── CONTADOR DE RADICADOS ──────────────────────────────────────────
let radicadoCounter = 1000;

function generateRadicado() {
  radicadoCounter++;
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `RAD-${ymd}-${radicadoCounter}`;
}

// ─── HORARIO LABORAL ────────────────────────────────────────────────
function isBusinessHours() {
  const now = new Date();
  // Ajustar a hora Colombia (UTC-5)
  const utcHour = now.getUTCHours();
  const colombiaHour = (utcHour - 5 + 24) % 24;
  const colombiaMinutes = now.getUTCMinutes();
  const day = now.getUTCDay(); // 0=Dom, 1=Lun...6=Sab

  // Sábado y Domingo: cerrado
  if (day === 0 || day === 6) return false;

  const timeInMinutes = colombiaHour * 60 + colombiaMinutes;

  // Viernes: 7:00am - 3:00pm
  if (day === 5) {
    return timeInMinutes >= 420 && timeInMinutes < 900;
  }

  // Lunes a Jueves: 7:00am-12:00pm y 2:00pm-5:00pm
  const morning = timeInMinutes >= 420 && timeInMinutes < 720;
  const afternoon = timeInMinutes >= 840 && timeInMinutes < 1020;
  return morning || afternoon;
}

// ─── TEXTOS REUTILIZABLES ───────────────────────────────────────────

const MENU_TEXT =
  "📋 *Menú Principal*\n\n" +
  "*1.* 💬 Realizar una pregunta\n" +
  "*2.* 📝 Radicar un PQR (Petición, Queja o Recurso)\n" +
  "*3.* 👤 Atención personal (humana)\n" +
  "*4.* 🚪 Salir\n\n" +
  "Escribe el *número* de la opción:";

const PQR_AREAS_TEXT =
  "🏢 *Selecciona el área de tu PQR:*\n\n" +
  "*1.* 💡 Alumbrado Público\n" +
  "*2.* 🌳 Parques y Zonas Verdes\n" +
  "*3.* 🚲 Sistema de Bicicletas\n" +
  "*4.* 🏪 Plazas de Mercado\n" +
  "*5.* 🏛️ Complejo Panóptico / Plazoleta de Artesanos\n" +
  "*6.* 🏠 Inmuebles / Financiación\n\n" +
  "Escribe el *número* del área:";

const PQR_AREAS_MAP = {
  "1": "Alumbrado Público",
  "2": "Parques y Zonas Verdes",
  "3": "Sistema de Bicicletas",
  "4": "Plazas de Mercado",
  "5": "Complejo Panóptico / Plazoleta de Artesanos",
  "6": "Inmuebles / Financiación",
};

const PQR_TYPE_TEXT =
  "📌 *Selecciona el tipo de solicitud:*\n\n" +
  "*1.* 📄 Petición (solicitud de información o servicio)\n" +
  "*2.* 😤 Queja (inconformidad con un servicio o funcionario)\n" +
  "*3.* ⚖️ Recurso (exigencia de un derecho vulnerado)\n\n" +
  "Escribe el *número* del tipo:";

const PQR_TYPES_MAP = {
  "1": "Petición",
  "2": "Queja",
  "3": "Recurso",
};

const SURVEY_TEXT =
  "📊 *Encuesta de Satisfacción*\n\n" +
  "¿Cómo calificarías tu experiencia con InfiBot?\n\n" +
  "*1.* ⭐ Muy mala\n" +
  "*2.* ⭐⭐ Mala\n" +
  "*3.* ⭐⭐⭐ Regular\n" +
  "*4.* ⭐⭐⭐⭐ Buena\n" +
  "*5.* ⭐⭐⭐⭐⭐ Excelente\n\n" +
  "Escribe el *número* de tu calificación:";

const GOODBYE_TEXT =
  "👋 ¡Gracias por comunicarte con *INFIBAGUÉ*!\n\n" +
  "Si necesitas ayuda nuevamente, puedes escribirnos en cualquier momento.\n\n" +
  "¡Que tengas un excelente día! 🌟";

// ─── VALIDACIONES ───────────────────────────────────────────────────

function isValidEmail(text) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

function isValidPhone(text) {
  const cleaned = text.trim().replace(/[\s\-().+]/g, "");
  return /^\d{7,15}$/.test(cleaned);
}

// ─── SESIONES ───────────────────────────────────────────────────────

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { step: "greeting", data: {}, pqr: {} });
  }
  return sessions.get(userId);
}

// ─── FLUJO PRINCIPAL ────────────────────────────────────────────────

/**
 * @returns {{
 *   response: string|null,
 *   sendPolicy: boolean,
 *   useAI: "consulta"|"pqr_classify"|null
 * }}
 */
function handleFlow(userId, messageBody) {
  const session = getSession(userId);
  const text = messageBody.trim().toLowerCase();
  const original = messageBody.trim();

  switch (session.step) {
    // ═══════════════════════════════════════════════════════════════
    // FASE 1: BIENVENIDA Y REGISTRO
    // ═══════════════════════════════════════════════════════════════

    case "greeting":
      session.step = "ask_name";
      return reply(
        "👋 *¡Hola! Soy InfiBot*, el asistente virtual de *INFIBAGUÉ*.\n\n" +
          "Estoy aquí para ayudarte con tus trámites y consultas.\n\n" +
          "Antes de empezar, necesito algunos datos.\n\n" +
          "📝 Por favor, escribe tu *nombre completo*:"
      );

    case "ask_name":
      if (original.length < 3) {
        return reply("Por favor, ingresa un nombre válido (mínimo 3 caracteres):");
      }
      session.data.name = original;
      session.step = "ask_email";
      return reply(
        `Gracias, *${session.data.name}*. 😊\n\n` +
          "📧 Ahora, escribe tu *correo electrónico*:"
      );

    case "ask_email":
      if (!isValidEmail(original)) {
        return reply(
          "Ese correo no parece válido. Ingresa un correo electrónico válido.\n" +
            "Ejemplo: nombre@correo.com"
        );
      }
      session.data.email = original.toLowerCase();
      session.step = "ask_phone";
      return reply("📱 Por último, escribe tu *número de teléfono*:");

    case "ask_phone":
      if (!isValidPhone(original)) {
        return reply(
          "Ese número no parece válido. Ingresa un número de teléfono válido.\n" +
            "Ejemplo: 3001234567"
        );
      }
      session.data.phone = original;
      session.step = "wait_policy";
      return {
        response:
          "✅ *Datos registrados:*\n\n" +
          `👤 *Nombre:* ${session.data.name}\n` +
          `📧 *Correo:* ${session.data.email}\n` +
          `📱 *Teléfono:* ${session.data.phone}\n\n` +
          "📄 Ahora te comparto nuestra *Política de Tratamiento de Datos Personales*.\n" +
          "Por favor revísala y responde:\n\n" +
          "✅ *SI* → Acepto la política\n" +
          "❌ *NO* → No acepto",
        sendPolicy: true,
        useAI: null,
      };

    case "wait_policy":
      if (text === "si" || text === "sí" || text === "acepto") {
        session.data.policyAccepted = true;
        session.data.policyAcceptedAt = new Date().toISOString();
        session.step = "menu";
        return reply(
          "✅ ¡Gracias por aceptar la política de datos!\n\n" + MENU_TEXT
        );
      }
      if (text === "no" || text === "no acepto") {
        session.step = "rejected";
        return reply(
          "Lo lamento, no podemos continuar sin la aceptación de la política.\n\n" +
            "Si cambias de opinión, puedes escribirnos de nuevo.\n\n" +
            "¡Que tengas un buen día! 👋"
        );
      }
      return reply("Por favor, responde *SI* para aceptar o *NO* para rechazar.");

    case "rejected":
      session.step = "greeting";
      session.data = {};
      session.pqr = {};
      return handleFlow(userId, messageBody);

    // ═══════════════════════════════════════════════════════════════
    // FASE 2: MENÚ PRINCIPAL
    // ═══════════════════════════════════════════════════════════════

    case "menu":
      if (text === "1") {
        session.step = "consultas";
        return reply(
          "💬 *Consultas*\n\n" +
            "Escribe tu pregunta de la manera más clara posible y te responderé.\n\n" +
            "_Escribe *MENU* en cualquier momento para volver al menú principal._"
        );
      }
      if (text === "2") {
        session.step = "pqr_area";
        session.pqr = {};
        return reply("📝 *Radicar un PQR*\n\n" + PQR_AREAS_TEXT);
      }
      if (text === "3") {
        session.step = "human_check";
        return handleFlow(userId, messageBody);
      }
      if (text === "4") {
        session.step = "survey_rating";
        return reply(
          "Antes de irte, nos gustaría conocer tu opinión.\n\n" + SURVEY_TEXT
        );
      }
      return reply(
        "Por favor, escribe *1*, *2*, *3* o *4* para seleccionar una opción.\n\n" + MENU_TEXT
      );

    // ═══════════════════════════════════════════════════════════════
    // FASE 3A: CONSULTAS (PREGUNTAS)
    // ═══════════════════════════════════════════════════════════════

    case "consultas":
      if (text === "menu" || text === "menú" || text === "volver") {
        session.step = "menu";
        return reply(MENU_TEXT);
      }
      if (original.length < 5) {
        return reply(
          "Tu mensaje es muy corto. Por favor, formula tu pregunta con más detalle para que pueda ayudarte."
        );
      }
      return { response: null, sendPolicy: false, useAI: "consulta" };

    // ═══════════════════════════════════════════════════════════════
    // FASE 3B: PQR (PETICIÓN, QUEJA, RECURSO)
    // ═══════════════════════════════════════════════════════════════

    case "pqr_area":
      if (!PQR_AREAS_MAP[text]) {
        return reply("Por favor, selecciona un número del *1* al *6*.\n\n" + PQR_AREAS_TEXT);
      }
      session.pqr.area = PQR_AREAS_MAP[text];
      session.step = "pqr_type";
      return reply(
        `Has seleccionado: *${session.pqr.area}*\n\n` + PQR_TYPE_TEXT
      );

    case "pqr_type":
      if (!PQR_TYPES_MAP[text]) {
        return reply("Por favor, selecciona *1*, *2* o *3*.\n\n" + PQR_TYPE_TEXT);
      }
      session.pqr.type = PQR_TYPES_MAP[text];
      session.step = "pqr_describe";
      return reply(
        `📌 *Tipo:* ${session.pqr.type} | *Área:* ${session.pqr.area}\n\n` +
          "✍️ Ahora, describe tu solicitud con el mayor detalle posible.\n" +
          "Incluye: qué sucedió, dónde, cuándo, y cualquier dato relevante."
      );

    case "pqr_describe":
      if (original.length < 15) {
        return reply(
          "Por favor, describe tu solicitud con más detalle (mínimo 15 caracteres) para que podamos procesarla correctamente."
        );
      }
      session.pqr.description = original;
      session.step = "pqr_classifying";
      return { response: null, sendPolicy: false, useAI: "pqr_classify" };

    case "pqr_classifying":
      return reply("⏳ Procesando tu solicitud, por favor espera...");

    case "pqr_confirm":
      if (text === "si" || text === "sí" || text === "confirmar") {
        const radicado = generateRadicado();
        session.pqr.radicado = radicado;
        session.pqr.date = new Date().toISOString();
        session.step = "survey_rating";

        console.log("📄 PQR radicado:", {
          radicado,
          area: session.pqr.area,
          tipo: session.pqr.type,
          ciudadano: session.data.name,
          email: session.data.email,
        });

        return reply(
          "✅ *¡Tu PQR ha sido radicado con éxito!*\n\n" +
            `📌 *Número de radicado:* ${radicado}\n` +
            `🏢 *Área:* ${session.pqr.area}\n` +
            `📋 *Tipo:* ${session.pqr.type}\n` +
            `📝 *Asunto:* ${session.pqr.summary}\n` +
            `📅 *Fecha:* ${new Date().toLocaleDateString("es-CO")}\n` +
            `👤 *Solicitante:* ${session.data.name}\n\n` +
            "Guarda tu número de radicado para seguimiento.\n" +
            "La solicitud será enviada al área de Atención al Ciudadano.\n\n" +
            "Ahora, nos gustaría conocer tu opinión.\n\n" +
            SURVEY_TEXT
        );
      }
      if (text === "no" || text === "corregir") {
        session.pqr.description = null;
        session.pqr.summary = null;
        session.step = "pqr_describe";
        return reply(
          "De acuerdo, vamos a generar la solicitud de nuevo.\n\n" +
            "✍️ Describe nuevamente tu solicitud:"
        );
      }
      return reply("Responde *SI* para confirmar o *NO* para corregir.");

    // ═══════════════════════════════════════════════════════════════
    // FASE 3C: ATENCIÓN HUMANA
    // ═══════════════════════════════════════════════════════════════

    case "human_check": {
      if (isBusinessHours()) {
        session.step = "human_waiting";
        const ticket = `TKT-${Date.now()}`;
        session.data.supportTicket = ticket;

        console.log("🎫 Ticket de soporte generado:", {
          ticket,
          ciudadano: session.data.name,
          email: session.data.email,
        });

        return reply(
          "👤 *Atención Personal*\n\n" +
            "Estamos en *horario laboral*. Se ha generado un ticket para que un agente te atienda.\n\n" +
            `🎫 *Ticket:* ${ticket}\n\n` +
            "📞 *Teléfono:* 6082772348\n" +
            "📧 *Correo:* correspondencia@infibague.gov.co\n" +
            "🏢 *Dirección:* Carrera 5 calle 60, Barrio La Floresta, Ibagué\n\n" +
            "Un funcionario se comunicará contigo pronto. " +
            "Si prefieres, también puedes llamar o acercarte a nuestras oficinas.\n\n" +
            "Mientras tanto, califica tu experiencia con InfiBot.\n\n" +
            SURVEY_TEXT
        );
      }

      session.step = "menu";
      return reply(
        "👤 *Atención Personal*\n\n" +
          "⏰ En este momento *no estamos en horario de atención*.\n\n" +
          "🕐 *Horarios de atención:*\n" +
          "Lunes a Jueves: 7:00am - 12:00pm y 2:00pm - 5:00pm\n" +
          "Viernes: 7:00am - 3:00pm\n\n" +
          "📞 *Teléfono:* 6082772348\n" +
          "📧 *Correo:* correspondencia@infibague.gov.co\n" +
          "🏢 *Dirección:* Carrera 5 calle 60, Barrio La Floresta, Ibagué\n\n" +
          "Por favor, intenta de nuevo en horario de oficina.\n\n" +
          MENU_TEXT
      );
    }

    case "human_waiting":
      if (text === "menu" || text === "menú" || text === "volver") {
        session.step = "survey_rating";
        return reply(
          "Antes de volver, califica tu experiencia.\n\n" + SURVEY_TEXT
        );
      }
      return reply(
        "Tu ticket de soporte ya fue generado. Un funcionario se comunicará contigo.\n\n" +
          "Escribe *MENU* cuando desees continuar."
      );

    // ═══════════════════════════════════════════════════════════════
    // FASE 4: ENCUESTA DE SATISFACCIÓN Y CIERRE
    // ═══════════════════════════════════════════════════════════════

    case "survey_rating": {
      const rating = parseInt(text);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return reply("Por favor, escribe un número del *1* al *5*.\n\n" + SURVEY_TEXT);
      }
      session.data.surveyRating = rating;
      session.step = "survey_comment";
      const stars = "⭐".repeat(rating);
      return reply(
        `${stars} ¡Gracias por tu calificación!\n\n` +
          "💬 ¿Tienes algún comentario adicional sobre tu experiencia?\n\n" +
          "Escribe tu comentario o escribe *NO* si no tienes comentarios."
      );
    }

    case "survey_comment":
      if (text !== "no") {
        session.data.surveyComment = original;
      }
      session.step = "goodbye";

      console.log("📊 Encuesta completada:", {
        ciudadano: session.data.name,
        rating: session.data.surveyRating,
        comment: session.data.surveyComment || "Sin comentarios",
      });

      return reply(GOODBYE_TEXT);

    case "goodbye":
      // Si el usuario escribe de nuevo después del adiós, reiniciar
      session.step = "greeting";
      session.data = {};
      session.pqr = {};
      return handleFlow(userId, messageBody);

    default:
      session.step = "greeting";
      session.data = {};
      session.pqr = {};
      return handleFlow(userId, messageBody);
  }
}

// Helper para respuestas simples
function reply(text) {
  return { response: text, sendPolicy: false, useAI: null };
}

// ─── FUNCIONES PÚBLICAS ─────────────────────────────────────────────

function setPQRClassification(userId, classification) {
  const session = getSession(userId);
  session.pqr.summary = classification.resumen;
  session.step = "pqr_confirm";
}

function getUserData(userId) {
  const session = sessions.get(userId);
  return session ? session.data : null;
}

function getPQRData(userId) {
  const session = sessions.get(userId);
  return session ? session.pqr : null;
}

module.exports = {
  handleFlow,
  getUserData,
  getPQRData,
  setPQRClassification,
  getSession,
  POLICY_PDF_PATH,
};
