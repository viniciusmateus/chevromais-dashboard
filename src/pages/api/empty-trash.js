import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { getSupabaseForRequest } from "@/lib/supabaseServer";
import { getAppSetting } from "@/lib/getSettings";

export async function POST({ request }) {
  const supabase = getSupabaseForRequest(request);

  let messageIds = [];
  try {
    const body = await request.json();
    messageIds = body.messageIds || [];
  } catch (e) {}

  // 1. Exclui do Supabase todos os e-mails marcados com is_deleted
  try {
    await supabase.from("emails").delete().eq("is_deleted", true);
  } catch (dbErr) {
    console.error("Erro ao deletar lixeira do Supabase:", dbErr);
  }

  // 2. Apaga em lote do servidor IMAP (1 única conexão e varredura)
  if (messageIds.length > 0) {
    try {
      const host = await getAppSetting(supabase, "IMAP_HOST");
      const port = Number((await getAppSetting(supabase, "IMAP_PORT")) || 993);
      const user = await getAppSetting(supabase, "IMAP_USER");
      const pass = await getAppSetting(supabase, "IMAP_PASS");

      if (user && pass) {
        const client = new ImapFlow({
          host,
          port,
          secure: true,
          auth: { user, pass },
          logger: false,
        });

        await client.connect();
        let lock = await client.getMailboxLock("INBOX");

        try {
          // Cria um conjunto com os Message-IDs limpos para busca instantânea
          const targetIds = new Set(
            messageIds
              .filter(Boolean)
              .map((id) => id.trim().replace(/^<|>$/g, "")),
          );
          const uidsToDelete = [];

          // Varre a caixa uma única vez coletando todos os e-mails correspondentes
          for await (let msg of client.fetch(
            "1:*",
            { source: true, envelope: true },
            { uid: true },
          )) {
            const parsed = await simpleParser(msg.source);
            const envId = (msg.envelope?.messageId || parsed.messageId || "")
              .trim()
              .replace(/^<|>$/g, "");

            if (targetIds.has(envId)) {
              uidsToDelete.push(msg.uid);
            }
          }

          if (uidsToDelete.length > 0) {
            await client.messageDelete(uidsToDelete, { uid: true });
            console.log(
              `[IMAP Lixeira] ${uidsToDelete.length} e-mails removidos com sucesso.`,
            );
          }
        } finally {
          lock.release();
        }

        await client.logout();
      }
    } catch (imapErr) {
      console.error("Erro ao esvaziar lixeira no IMAP:", imapErr);
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
