const Groq = require("groq-sdk");
const config = require("./config");

const groq = new Groq({ apiKey: config.groqApiKey });

/**
 * Responde consultas generales sobre INFIBAGUE.
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
 * Clasifica y resume un PQR dado el área, tipo y descripción del ciudadano.
 * Retorna { resumen: string }
 */
async function classifyPQR(area, tipo, description) {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: config.pqrPrompt },
      {
        role: "user",
        content:
          `Área: ${area}\n` +
          `Tipo: ${tipo}\n` +
          `Descripción del ciudadano: ${description}`,
      },
    ],
    model: config.model,
    temperature: 0.3,
    max_completion_tokens: 200,
    response_format: { type: "json_object" },
  });

  const text = chatCompletion.choices[0].message.content;
  return JSON.parse(text);
}

module.exports = { getAIResponse, classifyPQR };
