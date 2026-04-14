const { MessageMedia } = require("whatsapp-web.js");
const { createWhatsAppClient } = require("./whatsapp");
const { getAIResponse, classifyPQRSD } = require("./ai");
const {
  handleFlow,
  getUserData,
  setPQRSDClassification,
  getSession,
  POLICY_PDF_PATH,
} = require("./flow");
const config = require("./config");

// Validar que la API key esté configurada
if (!config.groqApiKey || config.groqApiKey === "tu_api_key_aqui") {
  console.error(
    "❌ Falta configurar GROQ_API_KEY en el archivo .env\n" +
      "   Obtén tu API key gratis en: https://console.groq.com/keys"
  );
  process.exit(1);
}

console.log("🤖 Iniciando INFIBOT - ChatBot de WhatsApp con IA...\n");

const client = createWhatsAppClient(async (message) => {
  const chat = await message.getChat();

  try {
    await chat.sendStateTyping();

    const userId = message.from;
    console.log(`📩 Mensaje de ${userId}: ${message.body}`);

    const result = handleFlow(userId, message.body);

    // Enviar el PDF de política de datos si el flujo lo indica
    if (result.sendPolicy) {
      const policyPdf = MessageMedia.fromFilePath(POLICY_PDF_PATH);
      await chat.sendMessage(policyPdf, {
        caption: "📄 Política de Tratamiento de Datos Personales - INFIBAGUE",
      });
    }

    // Si el flujo necesita la IA para clasificar PQRSD
    if (result.useAI === "pqrsd") {
      const userData = getUserData(userId);
      const session = getSession(userId);

      try {
        const classification = await classifyPQRSD(session.data.pqrsdOriginal);
        setPQRSDClassification(userId, classification);

        const confirmMsg =
          "📋 *Resumen de tu solicitud:*\n\n" +
          `📌 *Tipo:* ${classification.tipo}\n` +
          `📝 *Asunto:* ${classification.asunto}\n` +
          `📄 *Resumen:* ${classification.resumen}\n\n` +
          `👤 *Solicitante:* ${userData.name}\n` +
          `📧 *Correo:* ${userData.email}\n` +
          `📱 *Teléfono:* ${userData.phone}\n\n` +
          "¿Los datos son correctos?\n\n" +
          "✅ *SI* → Confirmar y radicar\n" +
          "❌ *NO* → Corregir solicitud";

        await message.reply(confirmMsg);
        console.log(`📤 PQRSD clasificada para ${userId}: ${classification.tipo}`);
      } catch (error) {
        console.error("❌ Error al clasificar PQRSD:", error.message);
        // Volver al paso de descripción si falla la IA
        const session = getSession(userId);
        session.step = "pqrsd_describe";
        await message.reply(
          "Hubo un error al procesar tu solicitud. Por favor, intenta describirla de nuevo:"
        );
      }
      return;
    }

    // Si el flujo necesita la IA para responder una consulta
    if (result.useAI === "consulta") {
      const userData = getUserData(userId);
      const contextMessage = `[El ciudadano se llama ${userData.name}] ${message.body}`;

      const response = await getAIResponse(contextMessage);
      await message.reply(
        response + "\n\n_Escribe *MENU* para volver al menú principal._"
      );
      console.log(`📤 Consulta IA enviada a ${userId}`);
      return;
    }

    // Respuesta directa del flujo
    if (result.response) {
      await message.reply(result.response);
      console.log(`📤 Respuesta enviada a ${userId}`);
    }
  } catch (error) {
    console.error("❌ Error al procesar mensaje:", error.message);
    await message.reply(
      "Lo siento, hubo un error al procesar tu mensaje. Intenta de nuevo."
    );
  }
});

client.initialize();
