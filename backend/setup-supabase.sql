-- ============================================================
-- CONFIGURACIÓN DE LA BASE DE DATOS EN SUPABASE
-- ============================================================
-- Pasos:
-- 1. Entrá a tu proyecto en https://supabase.com
-- 2. Andá a la sección "SQL Editor" (icono de base de datos)
-- 3. Pegá TODO este archivo y apretá "Run"
-- ============================================================

-- 1) Activar la extensión de vectores (para búsqueda por significado)
create extension if not exists vector;

-- 2) Tabla donde se guardan los fragmentos de los documentos
create table if not exists documentos (
  id bigserial primary key,
  contenido text,              -- el texto del fragmento
  fuente text,                 -- de qué documento viene (ej: "Estatuto")
  metadata jsonb,              -- datos extra (artículo, página, etc.)
  embedding vector(384),       -- la "huella" matemática del texto
  created_at timestamp default now()
);

-- 3) Función de búsqueda por similitud
--    (devuelve los fragmentos más parecidos a la pregunta)
create or replace function buscar_documentos (
  query_embedding vector(384),
  match_count int default 5
)
returns table (
  id bigint,
  contenido text,
  fuente text,
  metadata jsonb,
  similitud float
)
language sql stable
as $$
  select
    documentos.id,
    documentos.contenido,
    documentos.fuente,
    documentos.metadata,
    1 - (documentos.embedding <=> query_embedding) as similitud
  from documentos
  order by documentos.embedding <=> query_embedding
  limit match_count;
$$;

-- 4) Índice para que la búsqueda sea rápida
create index if not exists documentos_embedding_idx
  on documentos
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- 5) Tabla para guardar las consultas de los afiliados (opcional)
--    Sirve para tener un registro además del email.
-- ============================================================
create table if not exists consultas (
  id bigserial primary key,
  nombre text,
  seccional text,
  lugar_trabajo text,
  osfa text,
  telefono text,
  email text,
  consulta text,
  created_at timestamp default now()
);

-- ============================================================
