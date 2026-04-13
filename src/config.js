require("dotenv").config();

const config = {
  // API key de Gemini (se lee desde .env)
  geminiApiKey: process.env.GEMINI_API_KEY,

  // System prompt: aquí defines de qué tema sabe tu asistente.
  // Modifica este texto para personalizar el comportamiento de la IA.
  systemPrompt: `Eres un asistente virtual especializado en Ingeniería de Sistemas.
Respondes de forma clara, concisa y amigable.
Solo respondes preguntas relacionadas con tu área de especialización.
Si te preguntan algo fuera de tu tema, responde amablemente que no puedes ayudar con eso.
Responde siempre en español.
Mantén tus respuestas cortas (máximo 3 párrafos).`,

  // Número máximo de caracteres en la respuesta
  maxResponseLength: 1500,
};

module.exports = config;
