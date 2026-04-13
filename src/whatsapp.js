const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

/**
 * Crea y configura el cliente de WhatsApp.
 * @param {function(import('whatsapp-web.js').Message): Promise<void>} onMessage - Callback cuando llega un mensaje
 * @returns {Client} Cliente de WhatsApp
 */
function createWhatsAppClient(onMessage) {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  // Mostrar QR en la terminal para vincular WhatsApp
  client.on("qr", (qr) => {
    console.log("\n📱 Escanea este código QR con WhatsApp:\n");
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    console.log("✅ Bot de WhatsApp conectado y listo!\n");
  });

  client.on("authenticated", () => {
    console.log("🔐 Autenticación exitosa.");
  });

  client.on("auth_failure", (msg) => {
    console.error("❌ Error de autenticación:", msg);
  });

  client.on("disconnected", (reason) => {
    console.log("⚠️  Bot desconectado:", reason);
  });

  // Escuchar mensajes entrantes
  client.on("message", async (message) => {
    // Ignorar mensajes de grupos
    if (message.from.includes("@g.us")) return;

    // Ignorar mensajes de estado/broadcast
    if (message.from === "status@broadcast") return;

    // Ignorar mensajes propios
    if (message.fromMe) return;

    // Ignorar mensajes sin texto (imágenes, stickers, etc.)
    if (!message.body || message.body.trim() === "") return;

    await onMessage(message);
  });

  return client;
}

module.exports = { createWhatsAppClient };
