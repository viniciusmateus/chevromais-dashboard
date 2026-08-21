import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import libre from "libreoffice-convert";

if (process.platform === "win32") {
	process.env.SOFFICE_PATH = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
}

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
		return await libre.convertAsync(docxBuffer, ".pdf", undefined);
	}
	return await new Promise((resolve, reject) => {
		libre.convert(docxBuffer, ".pdf", undefined, (err, done) => {
			if (err) reject(err);
			else resolve(done);
		});
	});
}

export const POST = async ({ request }) => {
	try {
		const data = await request.json();
		const { objection, empresa, disputeNumber, disputeDate, cityUF, buyer, details } = data;

		const today = new Date();
		const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
		const todayFormatted = `${today.getDate()} de ${monthNames[today.getMonth()]} de ${today.getFullYear()}`;

		const companyName = companyNamesMap[empresa] || empresa;
		const disputeNumberFormatted = (disputeNumber || "").replace(/\//g, "-");

		// Tratamento do Prazo de Entrega
		let deliveryStipulateFormat = "";
		if (details?.delivery?.deliveryUnit === "Imediata") {
			deliveryStipulateFormat = "IMEDIATA";
		} else if (details?.delivery?.deliveryStipulate) {
			const val = parseInt(details.delivery.deliveryStipulate, 10) || 0;
			const plural = val === 1 ? "" : "S";
			const prefix = val < 10 ? `0${val}` : `${val}`;
			const unit = details.delivery.deliveryUnit === "Horas" ? "HORA" : "DIA";
			deliveryStipulateFormat = `${prefix} ${unit}${plural}`;
		}

		// Tratamento de ENCE
		const selectedEnceSpecs = [];
		if (details?.ence?.enceSpecs?.traction) selectedEnceSpecs.push("ADERÊNCIA");
		if (details?.ence?.enceSpecs?.resistance) selectedEnceSpecs.push("RESISTÊNCIA");

		const selectedEnceLabels = details?.ence?.enceGrades ? Object.keys(details.ence.enceGrades).filter((key) => details.ence.enceGrades[key]) : [];
		const enceLabelFormat = selectedEnceLabels.length > 0 ? (selectedEnceLabels.length === 1 ? selectedEnceLabels[0] : selectedEnceLabels.slice(0, -1).join(", ") + " e " + selectedEnceLabels[selectedEnceLabels.length - 1]) : "";

		const templateFileName = `${empresa}-${objection}.docx`;
		const templatePath = path.join(process.cwd(), "public", "templates", templateFileName);

		if (!fs.existsSync(templatePath)) {
			return new Response(JSON.stringify({ success: false, error: `Template '${templateFileName}' não encontrado.` }), { status: 404, headers: { "Content-Type": "application/json" } });
		}

		const content = fs.readFileSync(templatePath, "binary");
		const zip = new PizZip(content);
		const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

		doc.render({
			company: companyName,
			disputeNumber: disputeNumber,
			disputeDate: disputeDate,
			cityUF: cityUF,
			buyer: buyer,
			deliveryStipulate: deliveryStipulateFormat,
			sampleObject: details?.sample?.sampleObject || "",
			sampleClause: details?.sample?.sampleClause || "",
			serviceType: details?.service?.serviceType || "",
			serviceObject: details?.service?.serviceObject || "",
			restrictionClause: details?.restriction?.restrictionClause || "",
			enceSpec: selectedEnceSpecs.join(" e "),
			enceLabel: enceLabelFormat,
			todayFormatted: todayFormatted,
		});

		const docxBuffer = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
		const pdfBuffer = await convertToPdf(docxBuffer);

		const filenameBase = `Impugnação ${objectionsMap[objection]} ${companyName} ${disputeNumberFormatted}`;

		return new Response(
			JSON.stringify({
				success: true,
				file: {
					objectionKey: objection,
					objectionName: objectionsMap[objection],
					pdfFilename: `${filenameBase}.pdf`,
					pdfBase64: pdfBuffer.toString("base64"),
				},
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("Erro no processamento:", error);
		return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
	}
};
