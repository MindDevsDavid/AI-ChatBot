# INFIBAGUE - ChatBot IA para WhatsApp

Bot de WhatsApp que responde automáticamente los mensajes de los ciudadanos usando inteligencia artificial, actuando como asistente virtual oficial de INFIBAGUE.

## Stack Tecnológico

- **Node.js** - Runtime de JavaScript
- **whatsapp-web.js** - Conexión a WhatsApp Web
- **Groq API** - Proveedor de IA (modelo Llama 3.3 70B)
- **dotenv** - Manejo de variables de entorno

## Requisitos Previos

- [Node.js](https://nodejs.org/) v18 o superior
- Una cuenta gratuita en [Groq](https://console.groq.com/) para obtener una API key
- WhatsApp activo en tu teléfono

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/MindDevsDavid/AI-ChatBot.git
cd AI-ChatBot
```

2. Instala las dependencias:

```bash
npm install
```

3. Configura tu API key de Groq:

   - Crea una cuenta en [console.groq.com](https://console.groq.com/)
   - Genera una API key en [console.groq.com/keys](https://console.groq.com/keys)
   - Abre el archivo `.env` y reemplaza `tu_api_key_aqui` con tu key:

```
GROQ_API_KEY=tu_api_key_aqui
```

## Uso

1. Inicia el bot:

```bash
npm start
```

2. Escanea el código QR que aparece en la terminal con WhatsApp:
   - Abre WhatsApp en tu teléfono
   - Ve a **Configuración > Dispositivos vinculados > Vincular dispositivo**
   - Escanea el código QR

3. El bot comenzará a responder automáticamente los mensajes que recibas.

## Estructura del Proyecto

```
ChatBot/
├── src/
│   ├── index.js       # Punto de entrada, inicializa el bot
│   ├── whatsapp.js    # Cliente de WhatsApp y manejo de eventos
│   ├── ai.js          # Integración con Groq API
│   └── config.js      # System prompt y configuración
├── .env               # Variables de entorno (API key)
├── .gitignore
├── package.json
└── README.me
```

## Personalización

Puedes modificar el comportamiento de la IA editando el `systemPrompt` en `src/config.js`. Ahí defines:

- Sobre qué temas responde el asistente
- El tono y estilo de las respuestas
- La información específica que debe conocer
- Qué hacer cuando le preguntan algo fuera de su ámbito

## Filtros Incluidos

- Ignora mensajes de **grupos** (solo responde en chats privados)
- Ignora **mensajes propios**
- Ignora **estados y broadcasts**
- Ignora mensajes sin texto (imágenes, stickers, audios)
- Muestra indicador de "escribiendo..." mientras procesa

## Autor

David Gutiérrez - [@MindDevsDavid](https://github.com/MindDevsDavid)
