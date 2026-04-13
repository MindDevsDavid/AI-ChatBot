const { createWhatsAppClient } = require("./whatsapp");
const { getAIResponse } = require("./ai");
const { handleFlow, isFlowCompleted, getUserData } = require("./flow");
const config = require("./config");

// Validar que la API key esté configurada
if (!config.groqApiKey || config.groqApiKey === "tu_api_key_aqui") {
  console.error(
    "❌ Falta configurar GROQ_API_KEY en el archivo .env\n" +
      "   Obtén tu API key gratis en: https://console.groq.com/keys"
  );
  process.exit(1);
}

console.log("🤖 Iniciando ChatBot de WhatsApp con IA...\n");

const client = createWhatsAppClient(async (message) => {
  const chat = await message.getChat();

  try {
    await chat.sendStateTyping();

    const userId = message.from;
    console.log(`📩 Mensaje de ${userId}: ${message.body}`);

    // Si el usuario NO ha completado el formulario, manejar el flujo
    if (!isFlowCompleted(userId)) {
      const result = handleFlow(userId, message.body);

      if (result.response) {
        await message.reply(result.response);
        console.log(`📤 Flujo enviado a ${userId}`);
        return;
      }
    }

    // Usuario ya registrado: enviar a la IA
    const userData = getUserData(userId);
    const contextMessage = `[El ciudadano se llama ${userData.name}] ${message.body}`;
    const response = await getAIResponse(contextMessage);

    await message.reply(response);
    console.log(`📤 Respuesta IA enviada a ${userId}`);
  } catch (error) {
    console.error("❌ Error al procesar mensaje:", error.message);
    await message.reply(
      "Lo siento, hubo un error al procesar tu mensaje. Intenta de nuevo."
    );
  }
});

client.initialize();
