/**
 * Maneja el flujo de conversación por usuario.
 * Estados: greeting → wait_policy → ask_name → ask_email → ask_phone → completed
 */

const path = require("path");

// Almacena el estado de cada conversación en memoria
// Clave: número de WhatsApp, Valor: { step, data }
const sessions = new Map();

// Ruta al PDF de política de datos
const POLICY_PDF_PATH = path.join(__dirname, "..", "assets", "politica-datos.pdf");

// Validaciones simples
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
 * Procesa un mensaje según el estado actual del usuario en el flujo.
 * @param {string} userId - ID del usuario de WhatsApp
 * @param {string} messageBody - Texto del mensaje
 * @returns {{ response: string, sendPolicy: boolean, completed: boolean }}
 */
function handleFlow(userId, messageBody) {
  const session = getSession(userId);
  const text = messageBody.trim().toLowerCase();

  switch (session.step) {
    case "greeting":
      session.step = "wait_policy";
      return {
        response:
          "👋 ¡Hola! Bienvenido/a al canal de atención virtual de *INFIBAGUE*.\n\n" +
          "Soy el asistente virtual y estoy aquí para ayudarte con información sobre nuestros servicios.\n\n" +
          "📄 Antes de continuar, te comparto nuestra *Política de Tratamiento de Datos Personales*. " +
          "Por favor léela y responde:\n\n" +
          "✅ *SI* → Acepto la política\n" +
          "❌ *NO* → No acepto",
        sendPolicy: true,
        completed: false,
      };

    case "wait_policy":
      if (text === "si" || text === "sí" || text === "acepto") {
        session.step = "ask_name";
        session.data.policyAccepted = true;
        session.data.policyAcceptedAt = new Date().toISOString();
        return {
          response:
            "✅ ¡Gracias por aceptar nuestra política de datos!\n\n" +
            "Ahora necesito algunos datos para brindarte una mejor atención.\n\n" +
            "📝 Por favor, escribe tu *nombre completo*:",
          sendPolicy: false,
          completed: false,
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
          completed: false,
        };
      }

      return {
        response:
          "Por favor, responde *SI* para aceptar la política de datos o *NO* si no la aceptas.",
        sendPolicy: false,
        completed: false,
      };

    case "rejected":
      // Si escribe de nuevo, reiniciar el flujo
      session.step = "greeting";
      return handleFlow(userId, messageBody);

    case "ask_name":
      if (messageBody.trim().length < 3) {
        return {
          response: "Por favor, ingresa un nombre válido (mínimo 3 caracteres):",
          sendPolicy: false,
          completed: false,
        };
      }
      session.data.name = messageBody.trim();
      session.step = "ask_email";
      return {
        response:
          `Gracias, *${session.data.name}*. 😊\n\n` +
          "📧 Ahora, por favor escribe tu *correo electrónico*:",
        sendPolicy: false,
        completed: false,
      };

    case "ask_email":
      if (!isValidEmail(messageBody)) {
        return {
          response:
            "Ese correo no parece válido. Por favor, ingresa un correo electrónico válido.\n" +
            "Ejemplo: nombre@correo.com",
          sendPolicy: false,
          completed: false,
        };
      }
      session.data.email = messageBody.trim().toLowerCase();
      session.step = "ask_phone";
      return {
        response: "📱 Por último, escribe tu *número de teléfono*:",
        sendPolicy: false,
        completed: false,
      };

    case "ask_phone":
      if (!isValidPhone(messageBody)) {
        return {
          response:
            "Ese número no parece válido. Por favor, ingresa un número de teléfono válido.\n" +
            "Ejemplo: 3001234567",
          sendPolicy: false,
          completed: false,
        };
      }
      session.data.phone = messageBody.trim();
      session.step = "completed";

      console.log("📋 Registro completado:", session.data);

      return {
        response:
          "✅ ¡Registro completado! Estos son tus datos:\n\n" +
          `👤 *Nombre:* ${session.data.name}\n` +
          `📧 *Correo:* ${session.data.email}\n` +
          `📱 *Teléfono:* ${session.data.phone}\n\n` +
          "Ahora puedes hacerme cualquier pregunta sobre los servicios de *INFIBAGUE*. ¿En qué te puedo ayudar?",
        sendPolicy: false,
        completed: true,
      };

    case "completed":
      return { response: null, sendPolicy: false, completed: true };

    default:
      session.step = "greeting";
      return handleFlow(userId, messageBody);
  }
}

function isFlowCompleted(userId) {
  const session = sessions.get(userId);
  return session && session.step === "completed";
}

function getUserData(userId) {
  const session = sessions.get(userId);
  return session ? session.data : null;
}

module.exports = { handleFlow, isFlowCompleted, getUserData, POLICY_PDF_PATH };
