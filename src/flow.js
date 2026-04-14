/**
 * Maneja el flujo de conversación por usuario.
 *
 * Flujo completo:
 * greeting → wait_policy → ask_name → ask_email → ask_phone
 * → menu → (PQRSD | Consultas | Atención Personal)
 *
 * Flujo PQRSD:
 * pqrsd_describe → pqrsd_confirm → pqrsd_done → menu
 *
 * Flujo Consultas:
 * consultas (responde IA, vuelve a menu con "menu")
 */

const path = require("path");

const sessions = new Map();

const POLICY_PDF_PATH = path.join(__dirname, "..", "assets", "politica-datos.pdf");

// Contador global para números de radicado
let radicadoCounter = 1000;

function generateRadicado() {
  radicadoCounter++;
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `RAD-${year}${month}${day}-${radicadoCounter}`;
}

// Texto del menú principal (reutilizable)
const MENU_TEXT =
  "📋 *¿Qué deseas hacer?*\n\n" +
  "*1.* 📝 PQRSD (Peticiones, Quejas, Reclamos, Sugerencias, Denuncias)\n" +
  "*2.* 💬 Consultas\n" +
  "*3.* 👤 Atención Personal\n\n" +
  "Escribe el *número* de la opción:";

// Validaciones
function isValidEmail(text) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

function isValidPhone(text) {
  const cleaned = text.trim().replace(/[\s\-().+]/g, "");
  return /^\d{7,15}$/.test(cleaned);
}

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { step: "greeting", data: {} });
  }
  return sessions.get(userId);
}

/**
 * Procesa un mensaje según el estado actual del usuario.
 * @param {string} userId
 * @param {string} messageBody
 * @returns {{ response: string, sendPolicy: boolean, useAI: string|null }}
 *   - response: texto a enviar (null si lo maneja index.js)
 *   - sendPolicy: si debe enviar el PDF de política
 *   - useAI: null = no usar IA, "consulta" = consulta libre, "pqrsd" = clasificar PQRSD
 */
function handleFlow(userId, messageBody) {
  const session = getSession(userId);
  const text = messageBody.trim().toLowerCase();

  switch (session.step) {
    // ─── REGISTRO INICIAL ───────────────────────────────────────────

    case "greeting":
      session.step = "wait_policy";
      return {
        response:
          "👋 ¡Hola! Bienvenido/a al canal de atención virtual de *INFIBAGUE*.\n\n" +
          "Soy *INFIBOT*, el asistente virtual, y estoy aquí para ayudarte.\n\n" +
          "📄 Antes de continuar, te comparto nuestra *Política de Tratamiento de Datos Personales*. " +
          "Por favor léela y responde:\n\n" +
          "✅ *SI* → Acepto la política\n" +
          "❌ *NO* → No acepto",
        sendPolicy: true,
        useAI: null,
      };

    case "wait_policy":
      if (text === "si" || text === "sí" || text === "acepto") {
        session.step = "ask_name";
        session.data.policyAccepted = true;
        session.data.policyAcceptedAt = new Date().toISOString();
        return {
          response:
            "✅ ¡Gracias por aceptar nuestra política de datos!\n\n" +
            "Necesito algunos datos para brindarte una mejor atención.\n\n" +
            "📝 Por favor, escribe tu *nombre completo*:",
          sendPolicy: false,
          useAI: null,
        };
      }
      if (text === "no" || text === "no acepto") {
        session.step = "rejected";
        return {
          response:
            "Entendemos tu decisión. Sin la aceptación de la política de tratamiento de datos, " +
            "no podemos continuar con la atención.\n\n" +
            "Si cambias de opinión, puedes escribirnos de nuevo en cualquier momento. " +
            "También puedes comunicarte directamente con INFIBAGUE:\n\n" +
            "📞 *Teléfono:* 6082772348\n" +
            "📧 *Correo:* correspondencia@infibague.gov.co\n" +
            "🏢 *Dirección:* Carrera 5 calle 60, Barrio La Floresta, Ibagué\n\n" +
            "¡Que tengas un buen día!",
          sendPolicy: false,
          useAI: null,
        };
      }
      return {
        response: "Por favor, responde *SI* para aceptar la política de datos o *NO* si no la aceptas.",
        sendPolicy: false,
        useAI: null,
      };

    case "rejected":
      session.step = "greeting";
      return handleFlow(userId, messageBody);

    case "ask_name":
      if (messageBody.trim().length < 3) {
        return {
          response: "Por favor, ingresa un nombre válido (mínimo 3 caracteres):",
          sendPolicy: false,
          useAI: null,
        };
      }
      session.data.name = messageBody.trim();
      session.step = "ask_email";
      return {
        response:
          `Gracias, *${session.data.name}*. 😊\n\n` +
          "📧 Ahora, por favor escribe tu *correo electrónico*:",
        sendPolicy: false,
        useAI: null,
      };

    case "ask_email":
      if (!isValidEmail(messageBody)) {
        return {
          response:
            "Ese correo no parece válido. Por favor, ingresa un correo electrónico válido.\n" +
            "Ejemplo: nombre@correo.com",
          sendPolicy: false,
          useAI: null,
        };
      }
      session.data.email = messageBody.trim().toLowerCase();
      session.step = "ask_phone";
      return {
        response: "📱 Por último, escribe tu *número de teléfono*:",
        sendPolicy: false,
        useAI: null,
      };

    case "ask_phone":
      if (!isValidPhone(messageBody)) {
        return {
          response:
            "Ese número no parece válido. Por favor, ingresa un número de teléfono válido.\n" +
            "Ejemplo: 3001234567",
          sendPolicy: false,
          useAI: null,
        };
      }
      session.data.phone = messageBody.trim();
      session.step = "menu";

      console.log("📋 Registro completado:", session.data);

      return {
        response:
          "✅ ¡Registro completado! Estos son tus datos:\n\n" +
          `👤 *Nombre:* ${session.data.name}\n` +
          `📧 *Correo:* ${session.data.email}\n` +
          `📱 *Teléfono:* ${session.data.phone}\n\n` +
          MENU_TEXT,
        sendPolicy: false,
        useAI: null,
      };

    // ─── MENÚ PRINCIPAL ─────────────────────────────────────────────

    case "menu":
      if (text === "1") {
        session.step = "pqrsd_describe";
        return {
          response:
            "📝 *PQRSD - Peticiones, Quejas, Reclamos, Sugerencias y Denuncias*\n\n" +
            "Por favor, describe tu solicitud con el mayor detalle posible.\n" +
            "La IA se encargará de clasificarla y generar un resumen.\n\n" +
            "✍️ Escribe tu solicitud:",
          sendPolicy: false,
          useAI: null,
        };
      }
      if (text === "2") {
        session.step = "consultas";
        return {
          response:
            "💬 *Consultas sobre INFIBAGUE*\n\n" +
            "Puedes preguntarme lo que necesites sobre los servicios de INFIBAGUE.\n" +
            "Escribe *MENU* en cualquier momento para volver al menú principal.\n\n" +
            "¿En qué te puedo ayudar?",
          sendPolicy: false,
          useAI: null,
        };
      }
      if (text === "3") {
        session.step = "menu";
        return {
          response:
            "👤 *Atención Personal*\n\n" +
            "Si necesitas atención personalizada, puedes contactarnos por los siguientes medios:\n\n" +
            "📞 *Teléfono:* 6082772348\n" +
            "📧 *Correo:* correspondencia@infibague.gov.co\n" +
            "🏢 *Dirección:* Carrera 5 calle 60, Barrio La Floresta, Ibagué, Tolima\n\n" +
            "🕐 *Horarios de atención:*\n" +
            "Lunes a Jueves: 7:00am - 12:00pm y 2:00pm - 5:00pm\n" +
            "Viernes: 7:00am - 3:00pm\n\n" +
            MENU_TEXT,
          sendPolicy: false,
          useAI: null,
        };
      }
      return {
        response: "Por favor, escribe *1*, *2* o *3* para seleccionar una opción.\n\n" + MENU_TEXT,
        sendPolicy: false,
        useAI: null,
      };

    // ─── FLUJO PQRSD ───────────────────────────────────────────────

    case "pqrsd_describe":
      if (messageBody.trim().length < 10) {
        return {
          response: "Por favor, describe tu solicitud con más detalle (mínimo 10 caracteres):",
          sendPolicy: false,
          useAI: null,
        };
      }
      // Guardar el texto original y pedir a la IA que lo clasifique
      session.data.pqrsdOriginal = messageBody.trim();
      session.step = "pqrsd_classifying";
      return {
        response: null,
        sendPolicy: false,
        useAI: "pqrsd",
      };

    case "pqrsd_classifying":
      // Este estado no debería recibir mensajes directamente,
      // se maneja desde index.js después de la clasificación IA
      return {
        response: "⏳ Estamos procesando tu solicitud, por favor espera un momento...",
        sendPolicy: false,
        useAI: null,
      };

    case "pqrsd_confirm":
      if (text === "si" || text === "sí" || text === "confirmar") {
        const radicado = generateRadicado();
        session.data.pqrsdRadicado = radicado;
        session.data.pqrsdDate = new Date().toISOString();
        session.step = "menu";

        console.log("📄 PQRSD registrada:", {
          radicado,
          tipo: session.data.pqrsdClassification.tipo,
          ciudadano: session.data.name,
          email: session.data.email,
        });

        return {
          response:
            "✅ *¡PQRSD registrada exitosamente!*\n\n" +
            `📌 *Número de radicado:* ${radicado}\n` +
            `📋 *Tipo:* ${session.data.pqrsdClassification.tipo}\n` +
            `📝 *Asunto:* ${session.data.pqrsdClassification.asunto}\n` +
            `📅 *Fecha:* ${new Date().toLocaleDateString("es-CO")}\n\n` +
            "Guarda tu número de radicado para hacer seguimiento.\n" +
            "La solicitud será enviada al área de Atención al Ciudadano de INFIBAGUE.\n\n" +
            MENU_TEXT,
          sendPolicy: false,
          useAI: null,
        };
      }
      if (text === "no" || text === "corregir") {
        session.step = "pqrsd_describe";
        session.data.pqrsdOriginal = null;
        session.data.pqrsdClassification = null;
        return {
          response:
            "De acuerdo, vamos a generar la solicitud de nuevo.\n\n" +
            "✍️ Por favor, describe nuevamente tu solicitud:",
          sendPolicy: false,
          useAI: null,
        };
      }
      return {
        response: "Por favor, responde *SI* para confirmar o *NO* para corregir tu solicitud.",
        sendPolicy: false,
        useAI: null,
      };

    // ─── FLUJO CONSULTAS ────────────────────────────────────────────

    case "consultas":
      if (text === "menu" || text === "menú" || text === "volver") {
        session.step = "menu";
        return {
          response: MENU_TEXT,
          sendPolicy: false,
          useAI: null,
        };
      }
      // Pasar a la IA para responder la consulta
      return {
        response: null,
        sendPolicy: false,
        useAI: "consulta",
      };

    default:
      session.step = "greeting";
      return handleFlow(userId, messageBody);
  }
}

/**
 * Guarda la clasificación de la IA en la sesión y avanza al paso de confirmación.
 */
function setPQRSDClassification(userId, classification) {
  const session = getSession(userId);
  session.data.pqrsdClassification = classification;
  session.step = "pqrsd_confirm";
}

function getSession_public(userId) {
  return getSession(userId);
}

function getUserData(userId) {
  const session = sessions.get(userId);
  return session ? session.data : null;
}

module.exports = {
  handleFlow,
  getUserData,
  setPQRSDClassification,
  getSession: getSession_public,
  POLICY_PDF_PATH,
  MENU_TEXT,
};
