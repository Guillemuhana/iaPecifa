import { useState, useRef, useEffect } from 'react';
import FormularioConsulta from './FormularioConsulta.jsx';

const API_URL = import.meta.env.VITE_API_URL || '';

const SUGERENCIAS = [
  '¿Cuánto es la cuota sindical?',
  '¿Cómo me afilio a PECIFA?',
  '¿Cuáles son mis derechos como afiliado?',
  '¿Qué hace un delegado?',
  'Quiero consultar por un beneficio',
];

export default function App() {
  const [mensajes, setMensajes] = useState([]);
  const [entrada, setEntrada] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [consultaPendiente, setConsultaPendiente] = useState('');
  const [archivoAdjunto, setArchivoAdjunto] = useState(null); // {nombre, tipo, texto}
  const [procesandoArchivo, setProcesandoArchivo] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [audioActivo, setAudioActivo] = useState(null); // índice del mensaje sonando
  const [cargandoVoz, setCargandoVoz] = useState(null); // índice del mensaje generando voz
  const finRef = useRef(null);
  const inputArchivoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  // --- Reproducir la respuesta del delegado en voz (botón 🔊) ---
  async function reproducirVoz(texto, indice) {
    // Si ya está sonando este mensaje, lo paramos
    if (audioActivo === indice && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setAudioActivo(null);
      return;
    }
    // Si había otro audio sonando, lo paramos
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCargandoVoz(indice);
    try {
      const resp = await fetch(`${API_URL}/api/voz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      });
      if (!resp.ok) throw new Error('Error de voz');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setAudioActivo(indice);
      audio.onended = () => {
        setAudioActivo(null);
        audioRef.current = null;
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (err) {
      setAudioActivo(null);
    } finally {
      setCargandoVoz(null);
    }
  }

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando, mostrarForm]);

  // --- Subir un archivo (PDF, Word, imagen) ---
  async function subirArchivo(file) {
    if (!file) return;
    setProcesandoArchivo(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      const resp = await fetch(`${API_URL}/api/archivo`, { method: 'POST', body: formData });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error');

      if (data.aviso) {
        setArchivoAdjunto({ nombre: data.nombre, tipo: data.tipo, texto: '', aviso: data.aviso });
      } else {
        setArchivoAdjunto({ nombre: data.nombre, tipo: data.tipo, texto: data.texto });
      }
    } catch (err) {
      setMensajes((prev) => [...prev, { rol: 'bot', contenido: '⚠️ No pude procesar el archivo. Probá con otro o contame por chat.' }]);
    } finally {
      setProcesandoArchivo(false);
    }
  }

  // --- Grabar audio (nota de voz) ---
  async function toggleGrabacion() {
    if (grabando) {
      mediaRecorderRef.current?.stop();
      setGrabando(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'nota-de-voz.webm', { type: 'audio/webm' });
        await subirArchivo(file);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setGrabando(true);
    } catch (err) {
      setMensajes((prev) => [...prev, { rol: 'bot', contenido: '⚠️ No pude acceder al micrófono. Revisá los permisos del navegador.' }]);
    }
  }

  async function enviar(texto) {
    const mensaje = (texto ?? entrada).trim();
    // Permitir enviar si hay texto O si hay un archivo adjunto
    if ((!mensaje && !archivoAdjunto) || cargando) return;

    const textoArchivo = archivoAdjunto?.texto || '';
    const mensajeMostrado = archivoAdjunto
      ? `${mensaje || 'Te adjunto esto:'} 📎 ${archivoAdjunto.nombre}`
      : mensaje;

    const nuevoMensajeUsuario = { rol: 'usuario', contenido: mensajeMostrado };
    const nuevosMensajes = [...mensajes, nuevoMensajeUsuario];
    setMensajes(nuevosMensajes);
    setEntrada('');
    setArchivoAdjunto(null);
    setCargando(true);

    try {
      const historial = nuevosMensajes.map((m) => ({
        role: m.rol === 'usuario' ? 'user' : 'assistant',
        content: m.contenido,
      }));

      const resp = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: mensaje || 'El afiliado adjuntó un archivo, analizalo y respondé.',
          historial: historial.slice(0, -1),
          textoArchivo,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error');

      setMensajes((prev) => [...prev, { rol: 'bot', contenido: data.respuesta, fuentes: data.fuentes }]);

      if (data.tomarDatos) {
        setConsultaPendiente(mensaje);
        setMostrarForm(true);
      }
    } catch (err) {
      setMensajes((prev) => [...prev, { rol: 'bot', contenido: '⚠️ Hubo un problema al conectar. Verificá que el servidor esté andando y probá de nuevo.' }]);
    } finally {
      setCargando(false);
    }
  }

  function onConsultaEnviada(mensajeConfirmacion) {
    setMostrarForm(false);
    setConsultaPendiente('');
    setMensajes((prev) => [...prev, { rol: 'bot', contenido: '✅ ' + mensajeConfirmacion }]);
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">P</div>
        <div className="header-info">
          <h1>Delegado Virtual PECIFA</h1>
          <p>Tu asistente sindical · Unión del Personal Civil de las FFAA</p>
        </div>
      </header>

      <div className="mensajes">
        {mensajes.length === 0 && (
          <div className="bienvenida">
            <h2>¡Hola, compañero/a! 👋</h2>
            <p>
              Soy un delegado virtual de PECIFA Nacional. Estoy para ayudarte con dudas
              sobre el sindicato, el Estatuto, tus derechos, los beneficios y las seccionales.
              Podés escribirme, mandarme un documento, una foto o una nota de voz.
            </p>
            <div className="sugerencias">
              {SUGERENCIAS.map((s) => (
                <button key={s} className="sugerencia" onClick={() => enviar(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => (
          <div key={i} className={`mensaje ${m.rol === 'usuario' ? 'usuario' : 'bot'}`}>
            <div className="mensaje-avatar">{m.rol === 'usuario' ? 'Vos' : 'P'}</div>
            <div>
              <div className="mensaje-burbuja">{m.contenido}</div>
              {m.rol === 'bot' && m.contenido && (
                <button
                  className="btn-voz"
                  onClick={() => reproducirVoz(m.contenido, i)}
                  title="Escuchar respuesta"
                >
                  {cargandoVoz === i ? '⏳' : audioActivo === i ? '⏸️ Pausar' : '🔊 Escuchar'}
                </button>
              )}
              {m.fuentes && m.fuentes.length > 0 && (
                <div className="fuentes">📎 Fuente: {m.fuentes.join(', ')}</div>
              )}
            </div>
          </div>
        ))}

        {cargando && (
          <div className="mensaje bot">
            <div className="mensaje-avatar">P</div>
            <div className="mensaje-burbuja">
              <div className="escribiendo"><span></span><span></span><span></span></div>
            </div>
          </div>
        )}

        {mostrarForm && (
          <FormularioConsulta
            consultaInicial={consultaPendiente}
            onEnviado={onConsultaEnviada}
            onCancelar={() => setMostrarForm(false)}
          />
        )}

        <div ref={finRef} />
      </div>

      {/* Vista previa del archivo adjunto antes de enviar */}
      {archivoAdjunto && (
        <div className="adjunto-preview">
          <span>📎 {archivoAdjunto.nombre}</span>
          {archivoAdjunto.aviso
            ? <small className="adjunto-aviso">{archivoAdjunto.aviso}</small>
            : <small>Listo para enviar. Escribí tu pregunta o mandalo así.</small>}
          <button onClick={() => setArchivoAdjunto(null)}>✕</button>
        </div>
      )}

      {procesandoArchivo && (
        <div className="adjunto-preview"><span>⏳ Procesando archivo...</span></div>
      )}

      <div className="entrada">
        {/* Botón adjuntar archivo */}
        <input
          type="file"
          ref={inputArchivoRef}
          style={{ display: 'none' }}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a,.ogg"
          onChange={(e) => { subirArchivo(e.target.files[0]); e.target.value = ''; }}
        />
        <button className="btn-icono" title="Adjuntar documento o foto" onClick={() => inputArchivoRef.current?.click()} disabled={cargando || procesandoArchivo}>
          📎
        </button>

        {/* Botón grabar audio */}
        <button className={`btn-icono ${grabando ? 'grabando' : ''}`} title="Grabar nota de voz" onClick={toggleGrabacion} disabled={cargando || procesandoArchivo}>
          {grabando ? '⏺' : '🎤'}
        </button>

        <input
          type="text"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          placeholder={grabando ? 'Grabando... tocá ⏺ para terminar' : 'Escribí tu consulta...'}
          disabled={cargando || grabando}
        />
        <button onClick={() => enviar()} disabled={cargando || (!entrada.trim() && !archivoAdjunto)}>➤</button>
      </div>
    </div>
  );
}
