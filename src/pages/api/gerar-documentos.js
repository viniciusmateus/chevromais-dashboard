import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { execSync, exec } from "child_process";

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

	if (process.platform === "win32") {
		finalPath = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
		logs.push(`[WINDOWS] Caminho definido como: ${finalPath}`);
	} else {
		const possiblePaths = ["/usr/bin/soffice", "/usr/bin/libreoffice", "/usr/lib/libreoffice/program/soffice", "/opt/libreoffice/program/soffice"];

		for (const p of possiblePaths) {
			if (fs.existsSync(p)) {
				finalPath = p;
				logs.push(`[LINUX] Encontrado via fs.existsSync: ${p}`);
				break;
			}
		}

		if (!finalPath) {
			try {
				const whichPath = execSync("which soffice").toString().trim();
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

/**
 * Converte DOCX para PDF utilizando isolamento de perfil no LibreOffice,
 * prevenindo conflitos entre conversões simultâneas.
 */
async function convertToPdf(docxBuffer, sofficePath) {
	return new Promise((resolve, reject) => {
		const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
		const tmpDir = path.join("/tmp", `doc_conv_${uniqueId}`);
		const userProfileDir = path.join("/tmp", `soffice_profile_${uniqueId}`);

		try {
			fs.mkdirSync(tmpDir, { recursive: true });
			fs.mkdirSync(userProfileDir, { recursive: true });

			const inputDocxPath = path.join(tmpDir, "input.docx");
			const outputPdfPath = path.join(tmpDir, "input.pdf");

			fs.writeFileSync(inputDocxPath, docxBuffer);

			// Argumento -env:UserInstallation força o LibreOffice a rodar isolado em cada requisição
			const cmd = `"${sofficePath}" -env:UserInstallation=file://${userProfileDir} --headless --convert-to pdf --outdir "${tmpDir}" "${inputDocxPath}"`;

			exec(cmd, (error, stdout, stderr) => {
				try {
					if (error) {
						return reject(new Error(`Erro na execução do LibreOffice: ${error.message} - ${stderr}`));
					}

					if (!fs.existsSync(outputPdfPath)) {
						return reject(new Error(`PDF não gerado pelo LibreOffice. Stderr: ${stderr}`));
					}

					const pdfBuffer = fs.readFileSync(outputPdfPath);

					// Limpeza dos diretórios temporários criados
					fs.rmSync(tmpDir, { recursive: true, force: true });
					fs.rmSync(userProfileDir, { recursive: true, force: true });

					resolve(pdfBuffer);
				} catch (cleanupErr) {
					reject(cleanupErr);
				}
			});
		} catch (err) {
			reject(err);
		}
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

		const disputeNumberFormatted = data.numeroEdital ? String(data.numeroEdital).replace(/\//g, "-") : "";

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

		const enceSpecsArray = data.ence?.especificacoes || [];
		const enceLabelsArray = data.ence?.classificacoes || [];
		const enceLabelFormat = enceLabelsArray.length > 0 ? (enceLabelsArray.length === 1 ? enceLabelsArray[0] : enceLabelsArray.slice(0, -1).join(", ") + " e " + enceLabelsArray[enceLabelsArray.length - 1]) : "";

		const objectionKey = data.objection;
		if (!objectionKey) {
			throw new Error("Nenhuma chave de impugnação ('objection') foi enviada no payload.");
		}

		processLogs.push(`2. Processando documento: ${objectionKey}`);

		const templateFileName = `${data.empresa}-${objectionKey}.docx`;
		const templatePath = path.join(process.cwd(), "public", "templates", templateFileName);

		if (!fs.existsSync(templatePath)) {
			throw new Error(`Template ausente no servidor: ${templateFileName}`);
		}

		processLogs.push(`› Preenchendo template: ${templateFileName}`);
		const content = fs.readFileSync(templatePath, "binary");
		const zip = new PizZip(content);
		const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

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

		processLogs.push(`› Convertendo para PDF com perfil de processo isolado...`);
		let pdfBuffer;
		try {
			pdfBuffer = await convertToPdf(docxBuffer, sysCheck.path);
		} catch (convErr) {
			throw new Error(`Falha na conversão do LibreOffice: ${convErr.message}`);
		}

		const filenameBase = `Impugnação ${objectionsMap[objectionKey] || objectionKey} ${companyName} ${disputeNumberFormatted}`;

		const fileResult = {
			objectionKey: objectionKey,
			objectionName: objectionsMap[objectionKey] || objectionKey,
			pdfFilename: `${filenameBase}.pdf`.trim(),
			pdfBase64: pdfBuffer.toString("base64"),
		};

		processLogs.push("3. PDF gerado com sucesso!");
		console.log(processLogs.join("\n"));

		return new Response(JSON.stringify({ success: true, file: fileResult }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				...corsHeaders,
			},
		});
	} catch (error) {
		processLogs.push(`[ERRO FATAL]: ${error.message}`);
		console.error("ERRO FATAL NO BACKEND:\n", processLogs.join("\n"));

		return new Response(
			JSON.stringify({
				success: false,
				error: error.message,
				debug_logs: processLogs,
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
					...corsHeaders,
				},
			},
		);
	}
};