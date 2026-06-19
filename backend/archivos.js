// ============================================================
// MÓDULO DE PROCESAMIENTO DE ARCHIVOS
// ------------------------------------------------------------
// Extrae el texto de lo que el afiliado sube al chat:
//  - PDF        → extrae texto
//  - Word       → extrae texto
//  - Imágenes   → OCR (lee el texto de la foto)
//  - Audio      → transcribe con Whisper (vía Groq)
// ============================================================

import { createRequire } from 'module';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import Groq from 'groq-sdk';
import fs from 'fs';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- PDF ---
async function procesarPDF(buffer) {
  const data = await pdfParse(buffer);
  return data.text.trim();
}

// --- Word (.docx) ---
async function procesarWord(buffer) {
  const resultado = await mammoth.extractRawText({ buffer });
  return resultado.value.trim();
}

// --- Imagen (OCR en español) ---
async function procesarImagen(buffer) {
  const worker = await createWorker('spa');
  const { data } = await worker.recognize(buffer);
  await worker.terminate();
  return data.text.trim();
}

// --- Audio (transcripción con Whisper vía Groq) ---
async function procesarAudio(rutaArchivo) {
  const transcripcion = await groq.audio.transcriptions.create({
    file: fs.createReadStream(rutaArchivo),
    model: 'whisper-large-v3',
    language: 'es',
  });
  return transcripcion.text.trim();
}

// --- Función principal: decide según el tipo de archivo ---
export async function procesarArchivo(archivo) {
  const { mimetype, buffer, path: rutaArchivo, originalname } = archivo;

  // Audio
  if (mimetype.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|webm)$/i.test(originalname)) {
    const texto = await procesarAudio(rutaArchivo);
    return { tipo: 'audio', texto, nombre: originalname };
  }

  // Imagen
  if (mimetype.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(originalname)) {
    const texto = await procesarImagen(buffer || fs.readFileSync(rutaArchivo));
    return { tipo: 'imagen', texto, nombre: originalname };
  }

  // PDF
  if (mimetype === 'application/pdf' || /\.pdf$/i.test(originalname)) {
    const texto = await procesarPDF(buffer || fs.readFileSync(rutaArchivo));
    return { tipo: 'pdf', texto, nombre: originalname };
  }

  // Word
  if (/\.docx?$/i.test(originalname) || mimetype.includes('word') || mimetype.includes('officedocument')) {
    const texto = await procesarWord(buffer || fs.readFileSync(rutaArchivo));
    return { tipo: 'word', texto, nombre: originalname };
  }

  throw new Error('Tipo de archivo no soportado: ' + originalname);
}
