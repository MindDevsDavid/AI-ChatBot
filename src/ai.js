const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("./config");

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: config.systemPrompt,
});

/**
 * Envía un mensaje a Gemini y retorna la respuesta.
 * @param {string} userMessage - Mensaje del usuario
 * @returns {Promise<string>} Respuesta de la IA
 */
async function getAIResponse(userMessage) {
  const result = await model.generateContent(userMessage);
  let text = result.response.text();

  // Limitar longitud de respuesta
  if (text.length > config.maxResponseLength) {
    text = text.substring(0, config.maxResponseLength) + "...";
  }

  return text;
}

module.exports = { getAIResponse };
