// ============================================================
// MÓDULO DE VOZ (Text-to-Speech con ElevenLabs)
// ------------------------------------------------------------
// Convierte el texto de la respuesta del delegado en audio
// con una voz realista en español.
//
// La clave de ElevenLabs vive en el backend, nunca en el navegador.
// ============================================================

// Voz por defecto: "Sarah" funciona bien en español. Si configurás
// ELEVENLABS_VOICE_ID en el .env, se usa esa en su lugar.
const VOZ_DEFECTO = 'EXAVITQu4vr4xnSDxMaL';

export async function generarVoz(texto) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || VOZ_DEFECTO;

  if (!apiKey) {
    throw new Error('Falta ELEVENLABS_API_KEY en el .env');
  }

  // Limitamos el largo para no gastar la cuota de golpe en textos enormes
  const textoLimitado = texto.slice(0, 2500);

  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: textoLimitado,
        model_id: 'eleven_multilingual_v2', // soporta español
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
        },
      }),
    }
  );

  if (!resp.ok) {
    const detalle = await resp.text();
    console.error('Error de ElevenLabs:', resp.status, detalle);
    throw new Error('No se pudo generar la voz');
  }

  // Devolvemos el audio como buffer
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
