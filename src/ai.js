const Groq = require("groq-sdk");
const config = require("./config");

const groq = new Groq({ apiKey: config.groqApiKey });

/**
 * Envía un mensaje a Groq y retorna la respuesta (consultas generales).
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

  if (text.length > config.maxResponseLength) {
    text = text.substring(0, config.maxResponseLength) + "...";
  }

  return text;
}

/**
 * Clasifica una PQRSD y genera un resumen estructurado.
 * Retorna un objeto JSON con: tipo, resumen, asunto.
 */
async function classifyPQRSD(userMessage) {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: config.pqrsdPrompt },
      { role: "user", content: userMessage },
    ],
    model: config.model,
    temperature: 0.3,
    max_completion_tokens: 300,
    response_format: { type: "json_object" },
  });

  const text = chatCompletion.choices[0].message.content;
  return JSON.parse(text);
}

module.exports = { getAIResponse, classifyPQRSD };
