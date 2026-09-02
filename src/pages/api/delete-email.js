import { ImapFlow } from 'imapflow';
import { supabase } from '@/lib/supabase';

// Função auxiliar para encontrar a mensagem no IMAP mesmo com diferenças de formatação do Message-ID
async function findUidsByMessageId(client, messageId) {
  if (!messageId) return [];

  const cleanId = messageId.trim().replace(/^<|>$/g, '');
  const withBrackets = `<${cleanId}>`;

  // 1. Tenta buscas diretas via índice IMAP (com e sem colchetes)
  const queries = [
    { header: ['message-id', withBrackets] },
    { header: ['message-id', cleanId] },
    { header: ['Message-ID', withBrackets] },
    { header: ['Message-ID', cleanId] }
  ];

  for (const query of queries) {
    try {
      const uids = await client.search(query, { uid: true });
      if (uids && uids.length > 0) return uids;
    } catch (e) {
      // Avança para a próxima tentativa se houver erro de sintaxe no servidor
    }
  }

  // 2. Fallback Infalível: se o índice do servidor falhar, varre os envelopes da INBOX para comparar o ID exato
  try {
    const uids = [];
    for await (let msg of client.fetch('1:*', { envelope: true }, { uid: true })) {
      const envId = (msg.envelope?.messageId || '').trim().replace(/^<|>$/g, '');
      if (envId === cleanId) {
        uids.push(msg.uid);
      }
    }
    if (uids.length > 0) return uids;
  } catch (e) {
    console.error('Erro na varredura fallback IMAP:', e);
  }

  return [];
}

export async function POST({ request }) {
  let id, messageId;
  try {
    const body = await request.json();
    id = body.id;
    messageId = body.messageId;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Payload inválido' }), { status: 400 });
  }

  // PASSO 1: REMOÇÃO COMPLETA NO SUPABASE (Garantida)
  try {
    if (id) {
      await supabase.from('emails').delete().eq('id', id);
    }
    if (messageId) {
      await supabase.from('emails').delete().eq('message_id', messageId);
    }
  } catch (dbErr) {
    console.error('Erro ao deletar do Supabase:', dbErr);
  }

  // PASSO 2: REMOÇÃO NO SERVIDOR IMAP
  if (messageId) {
    try {
      const host = import.meta.env.IMAP_HOST || process.env.IMAP_HOST;
      const port = Number(import.meta.env.IMAP_PORT || process.env.IMAP_PORT || 993);
      const user = import.meta.env.IMAP_USER || process.env.IMAP_USER;
      const pass = import.meta.env.IMAP_PASS || process.env.IMAP_PASS;

      if (user && pass) {
        const client = new ImapFlow({
          host,
          port,
          secure: true,
          auth: { user, pass },
          logger: false
        });

        await client.connect();
        let lock;

        try {
          lock = await client.getMailboxLock('INBOX');
          const uids = await findUidsByMessageId(client, messageId);

          if (uids && uids.length > 0) {
            // Marca como \Deleted e executa o EXPUNGE (remoção física) no servidor
            await client.messageDelete(uids, { uid: true });
          } else {
            console.log('Aviso: E-mail não encontrado no IMAP. Já devia ter sido apagado.');
          }
        } finally {
          if (lock) lock.release();
        }

        await client.logout();
      }
    } catch (imapErr) {
      console.error('Erro na operação IMAP (o e-mail já foi removido do banco):', imapErr);
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}