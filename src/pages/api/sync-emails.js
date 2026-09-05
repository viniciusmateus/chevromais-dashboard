import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { getSupabaseForRequest } from "@/lib/supabaseServer";
import { getAppSetting } from "@/lib/getSettings";

export const POST = async ({ request }) => {
  const supabase = getSupabaseForRequest(request);

  const host = await getAppSetting(supabase, "IMAP_HOST");
  const port = Number((await getAppSetting(supabase, "IMAP_PORT")) || 993);
  const user = await getAppSetting(supabase, "IMAP_USER");
  const pass = await getAppSetting(supabase, "IMAP_PASS");

  const { data: authCheck, error: authError } = await supabase.auth.getUser();
  console.log(
    "[sync-emails] auth.getUser() ->",
    JSON.stringify({ user: authCheck?.user?.email, error: authError }, null, 2),
  );

  if (!host || !user || !pass) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Credenciais IMAP não configuradas no banco de dados ou .env",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    const messages = [];

    // Busca as últimas mensagens da caixa de entrada
    for await (let message of client.fetch("1:*", {
      source: true,
      envelope: true,
    })) {
      const parsed = await simpleParser(message.source);

      messages.push({
        message_id:
          message.envelope.messageId ||
          `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sender_name: parsed.from?.value[0]?.name || "",
        sender_email:
          parsed.from?.value[0]?.address || "desconhecido@email.com",
        recipient_email: parsed.to?.value[0]?.address || "",
        subject: parsed.subject || "(Sem assunto)",
        body_text: parsed.text || "",
        body_html:
          parsed.html || parsed.textAsHtml || `<p>${parsed.text || ""}</p>`,
        is_read: false,
        received_at: parsed.date
          ? new Date(parsed.date).toISOString()
          : new Date().toISOString(),
      });
    }

    lock.release();
    await client.logout();

    if (messages.length > 0) {
      const { error } = await supabase
        .from("emails")
        .upsert(messages, { onConflict: "message_id" });

      if (error) {
        console.error("Erro ao salvar e-mails no Supabase:", error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, syncedCount: messages.length }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Erro na conexão IMAP:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
