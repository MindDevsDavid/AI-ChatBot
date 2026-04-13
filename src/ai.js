const Groq = require("groq-sdk");
const config = require("./config");

const groq = new Groq({ apiKey: config.groqApiKey });

/**
 * Envía un mensaje a Groq y retorna la respuesta.
 * @param {string} userMessage - Mensaje del usuario
 * @returns {Promise<string>} Respuesta de la IA
 */
async function getAIResponse(userMessage) {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: config.systemPrompt },
      { role: "user", content: userMessage },
    ],
    model: config.model,
    temperature: 0.7,
    max_completion_tokens: 512,
  });

  let text = chatCompletion.choices[0].message.content;

  // Limitar longitud de respuesta
  if (text.length > config.maxResponseLength) {
    text = text.substring(0, config.maxResponseLength) + "...";
  }

  return text;
}

module.exports = { getAIResponse };
