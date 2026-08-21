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
    "Access-Control-Allow-Origin": "*", // O asterisco libera para qualquer site (incluindo seu localhost).
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

// -----------------------------------------------------------------------------
// ROTA OPTIONS (PREFLIGHT) - Necessário para o navegador liberar o CORS
// -----------------------------------------------------------------------------
export const OPTIONS = async () => {
    return new Response(null, {
        status: 204,
        headers: corsHeaders
    });
};

// -----------------------------------------------------------------------------
// 1. RASTREADOR DO LIBREOFFICE (LOG AVANÇADO)
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
                logs.push(`[LINUX] Encontrado via fs.existsSync no caminho: ${p}`);
                break;
            } else {
                logs.push(`[LINUX] Não encontrado em: ${p}`);
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
        logs.push(`[ERRO CRÍTICO] O LibreOffice não foi encontrado no contêiner! O App Hosting provavelmnete ignorou o Dockerfile.`);
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
            throw new Error("LibreOffice não está instalado neste ambiente. Verifique o deploy do Dockerfile.");
        }

        const today = new Date();
        const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
        const todayFormatted = `${today.getDate()} de ${monthNames[today.getMonth()]} de ${today.getFullYear()}`;

        const companyName = companyNamesMap[data.empresa] || data.empresa;
        const disputeNumberFormatted = data.disputeNumber 
    ? String(data.disputeNumber).replace(/\//g, "-") 
    : "";

        let deliveryStipulateFormat = "";
        if (data.details.delivery.deliveryUnit === "Imediata") {
            deliveryStipulateFormat = "IMEDIATA";
        } else {
            const val = parseInt(data.details.delivery.deliveryStipulate, 10) || 0;
            const plural = val === 1 ? "" : "S";
            const prefix = val < 10 ? `0${val}` : `${val}`;
            const unit = data.details.delivery.deliveryUnit === "Horas" ? "HORA" : "DIA";
            deliveryStipulateFormat = `${prefix} ${unit}${plural}`;
        }

        const selectedEnceSpecs = [];
        if (data.details.ence.enceSpecs.traction) selectedEnceSpecs.push("ADERÊNCIA");
        if (data.details.ence.enceSpecs.resistance) selectedEnceSpecs.push("RESISTÊNCIA");
        
        const selectedEnceLabels = Object.keys(data.details.ence.enceGrades).filter(key => data.details.ence.enceGrades[key]);
        const enceLabelFormat = selectedEnceLabels.length > 0 
            ? (selectedEnceLabels.length === 1 ? selectedEnceLabels[0] : selectedEnceLabels.slice(0, -1).join(", ") + " e " + selectedEnceLabels[selectedEnceLabels.length - 1]) 
            : "";

        const selectedKeys = Object.keys(data.objections).filter(key => data.objections[key]);
        processLogs.push(`2. Disparando processamento em paralelo para ${selectedKeys.length} arquivo(s)...`);

        const promessasDeConversao = selectedKeys.map(async (objection) => {
            const templateFileName = `${data.empresa}-${objection}.docx`;
            const templatePath = path.join(process.cwd(), 'public', 'templates', templateFileName);

            if (!fs.existsSync(templatePath)) {
                processLogs.push(`[AVISO] Template ausente: ${templatePath}`);
                return null; 
            }

            processLogs.push(`› Preenchendo template: ${templateFileName}`);
            const content = fs.readFileSync(templatePath, 'binary');
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

            doc.render({
                company: companyName,
                disputeNumber: data.disputeNumber,
                disputeDate: data.disputeDate,
                cityUF: data.cityUF,
                buyer: data.buyer,
                deliveryStipulate: deliveryStipulateFormat,
                sampleObject: data.details.sample.sampleObject,
                sampleClause: data.details.sample.sampleClause,
                serviceType: data.details.service.serviceType,
                serviceObject: data.details.service.serviceObject,
                restrictionClause: data.details.restriction.restrictionClause,
                enceSpec: selectedEnceSpecs.join(" e "),
                enceLabel: enceLabelFormat,
                todayFormatted: todayFormatted,
            });

            const docxBuffer = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });

            processLogs.push(`› Convertendo para PDF: ${templateFileName}`);
            
            let pdfBuffer;
            try {
                pdfBuffer = await convertToPdf(docxBuffer);
            } catch (convErr) {
                processLogs.push(`[ERRO NA CONVERSÃO de ${templateFileName}]: ${convErr.message}`);
                throw convErr;
            }

            const filenameBase = `Impugnação ${objectionsMap[objection]} ${companyName} ${disputeNumberFormatted}`;

            return {
                objectionKey: objection,
                objectionName: objectionsMap[objection],
                pdfFilename: `${filenameBase}.pdf`,
                pdfBase64: pdfBuffer.toString('base64'),
            };
        });

        const results = await Promise.all(promessasDeConversao);
        const generatedFiles = results.filter(Boolean);

        processLogs.push("3. Todos os PDFs foram gerados simultaneamente!");
        console.log(processLogs.join('\n'));

        // Adicionando os headers CORS no sucesso
        return new Response(JSON.stringify({ success: true, files: generatedFiles }), {
            status: 200,
            headers: { 
                "Content-Type": "application/json",
                ...corsHeaders // <--- CORS Aqui
            }
        });

    } catch (error) {
        processLogs.push(`[ERRO FATAL]: ${error.message}`);
        console.error("ERRO FATAL NO BACKEND:\n", processLogs.join('\n'));
        
        // Adicionando os headers CORS no erro
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message,
            debug_logs: processLogs 
        }), {
            status: 500,
            headers: { 
                "Content-Type": "application/json",
                ...corsHeaders // <--- CORS Aqui também
            }
        });
    }
};