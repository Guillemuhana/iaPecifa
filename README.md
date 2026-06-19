# 🤖 Delegado Virtual PECIFA

Agente de IA que responde preguntas de los afiliados de PECIFA usando el Estatuto, el manual del delegado y demás documentos del sindicato.

**Stack:** React (frontend) + Node/Express (backend) + Supabase (base de datos) + Groq (IA). Todo con planes gratuitos.

---

## 📋 ¿Cómo funciona?

1. Cargás tus documentos (PDFs, textos) a una base de datos.
2. Cuando un afiliado pregunta algo, el sistema busca los fragmentos relevantes.
3. Le pasa esos fragmentos a la IA (Groq) para que responda con info real, citando artículos.

Esto se llama **RAG** y evita que la IA invente cosas.

---

## 🚀 INSTALACIÓN PASO A PASO

### Requisitos previos
- Tener instalado **Node.js** (versión 18 o superior): https://nodejs.org
- Una cuenta gratis en **Groq**: https://console.groq.com
- Una cuenta gratis en **Supabase**: https://supabase.com

---

### PASO 1 — Crear las cuentas y sacar las claves

**Groq (la IA):**
1. Entrá a https://console.groq.com y registrate.
2. Andá a "API Keys" → "Create API Key".
3. Copiá la clave (empieza con `gsk_...`).

**Supabase (la base de datos):**
1. Entrá a https://supabase.com y creá un proyecto nuevo (es gratis).
2. Esperá 2 minutos a que se cree.
3. Andá a "Project Settings" → "API".
4. Copiá dos cosas: el **Project URL** y la **service_role key** (la secreta, NO la anon).

---

### PASO 2 — Preparar la base de datos

1. En tu proyecto de Supabase, andá a "SQL Editor".
2. Abrí el archivo `backend/setup-supabase.sql` de este proyecto.
3. Copiá TODO su contenido, pegalo en el editor de Supabase y apretá "Run".
4. Listo, ya tenés las tablas creadas.

---

### PASO 3 — Configurar el backend

Abrí una terminal en VS Code y ejecutá:

```bash
cd backend
npm install
```

Después, copiá el archivo de configuración:
- Duplicá `backend/.env.example` y renombralo a `.env`
- Abrí el `.env` y completá con tus claves de Groq y Supabase.

---

### PASO 4 — Cargar tus documentos

1. Poné tus archivos (`.pdf` o `.txt`) en la carpeta `backend/data/`.
   (Ya viene el Estatuto cargado como ejemplo en `data/estatuto.txt`.)
2. Ejecutá:

```bash
npm run ingest
```

Esto procesa los documentos y los guarda en la base. La primera vez tarda un poco
porque descarga el modelo de embeddings (~90MB). Repetí este paso cada vez que
agregues documentos nuevos.

---

### PASO 5 — Encender el backend

```bash
npm start
```

Si todo anda, vas a ver: `✅ Servidor del Delegado Virtual PECIFA andando en http://localhost:3001`

**Dejá esta terminal abierta.**

---

### PASO 6 — Encender el frontend

Abrí OTRA terminal (sin cerrar la anterior):

```bash
cd frontend
npm install
npm run dev
```

Abrí el navegador en **http://localhost:5173** y ya podés chatear con el Delegado Virtual. 🎉

---

## 📂 Agregar más documentos después

1. Tirá los nuevos PDFs o textos en `backend/data/`
2. Corré `npm run ingest` de nuevo (desde la carpeta backend)
3. Listo, el agente ya sabe lo nuevo.

---

## 🌐 Cómo ponerlo online (producción)

Cuando quieras publicarlo para que lo usen los afiliados:

- **Frontend:** subilo gratis a [Vercel](https://vercel.com) o [Netlify](https://netlify.com).
- **Backend:** subilo gratis a [Render](https://render.com) o [Railway](https://railway.app).
- Acordate de poner las variables de entorno (`.env`) en cada plataforma.
- En el frontend, completá `VITE_API_URL` con la URL de tu backend desplegado.

---

## ⚠️ Notas importantes

- **Nunca subas el archivo `.env`** a internet ni a GitHub (ya está en el `.gitignore`).
- Los planes gratuitos tienen límites de uso. Para muchos afiliados a la vez, quizás
  necesites pasar a un plan pago más adelante.
- Para las noticias en vivo de PECIFA, más adelante se puede agregar un módulo que
  lea el RSS o la web de pecifa.org automáticamente.

---

## 🆘 Problemas comunes

**"No encuentra los documentos / responde que no sabe":**
→ Asegurate de haber corrido `npm run ingest` y que no dio error.

**"Error al conectar" en el chat:**
→ Verificá que el backend esté andando (Paso 5) en otra terminal.

**"Error de Supabase":**
→ Revisá que las claves en el `.env` estén bien y que corriste el SQL del Paso 2.

---

## 📧 SISTEMA DE CONSULTAS POR EMAIL (nuevo)

El delegado virtual puede capturar consultas y avisar por email a PECIFA.

**Cómo funciona:**
- Para consultas simples, el delegado pide solo nombre y seccional para personalizar el trato.
- Para temas que necesitan atención humana (beneficios a tramitar, reclamos, problemas), el delegado ofrece registrar la consulta y aparece un formulario que pide: nombre completo, seccional, lugar de trabajo, N° de OSFA, teléfono y email.
- Al enviarlo, llega un email a PECIFA con todos los datos y la consulta.

**Configuración (Resend, gratis):**
1. Creá una cuenta en https://resend.com (gratis, 3000 emails/mes).
2. Andá a "API Keys" → "Create" y copiá la clave.
3. En tu archivo `.env` completá:
   - `RESEND_API_KEY` con esa clave
   - `EMAIL_PECIFA` con el email de PECIFA donde querés recibir las consultas
   - `EMAIL_REMITENTE` dejalo como `onboarding@resend.dev` por ahora
4. (Opcional) Para que los emails salgan desde @pecifa.org, verificá tu dominio en Resend.

**Importante:** al principio, con el remitente de prueba de Resend, los emails solo pueden
enviarse a la dirección con la que te registraste en Resend. Para mandar a cualquier email
(como uno de PECIFA), necesitás verificar un dominio propio en Resend. Es gratis y se hace
una sola vez.

---

## 📎 ENVÍO DE ARCHIVOS, FOTOS Y AUDIOS (nuevo)

El afiliado puede mandarle al delegado virtual:
- **Documentos** (PDF, Word) → el agente los lee y responde sobre el contenido.
- **Fotos / imágenes** (recibos, credenciales) → lee el texto con OCR.
- **Notas de voz** → las transcribe automáticamente (con Whisper, vía Groq) y responde.

**Cómo se usa:** en la barra de abajo del chat hay un botón 📎 (adjuntar documento o foto)
y un botón 🎤 (grabar nota de voz). El afiliado adjunta o graba, escribe su pregunta
(opcional) y envía.

**No necesita configuración extra:** usa la misma clave de Groq que ya tenés.
- La transcripción de audio usa el plan gratis de Groq.
- El OCR de imágenes corre local (gratis, con tesseract.js).
- La primera vez que se procesa una imagen, descarga el modelo de OCR en español (una sola vez).

**Límites:** máximo 25 MB por archivo. Para audios muy largos o fotos de mala calidad,
la lectura puede no ser perfecta; en esos casos siempre queda la opción de dejar la
consulta para un delegado humano.

---

## 🏢 ENRUTAMIENTO POR SECCIONAL (las 19 seccionales)

El delegado virtual puede dirigir cada consulta a la seccional correcta y darle
al afiliado los datos de contacto de su seccional.

**Cómo completar los datos (archivo `backend/seccionales.js`):**

1. Abrí el archivo `backend/seccionales.js`.
2. Vas a ver una lista con todas las seccionales. Cada una tiene estos campos:
   - `email`: el correo de esa seccional (donde llegan sus consultas)
   - `telefono`: teléfono de contacto
   - `direccion`: dirección de la sede
   - `horario`: horario de atención
   - `gremialistas`: nombres de los gremialistas (ej: "Juan Pérez (Secretario General)")
3. Completá entre las comillas `''` lo que tengas de cada una. Lo que no tengas, dejalo vacío.
4. Guardá el archivo y reiniciá el backend (`npm start`).

**Cómo funciona una vez cargado:**
- Cuando un afiliado deja una consulta y elige su seccional en el formulario, el email
  va directo a esa seccional. Si esa seccional no tiene email cargado, va al general
  (`asistentegremial@pecifa.org`).
- Si querés que TODAS las consultas lleguen también con copia a Nacional, en
  `seccionales.js` está la opción `COPIA_A_NACIONAL = true` (ya viene activada).
- Si un afiliado pregunta por su seccional en el chat (ej: "¿cómo contacto la seccional
  Mendoza?"), el delegado le responde con los datos de contacto que tengas cargados.

---

## 🔊 VOZ REALISTA DEL DELEGADO (nuevo)

Cada respuesta del delegado tiene un botón 🔊 "Escuchar" para que el afiliado pueda
oír la respuesta con una voz realista en español (útil para personas con dificultad
visual o que prefieren escuchar).

**Configuración (ElevenLabs, tier gratis):**
1. Creá una cuenta gratis en https://elevenlabs.io
2. Andá a tu perfil → "API Keys" → copiá la clave.
3. En tu archivo `.env` completá:
   - `ELEVENLABS_API_KEY` con esa clave
   - `ELEVENLABS_VOICE_ID` dejalo vacío para usar la voz por defecto, o pegá el ID
     de otra voz que elijas desde la Voice Library de ElevenLabs.

**Cómo funciona:** cuando el afiliado toca 🔊, el backend genera el audio con
ElevenLabs y el navegador lo reproduce. Tocar de nuevo lo pausa.

**Límites del plan gratis:** ElevenLabs da unos 10.000 caracteres por mes gratis
(alcanza para probar y uso bajo). Si crece el uso, hay planes pagos. El sistema
limita cada respuesta a 2500 caracteres para cuidar la cuota.

**Si no configurás ElevenLabs:** el chat funciona igual, solo que el botón de voz
dará error al tocarlo. Todo lo demás anda normal.
