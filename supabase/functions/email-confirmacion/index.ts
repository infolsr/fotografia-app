// Archivo: supabase/functions/email-confirmacion/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@3.2.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  try {
    const { record } = await req.json();
    const shortOrderId = record.id.substring(0, 8).toUpperCase();

    let subject = '';
    let htmlBody = '';
    const fromAddress = 'Luitania-Fotos <onboarding@resend.dev>';

    if (record.status === 'pagado') {
      subject = `Tu Pedido #${shortOrderId} está en preparación`;
      htmlBody = `<h1>¡Hola ${record.nombre_cliente}!</h1><p>Hemos recibido tu pago y ya estamos trabajando en tu pedido #${shortOrderId}.</p><p>El plazo de entrega es de 1 a 2 días hábiles. Te avisaremos nuevamente cuando tus fotos estén listas.</p><h3>Resumen de tu compra:</h3><ul><li>Paquete: ${record.formato}</li><li>Total Pagado: $${record.total.toLocaleString('es-CL')}</li></ul><p>Gracias por tu confianza,<br>El equipo de Luitania.</p>`;
    } else if (record.status === 'por_transferencia') {
      subject = `Confirmación de tu Pedido #${shortOrderId} (Pendiente de Pago)`;
      htmlBody = `<h1>¡Hola ${record.nombre_cliente}!</h1><p>Hemos recibido tu pedido #${shortOrderId} y está a la espera de la confirmación de tu pago.</p><p><strong>Para completar el proceso, es requisito que nos envíes el comprobante de transferencia a nuestro correo <a href="mailto:luitaniafotos@gmail.com">luitaniafotos@gmail.com</a> o a nuestro WhatsApp <a href="https://wa.me/56995000093">+56 9 9500 0093</a>.</strong></p><p>Una vez recibido, comenzaremos a preparar tus fotos.</p><h3>Resumen de tu compra:</h3><ul><li>Paquete: ${record.formato}</li><li>Total a transferir: $${record.total.toLocaleString('es-CL')}</li></ul><p>Gracias por tu confianza,<br>El equipo de Luitania.</p>`;
    }

    if (subject && htmlBody) {
      await resend.emails.send({
        from: fromAddress,
        to: record.correo_cliente,
        subject: subject,
        html: htmlBody,
      });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error('Error al enviar el correo:', error.message);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});