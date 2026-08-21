import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import libre from 'libreoffice-convert';
import { execSync } from 'child_process';

// -----------------------------------------------------------------------------
// CONFIGURAÇÃO DOS CABEÇALHOS CORS
// -----------------------------------------------------------------------------
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export const OPTIONS = async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
};

// -----------------------------------------------------------------------------
// 1. RASTREADOR DO LIBREOFFICE
// -----------------------------------------------------------------------------
function setupLibreOfficePath() {
    let finalPath = null;
    const logs = [];

    logs.push(`[SISTEMA] Iniciando busca pelo LibreOffice. Plataforma: ${process.platform}`);

    if (process.platform === 'win32') {
        finalPath = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
        logs.push(`[WINDOWS] Caminho definido como: ${finalPath}`);
    } else {
        const possiblePaths = [
            '/usr/bin/soffice',
            '/usr/bin/libreoffice',
            '/usr/lib/libreoffice/program/soffice',
            '/opt/libreoffice/program/soffice'
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                finalPath = p;
                logs.push(`[LINUX] Encontrado via fs.existsSync: ${p}`);
                break;
            }
        }

        if (!finalPath) {
            try {
                const whichPath = execSync('which soffice').toString().trim();
                if (whichPath) {
                    finalPath = whichPath;
                    logs.push(`[LINUX] Encontrado via comando 'which': ${whichPath}`);
                }
            } catch (error) {
                logs.push(`[LINUX] Comando 'which soffice' falhou.`);
            }
        }
    }

    if (finalPath) {
        process.env.SOFFICE_PATH = finalPath;
    } else {
        logs.push(`[ERRO CRÍTICO] LibreOffice não encontrado.`);
    }

    return { path: finalPath, logs };
}

// -----------------------------------------------------------------------------
// 2. FUNÇÕES AUXILIARES E DICIONÁRIOS
// -----------------------------------------------------------------------------
const objectionsMap = {
    delivery: "PRAZO DE ENTREGA",
    sample: "AMOSTRA",
    ence: "ENCE",
    manufacturing: "FABRICAÇÃO NACIONAL",
    abrafati: "ABRAFATI",
    abipti: "ABIPTI",
    restriction: "RESTRIÇÃO REGIONAL",
    service: "SERVIÇO",
};

const companyNamesMap = {
    chevromais: "Chevromais",
    autoluk: "Autoluk",
    lukauto: "Lukauto",
    curitibaPneus: "Curitiba Pneus",
};

async function convertToPdf(docxBuffer) {
    if (libre.convertAsync) {
        return await libre.convertAsync(docxBuffer, '.pdf', undefined);
    }
    return await new Promise((resolve, reject) => {
        libre.convert(docxBuffer, '.pdf', undefined, (err, done) => {
            if (err) reject(err);
            else resolve(done);
        });
    });
}

// -----------------------------------------------------------------------------
// 3. ROTA DA API PRINCIPAL
// -----------------------------------------------------------------------------
export const POST = async ({ request }) => {
    const sysCheck = setupLibreOfficePath();
    const processLogs = [...sysCheck.logs];

    try {
        processLogs.push("1. Recebendo dados do formulário...");
        const data = await request.json();
        
        if (!sysCheck.path) {
            throw new Error("LibreOffice não está instalado neste ambiente.");
        }

        const today = new Date();
        const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
        const todayFormatted = `${today.getDate()} de ${monthNames[today.getMonth()]} de ${today.getFullYear()}`;

        const companyName = companyNamesMap[data.empresa] || data.empresa || "Empresa Não Informada";
        
        // Correção aplicada: conversão segura para string antes do replace
        const disputeNumberFormatted = data.numeroEdital 
            ? String(data.numeroEdital).replace(/\//g, "-") 
            : "";

        // Formatação do Prazo de Entrega
        let deliveryStipulateFormat = "";
        if (data.prazoEntrega?.unidade === "Imediata") {
            deliveryStipulateFormat = "IMEDIATA";
        } else if (data.prazoEntrega?.prazo) {
            const val = parseInt(data.prazoEntrega.prazo, 10) || 0;
            const plural = val === 1 ? "" : "S";
            const prefix = val < 10 ? `0${val}` : `${val}`;
            const unit = data.prazoEntrega.unidade === "Horas" ? "HORA" : "DIA";
            deliveryStipulateFormat = `${prefix} ${unit}${plural}`;
        }

        // Formatação do ENCE
        const enceSpecsArray = data.ence?.especificacoes || [];
        const enceLabelsArray = data.ence?.classificacoes || [];
        const enceLabelFormat = enceLabelsArray.length > 0 
            ? (enceLabelsArray.length === 1 ? enceLabelsArray[0] : enceLabelsArray.slice(0, -1).join(", ") + " e " + enceLabelsArray[enceLabelsArray.length - 1]) 
            : "";

        // O Frontend agora envia uma impugnação por vez
        const objectionKey = data.objection;
        if (!objectionKey) {
            throw new Error("Nenhuma chave de impugnação ('objection') foi enviada no payload.");
        }

        processLogs.push(`2. Processando documento: ${objectionKey}`);

        const templateFileName = `${data.empresa}-${objectionKey}.docx`;
        const templatePath = path.join(process.cwd(), 'public', 'templates', templateFileName);

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template ausente no servidor: ${templateFileName}`);
        }

        processLogs.push(`› Preenchendo template: ${templateFileName}`);
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // Mapeando dados do novo formato JSON do frontend
        doc.render({
            company: companyName,
            disputeNumber: data.numeroEdital || "",
            disputeDate: data.dataEdital || "",
            cityUF: data.municipioUF || "",
            buyer: data.orgao || "",
            deliveryStipulate: deliveryStipulateFormat,
            sampleObject: data.amostra?.objeto || "",
            sampleClause: data.amostra?.clausulas || "",
            serviceType: data.servicoMontagem?.tiposServico || "",
            serviceObject: data.servicoMontagem?.objetoServico || "",
            restrictionClause: data.restricaoRegional?.clausulas || "",
            enceSpec: enceSpecsArray.join(" e "),
            enceLabel: enceLabelFormat,
            todayFormatted: todayFormatted,
        });

        const docxBuffer = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });

        processLogs.push(`› Convertendo para PDF...`);
        let pdfBuffer;
        try {
            pdfBuffer = await convertToPdf(docxBuffer);
        } catch (convErr) {
            throw new Error(`Falha na conversão do LibreOffice: ${convErr.message}`);
        }

        const filenameBase = `Impugnação ${objectionsMap[objectionKey] || objectionKey} ${companyName} ${disputeNumberFormatted}`;

        const fileResult = {
            objectionKey: objectionKey,
            objectionName: objectionsMap[objectionKey] || objectionKey,
            pdfFilename: `${filenameBase}.pdf`.trim(),
            pdfBase64: pdfBuffer.toString('base64'),
        };

        processLogs.push("3. PDF gerado com sucesso!");
        console.log(processLogs.join('\n'));

        // Retornando objeto único (o frontend espera result.file.pdfBase64)
        return new Response(JSON.stringify({ success: true, file: fileResult }), {
            status: 200,
            headers: { 
                "Content-Type": "application/json",
                ...corsHeaders
            }
        });

    } catch (error) {
        processLogs.push(`[ERRO FATAL]: ${error.message}`);
        console.error("ERRO FATAL NO BACKEND:\n", processLogs.join('\n'));
        
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message,
            debug_logs: processLogs 
        }), {
            status: 500,
            headers: { 
                "Content-Type": "application/json",
                ...corsHeaders
            }
        });
    }
};