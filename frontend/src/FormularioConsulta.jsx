import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

// Formulario que aparece cuando el delegado necesita tomar los datos
// para una consulta que requiere atención humana.
export default function FormularioConsulta({ consultaInicial, onEnviado, onCancelar }) {
  const [datos, setDatos] = useState({
    nombre: '',
    seccional: '',
    lugarTrabajo: '',
    osfa: '',
    telefono: '',
    email: '',
    consulta: consultaInicial || '',
  });
  const [seccionales, setSeccionales] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  // Cargar la lista de seccionales para el menú desplegable
  useEffect(() => {
    fetch(`${API_URL}/api/seccionales`)
      .then((r) => r.json())
      .then((data) => setSeccionales(data))
      .catch(() => setSeccionales([]));
  }, []);

  function actualizar(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function enviar() {
    setError('');
    if (!datos.nombre || !datos.seccional || !datos.consulta) {
      setError('Por favor completá al menos tu nombre, seccional y la consulta.');
      return;
    }
    setEnviando(true);
    try {
      const resp = await fetch(`${API_URL}/api/consulta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error');
      onEnviado(data.mensaje);
    } catch (err) {
      setError('No pudimos registrar la consulta. Probá de nuevo en un momento.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="form-consulta">
      <h3>📋 Dejá tu consulta registrada</h3>
      <p className="form-subtitulo">
        Completá tus datos y un delegado te va a contactar a la brevedad.
      </p>

      <div className="form-grid">
        <label>
          Nombre completo *
          <input value={datos.nombre} onChange={(e) => actualizar('nombre', e.target.value)} placeholder="Tu nombre y apellido" />
        </label>
        <label>
          Seccional *
          <select value={datos.seccional} onChange={(e) => actualizar('seccional', e.target.value)}>
            <option value="">Elegí tu seccional...</option>
            {seccionales.map((s) => (
              <option key={s.id} value={s.nombre}>{s.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Lugar de trabajo
          <input value={datos.lugarTrabajo} onChange={(e) => actualizar('lugarTrabajo', e.target.value)} placeholder="Dependencia / organismo" />
        </label>
        <label>
          N° de OSFA
          <input value={datos.osfa} onChange={(e) => actualizar('osfa', e.target.value)} placeholder="Número de afiliado OSFA" />
        </label>
        <label>
          Teléfono
          <input value={datos.telefono} onChange={(e) => actualizar('telefono', e.target.value)} placeholder="Tu teléfono de contacto" />
        </label>
        <label>
          Email
          <input type="email" value={datos.email} onChange={(e) => actualizar('email', e.target.value)} placeholder="tu@email.com" />
        </label>
      </div>

      <label className="form-full">
        Tu consulta *
        <textarea rows="3" value={datos.consulta} onChange={(e) => actualizar('consulta', e.target.value)} placeholder="Contanos en qué te podemos ayudar..." />
      </label>

      {error && <div className="form-error">{error}</div>}

      <div className="form-botones">
        <button className="btn-cancelar" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button className="btn-enviar" onClick={enviar} disabled={enviando}>
          {enviando ? 'Enviando...' : 'Enviar consulta'}
        </button>
      </div>
    </div>
  );
}
