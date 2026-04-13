/**
 * Maneja el flujo de conversación por usuario.
 * Estados: greeting → ask_name → ask_email → ask_phone → completed
 */

// Almacena el estado de cada conversación en memoria
// Clave: número de WhatsApp, Valor: { step, data }
const sessions = new Map();

// Validaciones simples
function isValidEmail(text) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

function isValidPhone(text) {
  // Acepta números con o sin espacios, guiones, paréntesis o +
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
 * @returns {{ response: string, completed: boolean }}
 */
function handleFlow(userId, messageBody) {
  const session = getSession(userId);
  const text = messageBody.trim();

  switch (session.step) {
    case "greeting":
      session.step = "ask_name";
      return {
        response:
          "👋 ¡Hola! Bienvenido/a al canal de atención virtual de *INFIBAGUE*.\n\n" +
          "Soy el asistente virtual y estoy aquí para ayudarte con información sobre nuestros servicios.\n\n" +
          "Antes de comenzar, necesito algunos datos para brindarte una mejor atención.\n\n" +
          "📝 Por favor, escribe tu *nombre completo*:",
        completed: false,
      };

    case "ask_name":
      if (text.length < 3) {
        return {
          response: "Por favor, ingresa un nombre válido (mínimo 3 caracteres):",
          completed: false,
        };
      }
      session.data.name = text;
      session.step = "ask_email";
      return {
        response:
          `Gracias, *${session.data.name}*. 😊\n\n` +
          "📧 Ahora, por favor escribe tu *correo electrónico*:",
        completed: false,
      };

    case "ask_email":
      if (!isValidEmail(text)) {
        return {
          response:
            "Ese correo no parece válido. Por favor, ingresa un correo electrónico válido.\n" +
            "Ejemplo: nombre@correo.com",
          completed: false,
        };
      }
      session.data.email = text.trim().toLowerCase();
      session.step = "ask_phone";
      return {
        response: "📱 Por último, escribe tu *número de teléfono*:",
        completed: false,
      };

    case "ask_phone":
      if (!isValidPhone(text)) {
        return {
          response:
            "Ese número no parece válido. Por favor, ingresa un número de teléfono válido.\n" +
            "Ejemplo: 3001234567",
          completed: false,
        };
      }
      session.data.phone = text.trim();
      session.step = "completed";

      console.log("📋 Registro completado:", session.data);

      return {
        response:
          "✅ ¡Registro completado! Estos son tus datos:\n\n" +
          `👤 *Nombre:* ${session.data.name}\n` +
          `📧 *Correo:* ${session.data.email}\n` +
          `📱 *Teléfono:* ${session.data.phone}\n\n` +
          "Ahora puedes hacerme cualquier pregunta sobre los servicios de *INFIBAGUE*. ¿En qué te puedo ayudar?",
        completed: true,
      };

    case "completed":
      // El usuario ya completó el formulario, pasar a la IA
      return { response: null, completed: true };

    default:
      session.step = "greeting";
      return handleFlow(userId, messageBody);
  }
}

/**
 * Verifica si el usuario ya completó el formulario.
 */
function isFlowCompleted(userId) {
  const session = sessions.get(userId);
  return session && session.step === "completed";
}

/**
 * Obtiene los datos del usuario registrado.
 */
function getUserData(userId) {
  const session = sessions.get(userId);
  return session ? session.data : null;
}

module.exports = { handleFlow, isFlowCompleted, getUserData };
