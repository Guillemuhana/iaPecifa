// ============================================================
// MÓDULO DE ENVÍO DE EMAIL
// ------------------------------------------------------------
// Manda un email cada vez que un afiliado deja una consulta.
// Lo enruta a la SECCIONAL que corresponde (si tiene email
// cargado) y opcionalmente con copia a Nacional.
//
// Usa Resend (https://resend.com), plan gratis 3000 emails/mes.
// ============================================================

import { Resend } from 'resend';
import { buscarSeccional, emailsDestino } from './seccionales.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_REMITENTE = process.env.EMAIL_REMITENTE || 'onboarding@resend.dev';

export async function enviarConsulta(datos) {
  const { nombre, seccional, lugarTrabajo, osfa, telefono, email, consulta } = datos;

  // Buscar la seccional para enrutar el email correctamente
  const seccionalInfo = buscarSeccional(seccional);
  const destinos = emailsDestino(seccionalInfo);

  const fecha = new Date().toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e3a5f; color: #fff; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">📋 Nueva consulta de un afiliado</h2>
        <p style="margin: 6px 0 0; opacity: 0.85;">Delegado Virtual PECIFA${seccionalInfo ? ' · Seccional ' + seccionalInfo.nombre : ''}</p>
      </div>
      <div style="border: 1px solid #e1e8ed; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; font-weight: bold; width: 160px;">Nombre completo:</td><td>${nombre || '-'}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Seccional:</td><td>${seccional || '-'}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Lugar de trabajo:</td><td>${lugarTrabajo || '-'}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">N° de OSFA:</td><td>${osfa || '-'}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Teléfono:</td><td>${telefono || '-'}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td>${email || '-'}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 16px; background: #f4f6f9; border-radius: 8px;">
          <strong>Consulta:</strong>
          <p style="margin: 8px 0 0; line-height: 1.5;">${consulta || '-'}</p>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #718096;">
          Recibido el ${fecha} a través del Delegado Virtual de PECIFA.
        </p>
      </div>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from: `Delegado Virtual PECIFA <${EMAIL_REMITENTE}>`,
    to: destinos,
    replyTo: email || undefined,
    subject: `Nueva consulta de ${nombre || 'un afiliado'}${seccionalInfo ? ' · ' + seccionalInfo.nombre : ' (' + (seccional || 'sin seccional') + ')'}`,
    html,
  });

  if (error) {
    console.error('❌ Error enviando email:', error);
    throw new Error('No se pudo enviar el email');
  }

  console.log(`✅ Email enviado a: ${destinos.join(', ')} (id: ${data?.id})`);
  return data;
}
