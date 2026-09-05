import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";

export async function POST({ request }) {
  try {
    const body = await request.json();
    const {
      imapHost,
      imapPort,
      imapUser,
      imapPass,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
    } = body;

    // 1. Testar conexão SMTP (Envio)
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.verify(); // Se a senha ou host estiverem errados, isso lança um erro

    // 2. Testar conexão IMAP (Recebimento)
    const imapClient = new ImapFlow({
      host: imapHost,
      port: Number(imapPort),
      secure: true,
      auth: { user: imapUser, pass: imapPass },
      logger: false,
    });

    await imapClient.connect(); // Se a senha estiver errada, isso lança erro
    await imapClient.logout(); // Fecha a conexão limpa

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Erro no teste de credenciais:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
}
