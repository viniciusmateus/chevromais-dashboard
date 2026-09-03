import React, { useState, useRef } from "react";
import JSZip from "jszip";
import { FiUploadCloud, FiDownload, FiRefreshCw, FiPrinter, FiAlertCircle } from "react-icons/fi";

export default function ConversorZPL() {
	const [pdfUrl, setPdfUrl] = useState(null);

	// Estados reduzidos para simplificar o fluxo: 'idle' | 'processing' | 'success'
	const [status, setStatus] = useState("idle");
	const [message, setMessage] = useState({ type: "", text: "" });

	const fileInputRef = useRef(null);

	const handleDragOver = (e) => {
		e.preventDefault();
	};

	const handleDrop = (e) => {
		e.preventDefault();
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			processZipFile(e.dataTransfer.files[0]);
		}
	};

	const handleFileInput = (e) => {
		if (e.target.files && e.target.files.length > 0) {
			processZipFile(e.target.files[0]);
		}
	};

	const triggerFileInput = () => {
		fileInputRef.current?.click();
	};

	const processZipFile = async (selectedFile) => {
		// Validação mais amigável
		if (!selectedFile.name.endsWith(".zip") && selectedFile.type !== "application/zip") {
			setMessage({ type: "error", text: "Formato inválido! Envie apenas o arquivo .zip baixado do painel." });
			return;
		}

		// Já inicia o modo de carregamento imediatamente
		setStatus("processing");
		setMessage({ type: "", text: "" });

		try {
			const zip = new JSZip();
			const zipData = await zip.loadAsync(selectedFile);

			const txtFilename = Object.keys(zipData.files).find((name) => name.toLowerCase().endsWith(".txt"));

			if (!txtFilename) {
				setStatus("idle");
				setMessage({ type: "error", text: "Nenhuma etiqueta encontrada dentro deste arquivo ZIP." });
				return;
			}

			const extractedZpl = await zipData.files[txtFilename].async("string");

			// Passa o conteúdo limpo direto para a conversão, sem exigir clique do usuário
			await startConversion(extractedZpl.trim());
		} catch (error) {
			console.error("Erro ao ler ZIP:", error);
			setStatus("idle");
			setMessage({ type: "error", text: "Erro ao abrir o arquivo. Tente novamente." });
		}
	};

	const startConversion = async (zplContent) => {
		if (!zplContent) return;

		try {
			const response = await fetch("https://api.labelary.com/v1/printers/8dpmm/labels/4x6/", {
				method: "POST",
				headers: {
					Accept: "application/pdf",
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: zplContent,
			});

			if (!response.ok) {
				throw new Error("Falha na comunicação com o gerador.");
			}

			const blob = await response.blob();
			const objectUrl = URL.createObjectURL(blob);

			setPdfUrl(objectUrl);
			setStatus("success");
		} catch (error) {
			console.error("Erro na API:", error);
			setStatus("idle");
			setMessage({ type: "error", text: "Erro ao gerar o PDF. Verifique sua conexão e tente novamente." });
		}
	};

	const handlePrint = () => {
		if (pdfUrl) {
			window.open(pdfUrl, "_blank");
		}
	};

	const handleReset = () => {
		if (pdfUrl) URL.revokeObjectURL(pdfUrl);
		setPdfUrl(null);
		setStatus("idle");
		setMessage({ type: "", text: "" });
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	return (
		<div className="w-full flex items-center justify-center p-4 min-h-[calc(100vh-100px)]">
			<div className="w-full max-w-xl bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl p-8 transition-all duration-300">
				<div className="text-center mb-8">
					<h2 className="text-2xl font-bold text-white mb-2 tracking-wide">Impressão de Etiquetas</h2>
					<p className="text-sm text-neutral-400">Envie o arquivo das suas vendas para gerar o PDF de impressão.</p>
				</div>

				{message.text && (
					<div className="flex items-center gap-3 p-4 rounded-lg mb-6 border bg-red-500/10 border-red-500/30 text-red-400">
						<FiAlertCircle className="w-5 h-5 shrink-0" />
						<span className="text-sm font-medium">{message.text}</span>
					</div>
				)}

				{status === "idle" && (
					<div className="relative group flex flex-col items-center justify-center py-14 px-6 border-2 border-dashed border-neutral-700 hover:border-lime-500/50 rounded-xl cursor-pointer hover:bg-neutral-800/50 transition-all duration-300" onDragOver={handleDragOver} onDrop={handleDrop} onClick={triggerFileInput}>
						<input type="file" ref={fileInputRef} onChange={handleFileInput} accept=".zip,application/zip" className="hidden" />

						<div className="bg-neutral-800 p-5 rounded-full mb-5 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(132,204,22,0.3)] transition-all duration-300 border border-neutral-700 group-hover:border-lime-500/30">
							<FiUploadCloud className="w-8 h-8 text-lime-400" />
						</div>

						<p className="text-neutral-200 font-medium mb-2 text-lg text-center">Clique ou arraste o arquivo ZIP aqui</p>
						<p className="text-sm text-neutral-500 font-medium text-center">As etiquetas serão preparadas automaticamente</p>
					</div>
				)}

				{status === "processing" && (
					<div className="flex flex-col items-center justify-center py-14 px-6 border border-neutral-800 rounded-xl bg-neutral-800/30">
						<FiRefreshCw className="w-12 h-12 text-lime-400 animate-spin mb-6" />
						<p className="text-neutral-200 font-medium text-lg mb-2">Preparando suas etiquetas...</p>
						<p className="text-sm text-neutral-500">Isso leva apenas alguns segundos.</p>
					</div>
				)}

				{status === "success" && (
					<div className="flex flex-col items-center text-center py-8 border border-neutral-800 rounded-xl bg-neutral-900/50">
						<h3 className="text-xl font-bold text-lime-400 mb-6">Etiquetas prontas!</h3>

						<div className="w-full max-w-sm space-y-4 px-4">
							<button onClick={handlePrint} className="w-full flex items-center justify-center gap-3 bg-lime-500 hover:bg-lime-400 text-neutral-950 font-bold py-4 px-4 rounded-lg transition-all shadow-[0_0_20px_rgba(132,204,22,0.15)] hover:shadow-[0_0_25px_rgba(132,204,22,0.3)] hover:-translate-y-0.5">
								<FiPrinter className="w-6 h-6" />
								Imprimir Agora
							</button>

							<div className="flex gap-3 pt-2">
								<a href={pdfUrl} download={`etiquetas_vendas_${new Date().getTime()}.pdf`} className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 font-medium py-3 px-4 rounded-lg transition-colors text-sm">
									<FiDownload className="w-4 h-4" />
									Salvar PDF
								</a>

								<button onClick={handleReset} className="flex-1 flex items-center justify-center gap-2 bg-transparent hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700 font-medium py-3 px-4 rounded-lg transition-colors text-sm">
									<FiRefreshCw className="w-4 h-4" />
									Novo Arquivo
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
