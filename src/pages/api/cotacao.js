export const prerender = false;

// Função auxiliar simples para extrair tags XML caso o webservice ignore o modoJson e devolva XML
function parseXmlCotacao(xmlText) {
  const getTagValue = (tag) => {
    const match = xmlText.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
    return match ? match[1] : null;
  };

  const stsCd = xmlText.match(/stsCd="(\d+)"/i)?.[1];
  const statusDesc = getTagValue('cotStatus') || "Sem mensagem de status";
  const valorTotal = getTagValue('cotVlrTot');
  const prazo = getTagValue('entPrev');

  return {
    status: {
      numero: stsCd ? Number(stsCd) : 1,
      descricao: statusDesc
    },
    cotacao: {
      emissao: {
        valoresCotacao: {
          valorTotal: valorTotal ? parseFloat(valorTotal) : 0
        },
        diasEntrega: prazo || "A consultar"
      }
    }
  };
}

export const POST = async ({ request }) => {
  try {
    const body = await request.json();

    const apiUrl = import.meta.env.PUBLIC_ALFA_API_URL || import.meta.env.ALFA_API_URL;
    const apiKey = import.meta.env.PUBLIC_ALFA_API_KEY || import.meta.env.ALFA_API_KEY;

    if (!apiUrl) {
      return new Response(
        JSON.stringify({ erro: "PUBLIC_ALFA_API_URL não configurada no .env" }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Monta o payload respeitando rigorosamente os tipos da tabela do manual Alfa
    const payloadAlfa = {
      idr: String(apiKey || '').trim(),                   // String (30-40)
      cliTip: Number(body.cliTip) || 1,                    // Inteiro (1 ou 2)
      cliCep: String(body.cepDestino).replace(/\D/g, ''),  // Numérico (Apenas números)
      merVlr: Number(body.valorMercadoria),               // Numérico
      merPeso: Number(body.pesoTotal),                     // Numérico
      merM3: Number(body.volumeTotal),                     // Numérico
      merVol: Number(body.qtdTotal || 1),                  // Inteiro
      cepRem: "81810270",                                  // Numérico / String
      modoJson: 1                                          // Booleano 1 = JSON
    };

    if (body.cnpjDestino) {
      payloadAlfa.cliCnpj = String(body.cnpjDestino).replace(/\D/g, '');
    }

    // Garante que a URL termina com barra para a Alfa processar o endpoint do webservice
    const targetUrl = apiUrl.trim().endsWith('/') ? apiUrl.trim() : `${apiUrl.trim()}/`;

    console.log("--> Enviando POST para:", targetUrl);
    console.log("--> Payload:", JSON.stringify(payloadAlfa));

    // 2. Requisição para o servidor da Alfa
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/xml, */*'
      },
      body: JSON.stringify(payloadAlfa)
    });

    const responseText = await response.text();
    console.log("--> Resposta Bruta Alfa:", responseText);

    let data;

    // 3. Parser Resiliente: Tenta JSON primeiro; se for XML, converte manualmente
    if (responseText.trim().startsWith('{')) {
      data = JSON.parse(responseText);
    } else if (responseText.trim().startsWith('<?xml') || responseText.includes('<wsCotacao>')) {
      data = parseXmlCotacao(responseText);
    } else {
      return new Response(
        JSON.stringify({ 
          erro: "A API da Alfa retornou uma resposta em formato inválido.",
          respostaBruta: responseText.slice(0, 300) 
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Verificação dos códigos de erro da Alfa (Status != 1)
    if (data.status && Number(data.status.numero) !== 1) {
      return new Response(
        JSON.stringify({ 
          erro: `${data.status.descricao} (Código ${data.status.numero})`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Extração dos dados
    const valores = data.cotacao?.emissao?.valoresCotacao || {};
    const prazo = data.cotacao?.emissao?.diasEntrega || "A consultar";

    return new Response(
      JSON.stringify({
        valorFrete: valores.valorTotal || 0,
        prazo: prazo,
        detalhesValores: valores,
        transportadora: "Alfa Transportes"
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("❌ ERRO INTERNO NO ENDPOINT /api/cotacao:", error);
    return new Response(
      JSON.stringify({ erro: "Falha na comunicação interna", mensagem: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};