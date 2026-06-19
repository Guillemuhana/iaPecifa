// ============================================================
// MÓDULO DE EMBEDDINGS
// ------------------------------------------------------------
// Convierte texto en vectores (384 dims) con el modelo
// all-MiniLM-L6-v2. Se usa para buscar por significado.
//
// Tiene DOS estrategias, según el entorno:
//
//  - PRODUCCIÓN (serverless, ej. Vercel): usa la API de
//    Hugging Face. No descarga el modelo de 90 MB, así que
//    funciona en funciones serverless sin timeouts. Se activa
//    automáticamente si existe la variable HF_API_KEY.
//
//  - DESARROLLO / INGESTA local: corre el modelo local con
//    @xenova/transformers (sin API key, offline).
//
// Es EL MISMO modelo en ambos casos, por lo que los vectores
// son compatibles y NO hace falta re-ingestar los documentos.
// ============================================================

const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// --- Normaliza un vector (longitud 1). Mantiene consistencia con el modelo local. ---
function normalizar(vec) {
  const norma = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / norma);
}

// --- Estrategia API: Hugging Face Inference ---
async function embeddingViaAPI(texto) {
  const resp = await fetch(HF_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    // wait_for_model evita el 503 mientras el modelo "despierta".
    body: JSON.stringify({ inputs: texto, options: { wait_for_model: true } }),
  });

  if (!resp.ok) {
    const detalle = await resp.text();
    throw new Error(`Hugging Face respondió ${resp.status}: ${detalle}`);
  }

  let data = await resp.json();

  // Para sentence-transformers la API suele devolver el vector de la
  // oración (array plano de 384). Si devolviera embeddings por token
  // (matriz), hacemos mean-pooling para obtener un único vector.
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const dims = data[0].length;
    const pooled = new Array(dims).fill(0);
    for (const fila of data) for (let i = 0; i < dims; i++) pooled[i] += fila[i];
    for (let i = 0; i < dims; i++) pooled[i] /= data.length;
    data = pooled;
  }

  return normalizar(data);
}

// --- Estrategia local: @xenova/transformers (lazy, una sola vez) ---
let extractorLocalPromise = null;
async function embeddingLocal(texto) {
  if (!extractorLocalPromise) {
    // Import dinámico: en producción (con HF_API_KEY) este paquete pesado
    // ni siquiera se carga.
    const { pipeline } = await import('@xenova/transformers');
    console.log('⏳ Cargando modelo de embeddings local (solo la primera vez)...');
    extractorLocalPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  const modelo = await extractorLocalPromise;
  const resultado = await modelo(texto, { pooling: 'mean', normalize: true });
  return Array.from(resultado.data);
}

// --- API pública: convierte un texto en un vector de 384 números ---
export async function generarEmbedding(texto) {
  if (HF_API_KEY) return embeddingViaAPI(texto);
  return embeddingLocal(texto);
}
