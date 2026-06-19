// ============================================================
// SERVIDOR PRINCIPAL DEL AGENTE PECIFA
// ------------------------------------------------------------
// - Responde preguntas usando los documentos (RAG + Groq).
// - Actúa como un Delegado de PECIFA Nacional, amable y cálido.
// - Captura consultas: para temas simples pide nombre+seccional;
//   para temas que requieren atención humana toma todos los datos
//   y los envía por email a PECIFA.
//
// La API key de Groq vive ACÁ, nunca llega al navegador.
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { generarEmbedding } from './embeddings.js';
import { enviarConsulta } from './email.js';
import { procesarArchivo } from './archivos.js';
import { buscarSeccional, SECCIONALES } from './seccionales.js';
import { generarVoz } from './voz.js';
import multer from 'multer';
import fs from 'fs';
import os from 'os';

// Configuración de subida de archivos (guarda temporalmente en disco)
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 25 * 1024 * 1024 }, // máximo 25 MB por archivo
});

const app = express();
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas consultas. Esperá unos minutos.' },
});
app.use('/api/', limiter);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const MODELO = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// --- Personalidad e instrucciones del agente ---
const SYSTEM_PROMPT = `Sos un Delegado de PECIFA Nacional (Unión del Personal Civil de las Fuerzas Armadas de la República Argentina), atendiendo a los afiliados como lo haría un delegado de carne y hueso: con calidez, cercanía y compromiso.

TU IDENTIDAD:
- Te presentás como delegado de PECIFA Nacional. Hablás de "nosotros" y "nuestro sindicato" porque sos parte de PECIFA.
- Sos amable, paciente y tenés buena onda. Tratás a cada afiliado como a un compañero.
- Tu objetivo es que el afiliado se vaya con su duda resuelta y sintiéndose acompañado y respaldado por el sindicato.

CÓMO ATENDÉS:
- Saludás con cordialidad (ej: "¡Hola compañero/a! ¿En qué te puedo ayudar?").
- Hablás en español rioplatense, de vos, en tono claro y cercano, sin tecnicismos innecesarios.
- Mostrás interés genuino y empatía, sobre todo si el afiliado tiene un problema o reclamo.
- Si el afiliado te dice su nombre durante la charla, recordalo y usalo con naturalidad y cariño el resto de la conversación, como haría un delegado que lo atiende.

REGLAS DE PRECISIÓN (muy importantes):
- Basate ÚNICAMENTE en la información de CONTEXTO que te paso. No inventes datos ni artículos.
- Cuando cites el Estatuto, mencioná el número de artículo (ej: "como dice el Art. 17 de nuestro Estatuto...").
- Si no tenés la información en el contexto, sé honesto y cálido.
- Tratá toda la información como vigente y actual. NO menciones años pasados ni fechas viejas (como "2024") al hablar de beneficios, planes de afiliación, convenios o paritarias, salvo que el afiliado pregunte específicamente por una fecha. Hablá en presente.

MANEJO DE CONSULTAS QUE NECESITAN ATENCIÓN HUMANA:
- Si el afiliado plantea un tema que requiere gestión, seguimiento o atención personalizada (ej: un beneficio puntual que quiere tramitar, un reclamo, un problema laboral, un caso de obra social que no se resuelve con info general), ofrecele DEJAR SU CONSULTA REGISTRADA para que un delegado humano lo contacte.
- En esos casos, decile algo como: "Mirá, este tema conviene que lo vea un compañero delegado en persona. Si querés, dejame tus datos y registro tu consulta para que te contacten a la brevedad." Y AGREGÁ al final de tu mensaje, en una línea aparte, exactamente esta etiqueta: [TOMAR_DATOS]
- Esa etiqueta [TOMAR_DATOS] es una señal interna; el sistema la usa para mostrar el formulario. No la expliques ni la menciones.
- Para consultas simples que ya respondiste bien con la info, NO uses la etiqueta.`;

// --- Endpoint de chat ---
app.post('/api/chat', async (req, res) => {
  try {
    const { mensaje, historial = [], textoArchivo = '' } = req.body;

    if (!mensaje || typeof mensaje !== 'string') {
      return res.status(400).json({ error: 'Falta el mensaje.' });
    }

    // Si el afiliado adjuntó un archivo, su contenido se suma a la búsqueda y al contexto
    const consultaCompleta = textoArchivo
      ? `${mensaje}\n\n[Contenido del archivo que adjuntó el afiliado]:\n${textoArchivo}`
      : mensaje;

    const embeddingPregunta = await generarEmbedding(mensaje);

    const { data: documentos } = await supabase.rpc('buscar_documentos', {
      query_embedding: embeddingPregunta,
      match_count: 5,
    });

    const contexto =
      documentos && documentos.length > 0
        ? documentos.map((d) => `[Fuente: ${d.fuente}]\n${d.contenido}`).join('\n\n---\n\n')
        : 'No se encontró información específica en los documentos.';

    // Si el afiliado menciona una seccional, agregamos sus datos de contacto al contexto
    const seccionalMencionada = buscarSeccional(mensaje);
    let contextoSeccional = '';
    if (seccionalMencionada && (seccionalMencionada.email || seccionalMencionada.telefono || seccionalMencionada.direccion)) {
      contextoSeccional = `\n\n[DATOS DE CONTACTO DE LA SECCIONAL ${seccionalMencionada.nombre}]:\n` +
        `Sede: ${seccionalMencionada.sede}\n` +
        (seccionalMencionada.direccion ? `Dirección: ${seccionalMencionada.direccion}\n` : '') +
        (seccionalMencionada.telefono ? `Teléfono: ${seccionalMencionada.telefono}\n` : '') +
        (seccionalMencionada.email ? `Email: ${seccionalMencionada.email}\n` : '') +
        (seccionalMencionada.horario ? `Horario: ${seccionalMencionada.horario}\n` : '') +
        (seccionalMencionada.gremialistas ? `Gremialistas: ${seccionalMencionada.gremialistas}\n` : '');
    }

    const mensajes = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...historial.slice(-6),
      {
        role: 'user',
        content: `CONTEXTO DE LOS DOCUMENTOS DE PECIFA:\n${contexto}${contextoSeccional}\n\n---\n\nPREGUNTA DEL AFILIADO: ${consultaCompleta}`,
      },
    ];

    const completion = await groq.chat.completions.create({
      model: MODELO,
      messages: mensajes,
      temperature: 0.3,
      max_tokens: 1024,
    });

    let respuesta = completion.choices[0]?.message?.content || 'No pude generar una respuesta.';

    // Detectar si el agente decidió que hay que tomar los datos
    const tomarDatos = respuesta.includes('[TOMAR_DATOS]');
    respuesta = respuesta.replace('[TOMAR_DATOS]', '').trim();

    res.json({
      respuesta,
      tomarDatos,
      fuentes: documentos ? [...new Set(documentos.map((d) => d.fuente))] : [],
    });
  } catch (err) {
    console.error('Error en /api/chat:', err);
    res.status(500).json({ error: 'Hubo un problema al procesar tu consulta. Probá de nuevo.' });
  }
});

// --- Endpoint para registrar una consulta y mandar el email ---
app.post('/api/consulta', async (req, res) => {
  try {
    const { nombre, seccional, lugarTrabajo, osfa, telefono, email, consulta } = req.body;

    if (!nombre || !seccional || !consulta) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (nombre, seccional y consulta).' });
    }

    await enviarConsulta({ nombre, seccional, lugarTrabajo, osfa, telefono, email, consulta });

    // Opcional: guardar también en Supabase como registro (si existe la tabla)
    try {
      await supabase.from('consultas').insert({
        nombre, seccional, lugar_trabajo: lugarTrabajo, osfa, telefono, email, consulta,
      });
    } catch (e) { /* si no existe la tabla, lo ignoramos */ }

    res.json({ ok: true, mensaje: '¡Listo! Tu consulta quedó registrada. Un delegado te va a contactar a la brevedad.' });
  } catch (err) {
    console.error('Error en /api/consulta:', err);
    res.status(500).json({ error: 'No pudimos registrar la consulta. Probá de nuevo en un momento.' });
  }
});

// --- Endpoint para procesar archivos subidos (PDF, Word, imagen, audio) ---
app.post('/api/archivo', upload.single('archivo'), async (req, res) => {
  const rutaTemp = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No llegó ningún archivo.' });
    }

    // Extraer el texto del archivo según su tipo
    const resultado = await procesarArchivo(req.file);

    if (!resultado.texto || resultado.texto.length < 2) {
      return res.json({
        tipo: resultado.tipo,
        nombre: resultado.nombre,
        texto: '',
        aviso: 'No pude extraer texto de este archivo. Si es una foto, fijate que se lea bien, o probá contándome el contenido por chat.',
      });
    }

    res.json({
      tipo: resultado.tipo,
      nombre: resultado.nombre,
      texto: resultado.texto,
    });
  } catch (err) {
    console.error('Error en /api/archivo:', err);
    res.status(500).json({ error: 'No pude procesar el archivo. Probá con otro formato o contame por chat.' });
  } finally {
    // Borrar el archivo temporal
    if (rutaTemp && fs.existsSync(rutaTemp)) {
      fs.unlink(rutaTemp, () => {});
    }
  }
});

// --- Endpoint para obtener los datos de contacto de una seccional ---
app.get('/api/seccional/:nombre', (req, res) => {
  const seccional = buscarSeccional(req.params.nombre);
  if (!seccional) {
    return res.status(404).json({ error: 'No encontré esa seccional.' });
  }
  // Devolvemos solo los datos públicos de contacto
  res.json({
    nombre: seccional.nombre,
    sede: seccional.sede,
    email: seccional.email || null,
    telefono: seccional.telefono || null,
    direccion: seccional.direccion || null,
    horario: seccional.horario || null,
    gremialistas: seccional.gremialistas || null,
  });
});

// --- Endpoint que lista todas las seccionales (para el formulario) ---
app.get('/api/seccionales', (req, res) => {
  res.json(SECCIONALES.map((s) => ({ id: s.id, nombre: s.nombre, sede: s.sede })));
});

// --- Endpoint de voz: convierte texto en audio (TTS) ---
app.post('/api/voz', async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto || typeof texto !== 'string') {
      return res.status(400).json({ error: 'Falta el texto.' });
    }

    const audio = await generarVoz(texto);
    res.set('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (err) {
    console.error('Error en /api/voz:', err);
    res.status(500).json({ error: 'No se pudo generar la voz.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', modelo: MODELO });
});

const PORT = process.env.PORT || 3001;

// En Vercel (serverless) NO abrimos un puerto: exportamos la app como handler.
// En local/Render/Railway sí levantamos el servidor con app.listen.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n✅ Servidor del Delegado Virtual PECIFA andando en http://localhost:${PORT}`);
    console.log(`   Modelo: ${MODELO}\n`);
  });
}

export default app;
