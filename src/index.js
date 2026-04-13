const { createWhatsAppClient } = require("./whatsapp");
const { getAIResponse } = require("./ai");
const config = require("./config");

// Validar que la API key esté configurada
if (!config.geminiApiKey || config.geminiApiKey === "tu_api_key_aqui") {
  console.error(
    "❌ Falta configurar GEMINI_API_KEY en el archivo .env\n" +
      "   Obtén tu API key gratis en: https://aistudio.google.com/apikey"
  );
  process.exit(1);
}

console.log("🤖 Iniciando ChatBot de WhatsApp con IA...\n");

const client = createWhatsAppClient(async (message) => {
  const chat = await message.getChat();

  try {
    // Mostrar indicador de "escribiendo..."
    await chat.sendStateTyping();

    console.log(`📩 Mensaje de ${message.from}: ${message.body}`);

    const response = await getAIResponse(message.body);

    await message.reply(response);

    console.log(`📤 Respuesta enviada a ${message.from}`);
  } catch (error) {
    console.error("❌ Error al procesar mensaje:", error.message);
    await message.reply(
      "Lo siento, hubo un error al procesar tu mensaje. Intenta de nuevo."
    );
  }
});

client.initialize();
