// ============================================================
// MÓDULO DE EMBEDDINGS
// ------------------------------------------------------------
// Convierte texto en vectores (números) para poder buscar
// por significado. Usa un modelo que corre LOCAL y GRATIS,
// no necesita ninguna API key.
// La primera vez descarga el modelo (~90MB), después es instantáneo.
// ============================================================

import { pipeline } from '@xenova/transformers';

let extractor = null;

// Carga el modelo una sola vez (lazy loading)
async function getExtractor() {
  if (!extractor) {
    console.log('⏳ Cargando modelo de embeddings (solo la primera vez)...');
    extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
    console.log('✅ Modelo de embeddings listo.');
  }
  return extractor;
}

// Convierte un texto en un vector de 384 números
export async function generarEmbedding(texto) {
  const modelo = await getExtractor();
  const resultado = await modelo(texto, {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(resultado.data);
}
