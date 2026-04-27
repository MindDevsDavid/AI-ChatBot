const { MessageMedia } = require("whatsapp-web.js");
const { createWhatsAppClient } = require("./whatsapp");
const { getAIResponse, classifyPQR } = require("./ai");
const {
  handleFlow,
  getUserData,
  getPQRData,
  setPQRClassification,
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

console.log("🤖 Iniciando INFIBOT - Asistente Virtual de INFIBAGUÉ...\n");

const client = createWhatsAppClient(async (message) => {
  const chat = await message.getChat();

  try {
    await chat.sendStateTyping();

    const userId = message.from;
    console.log(`📩 Mensaje de ${userId}: ${message.body}`);

    const result = handleFlow(userId, message.body);

    // Enviar PDF de política de datos si el flujo lo indica
    if (result.sendPolicy) {
      const policyPdf = MessageMedia.fromFilePath(POLICY_PDF_PATH);
      await chat.sendMessage(policyPdf, {
        caption: "📄 Política de Tratamiento de Datos Personales - INFIBAGUÉ",
      });
    }

    // ─── RAMA: Clasificación PQR con IA ─────────────────────────
    if (result.useAI === "pqr_classify") {
      const session = getSession(userId);
      const userData = getUserData(userId);
      const pqr = getPQRData(userId);

      try {
        await chat.sendStateTyping();
        const classification = await classifyPQR(
          pqr.area,
          pqr.type,
          pqr.description
        );
        setPQRClassification(userId, classification);

        await message.reply(
          "📋 *Resumen de tu PQR:*\n\n" +
            `🏢 *Área:* ${pqr.area}\n` +
            `📌 *Tipo:* ${pqr.type}\n` +
            `📝 *Resumen:* ${classification.resumen}\n\n` +
            `👤 *Solicitante:* ${userData.name}\n` +
            `📧 *Correo:* ${userData.email}\n` +
            `📱 *Teléfono:* ${userData.phone}\n\n` +
            "¿Los datos son correctos?\n\n" +
            "✅ *SI* → Confirmar y radicar\n" +
            "❌ *NO* → Corregir solicitud"
        );
        console.log(`📤 PQR clasificado para ${userId}`);
      } catch (error) {
        console.error("❌ Error al clasificar PQR:", error.message);
        session.step = "pqr_describe";
        await message.reply(
          "Hubo un error al procesar tu solicitud. Por favor, descríbela de nuevo:"
        );
      }
      return;
    }

    // ─── RAMA: Consulta libre con IA ────────────────────────────
    if (result.useAI === "consulta") {
      const userData = getUserData(userId);

      try {
        await chat.sendStateTyping();
        const contextMessage = `[El ciudadano se llama ${userData.name}] ${message.body}`;
        const response = await getAIResponse(contextMessage);

        await message.reply(
          response + "\n\n_Escribe *MENU* para volver al menú principal._"
        );
        console.log(`📤 Consulta IA enviada a ${userId}`);
      } catch (error) {
        console.error("❌ Error en consulta IA:", error.message);
        await message.reply(
          "No pude procesar tu consulta en este momento. " +
            "Por favor, intenta reformular tu pregunta o escribe *MENU* para volver al menú."
        );
      }
      return;
    }

    // ─── Respuesta directa del flujo ────────────────────────────
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
