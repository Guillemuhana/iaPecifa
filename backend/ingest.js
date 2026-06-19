// ============================================================
// SCRIPT DE CARGA DE DOCUMENTOS (INGEST)
// ------------------------------------------------------------
// Lee los archivos de la carpeta "data/", los trocea en
// fragmentos, genera sus embeddings y los guarda en Supabase.
//
// CÓMO USARLO:
//   1. Poné tus archivos (.txt o .pdf) en la carpeta backend/data/
//   2. Ejecutá: npm run ingest
//
// Volvé a correrlo cada vez que agregues documentos nuevos.
// ============================================================

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generarEmbedding } from './embeddings.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Trocea el texto en fragmentos de ~500 palabras con solapamiento
function trocear(texto, tamano = 500, solapamiento = 50) {
  const palabras = texto.split(/\s+/);
  const fragmentos = [];
  for (let i = 0; i < palabras.length; i += tamano - solapamiento) {
    const fragmento = palabras.slice(i, i + tamano).join(' ').trim();
    if (fragmento.length > 30) fragmentos.push(fragmento);
  }
  return fragmentos;
}

// Lee un archivo según su tipo
async function leerArchivo(rutaCompleta) {
  const ext = path.extname(rutaCompleta).toLowerCase();
  if (ext === '.pdf') {
    const buffer = fs.readFileSync(rutaCompleta);
    const data = await pdfParse(buffer);
    return data.text;
  }
  // .txt, .md, etc.
  return fs.readFileSync(rutaCompleta, 'utf-8');
}

async function main() {
  console.log('🚀 Iniciando carga de documentos...\n');

  if (!fs.existsSync(DATA_DIR)) {
    console.error('❌ No existe la carpeta data/. Creala y poné tus archivos ahí.');
    process.exit(1);
  }

  const archivos = fs.readdirSync(DATA_DIR).filter(
    (f) => ['.txt', '.pdf', '.md'].includes(path.extname(f).toLowerCase())
  );

  if (archivos.length === 0) {
    console.error('❌ No hay archivos en data/. Poné .txt o .pdf y volvé a intentar.');
    process.exit(1);
  }

  console.log(`📂 Encontrados ${archivos.length} archivo(s): ${archivos.join(', ')}\n`);

  // Opcional: limpiar la tabla antes de recargar (descomentá si querés)
  // await supabase.from('documentos').delete().neq('id', 0);

  let totalFragmentos = 0;

  for (const archivo of archivos) {
    const ruta = path.join(DATA_DIR, archivo);
    const nombreFuente = path.basename(archivo, path.extname(archivo));
    console.log(`📄 Procesando: ${archivo}`);

    const texto = await leerArchivo(ruta);
    const fragmentos = trocear(texto);
    console.log(`   → ${fragmentos.length} fragmentos`);

    for (let i = 0; i < fragmentos.length; i++) {
      const fragmento = fragmentos[i];
      const embedding = await generarEmbedding(fragmento);

      const { error } = await supabase.from('documentos').insert({
        contenido: fragmento,
        fuente: nombreFuente,
        metadata: { archivo, fragmento_n: i + 1 },
        embedding,
      });

      if (error) {
        console.error(`   ⚠️ Error en fragmento ${i + 1}:`, error.message);
      } else {
        process.stdout.write(`   ✓ Fragmento ${i + 1}/${fragmentos.length}\r`);
      }
      totalFragmentos++;
    }
    console.log(`\n   ✅ ${archivo} cargado.\n`);
  }

  console.log(`🎉 Listo. Se cargaron ${totalFragmentos} fragmentos en total.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error general:', err);
  process.exit(1);
});
