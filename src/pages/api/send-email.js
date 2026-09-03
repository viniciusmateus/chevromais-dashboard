import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';

export async function POST({ request }) {
  try {
    const { to, subject, text, originalMessageId } = await request.json();

    const host = import.meta.env.SMTP_HOST || process.env.SMTP_HOST;
    const port = Number(import.meta.env.SMTP_PORT || process.env.SMTP_PORT || 465);
    const user = import.meta.env.SMTP_USER || process.env.SMTP_USER;
    const pass = import.meta.env.SMTP_PASS || process.env.SMTP_PASS;

    if (!user || !pass) {
      return new Response(JSON.stringify({ error: 'Credenciais SMTP ausentes no .env' }), { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    const mailOptions = {
      from: user,
      to,
      subject,
      text
    };

    if (originalMessageId) {
      mailOptions.inReplyTo = originalMessageId;
      mailOptions.references = originalMessageId;
    }

    const info = await transporter.sendMail(mailOptions);

    // Registra o e-mail enviado no Supabase para figurar na aba de "Enviados"
    await supabase.from('emails').insert({
      message_id: info.messageId || `<sent-${Date.now()}@pneuscuritiba.com.br>`,
      sender_name: user.split('@')[0],
      sender_email: user,
      subject,
      body_text: text,
      body_html: text.replace(/\n/g, '<br />'),
      received_at: new Date().toISOString(),
      is_read: true,
      is_sent: true,
      is_deleted: false
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Erro ao enviar e-mail via SMTP:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}