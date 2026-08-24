import React, { useState } from "react";

const CLOUD_RUN_API_URL = "https://pdfconverter-931850146140.southamerica-east1.run.app/api/gerar-documentos";

const companyOptions = [
	{ id: "chevromais", label: "Chevromais" },
	{ id: "autoluk", label: "Autoluk" },
	{ id: "lukauto", label: "Lukauto" },
	{ id: "curitibaPneus", label: "Curitiba Pneus" },
];

const objectionOptions = [
	{ id: "delivery", label: "Prazo de Entrega" },
	{ id: "sample", label: "Amostra" },
	{ id: "ence", label: "ENCE" },
	{ id: "service", label: "Serviço / Montagem" },
	{ id: "manufacturing", label: "Fabricação Nacional" },
	{ id: "abrafati", label: "ABRAFATI" },
	{ id: "abipti", label: "ABIPTI" },
	{ id: "restriction", label: "Restrição Regional" },
];

export default function Impugnar() {
	// --- Estados Gerais ---
	const [empresa, setEmpresa] = useState("chevromais");
	const [disputeNumber, setDisputeNumber] = useState("");
	const [disputeDate, setDisputeDate] = useState("");
	const [cityUF, setCityUF] = useState("");
	const [buyer, setBuyer] = useState("");
	const [otherBuyer, setOtherBuyer] = useState("");

	// --- Estado de Validação ---
	const [showErrors, setShowErrors] = useState(false);
	const [dateErrorMessage, setDateErrorMessage] = useState("");

	// --- Estados de Seleção de Impugnações ---
	const [selectedObjections, setSelectedObjections] = useState({
		delivery: false,
		sample: false,
		ence: false,
		service: false,
		manufacturing: false,
		abrafati: false,
		abipti: false,
		restriction: false,
	});

	// --- Estados Específicos por Impugnação ---
	const [deliveryStipulate, setDeliveryStipulate] = useState("");
	const [deliveryUnit, setDeliveryUnit] = useState("Dias");
	const [sampleObject, setSampleObject] = useState("");
	const [sampleClause, setSampleClause] = useState("");
	const [enceSpecs, setEnceSpecs] = useState({ traction: false, resistance: false });
	const [enceGrades, setEnceGrades] = useState({ A: false, B: false, C: false, D: false });
	const [serviceType, setServiceType] = useState("");
	const [serviceObject, setServiceObject] = useState("");
	const [restrictionClause, setRestrictionClause] = useState("");

	// --- Estados de Processamento e Resultados ---
	const [isProcessing, setIsProcessing] = useState(false);
	const [itemStatuses, setItemStatuses] = useState({});
	const [copiedStates, setCopiedStates] = useState({});

	const objectionsWithDetails = ["delivery", "sample", "ence", "service", "restriction"];
	const hasDetailsToShow = Object.keys(selectedObjections).some((key) => selectedObjections[key] && objectionsWithDetails.includes(key));

	// --- VALIDAÇÃO DE DATA ---
	const validateDate = (dateStr) => {
		if (dateStr.length < 10) return "Data incompleta";

		const [day, month, year] = dateStr.split("/").map(Number);
		const dateObj = new Date(year, month - 1, day);

		// Verifica se a data é válida no calendário (ex: 31/02 não existe)
		if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
			return "Data inválida";
		}

		// Verifica a diferença de dias
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const diffDays = Math.ceil((dateObj - today) / (1000 * 60 * 60 * 24));

		if (diffDays < 3) {
			return "A data deve ser ≥ 3 dias a partir de hoje";
		}

		return ""; // Válido
	};

	const handleDateChange = (e) => {
		let value = e.target.value.replace(/\D/g, "");
		if (value.length > 8) value = value.slice(0, 8);

		if (value.length > 4) {
			value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
		} else if (value.length > 2) {
			value = `${value.slice(0, 2)}/${value.slice(2)}`;
		}

		setDisputeDate(value);

		// Dispara a validação em tempo real ao completar a digitação
		if (value.length === 10) {
			setDateErrorMessage(validateDate(value));
		} else {
			setDateErrorMessage("");
		}
	};

	const handleObjectionToggle = (key) => setSelectedObjections((prev) => ({ ...prev, [key]: !prev[key] }));
	const handleEnceSpecToggle = (key) => setEnceSpecs((prev) => ({ ...prev, [key]: !prev[key] }));
	const handleEnceGradeToggle = (key) => setEnceGrades((prev) => ({ ...prev, [key]: !prev[key] }));

	// --- REGRA CORRIGIDA DO ÓRGÃO ---
	const getFinalBuyer = () => {
		if (buyer === "PREFEITURA MUNICIPAL DE") {
			return `${buyer} ${cityUF}`.trim();
		}
		if (buyer === "COM LOCALIDADE") {
			// Se possui localidade escrita no texto, ignoramos a variável da cidade
			return otherBuyer.trim();
		}
		if (buyer === "SEM LOCALIDADE") {
			// Se não possui localidade escrita, concatenamos a variável da cidade
			return otherBuyer ? `${otherBuyer} - ${cityUF}`.trim() : cityUF.trim();
		}
		return buyer;
	};

	// --- ESTILO DINÂMICO PARA INPUTS (BORDA VERMELHA) ---
	const getInputClassName = (isInvalid) => `p-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 font-medium w-full transition-all ${isInvalid ? "bg-red-500/5 border-red-500 text-zinc-200 focus:border-red-500 focus:ring-red-500 placeholder-red-400/50" : "bg-zinc-900 border-zinc-800 text-zinc-200 focus:border-lime-400 focus:ring-lime-400 placeholder-zinc-600"}`;
	const labelStyle = "text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block select-none";

	// --- GERAR DOCUMENTOS ---
	const handleGenerate = async () => {
		setShowErrors(true); // Ativa as bordas vermelhas caso existam erros

		// Validações obrigatórias
		const isDateValid = disputeDate.length === 10 && validateDate(disputeDate) === "";
		const isOtherBuyerValid = buyer === "COM LOCALIDADE" || buyer === "SEM LOCALIDADE" ? otherBuyer.trim() !== "" : true;

		if (!disputeNumber.trim() || !disputeDate.trim() || !cityUF.trim() || !buyer || !isOtherBuyerValid || !isDateValid) {
			if (disputeDate.length < 10) setDateErrorMessage("Preencha a data completa");
			return; // Bloqueia a execução
		}

		const activeObjections = Object.keys(selectedObjections).filter((key) => selectedObjections[key]);
		if (activeObjections.length === 0) {
			alert("Selecione ao menos uma impugnação.");
			return;
		}

		setIsProcessing(true);

		const initialStatuses = {};
		activeObjections.forEach((key) => {
			initialStatuses[key] = { status: "pending", file: null, error: null };
		});
		setItemStatuses(initialStatuses);

		const selectedEnceSpecs = [];
		if (enceSpecs.traction) selectedEnceSpecs.push("Aderência");
		if (enceSpecs.resistance) selectedEnceSpecs.push("Resistência");
		const selectedEnceGrades = Object.keys(enceGrades).filter((grade) => enceGrades[grade]);

		const orgaoFormatado = getFinalBuyer();

		const tasks = activeObjections.map(async (objectionKey) => {
			setItemStatuses((prev) => ({
				...prev,
				[objectionKey]: { ...prev[objectionKey], status: "processing" },
			}));

			const payload = {
				empresa,
				numeroEdital: disputeNumber,
				dataEdital: disputeDate,
				municipioUF: cityUF,
				orgao: orgaoFormatado,
				objection: objectionKey,
				prazoEntrega: { prazo: deliveryStipulate, unidade: deliveryUnit },
				amostra: { objeto: sampleObject, clausulas: sampleClause },
				ence: { especificacoes: selectedEnceSpecs, classificacoes: selectedEnceGrades },
				servicoMontagem: { tiposServico: serviceType, objetoServico: serviceObject },
				restricaoRegional: { clausulas: restrictionClause },
			};

			try {
				const response = await fetch(CLOUD_RUN_API_URL, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});

				if (response.ok) {
					const contentType = response.headers.get("content-type");

					if (contentType && contentType.includes("application/pdf")) {
						const blob = await response.blob();
						const pdfUrl = URL.createObjectURL(blob);
						const labelName = objectionOptions.find((o) => o.id === objectionKey)?.label || objectionKey;

						setItemStatuses((prev) => ({
							...prev,
							[objectionKey]: { status: "success", file: { pdfUrl, pdfFilename: `Impugnacao_${objectionKey}_${disputeNumber || "edital"}.pdf`, objectionKey, objectionName: labelName }, error: null },
						}));
					} else {
						const result = await response.json();
						setItemStatuses((prev) => ({
							...prev,
							[objectionKey]: { status: "success", file: { pdfUrl: result.file?.pdfBase64 ? `data:application/pdf;base64,${result.file.pdfBase64}` : result.file?.url, pdfFilename: result.file?.pdfFilename || `Impugnacao_${objectionKey}.pdf`, objectionKey, objectionName: result.file?.objectionName || objectionKey }, error: null },
						}));
					}
				} else {
					const errorData = await response.json().catch(() => ({}));
					setItemStatuses((prev) => ({
						...prev,
						[objectionKey]: { status: "error", file: null, error: errorData.error || `Erro HTTP ${response.status}` },
					}));
				}
			} catch (err) {
				setItemStatuses((prev) => ({
					...prev,
					[objectionKey]: { status: "error", file: null, error: "Erro de conexão com a API." },
				}));
			}
		});

		await Promise.allSettled(tasks);
		setIsProcessing(false);
	};

	const handleCopy = (type, file) => {
		let text = "";
		const finalBuyer = getFinalBuyer();

		if (type === "assunto") {
			text = `PE ${disputeNumber} - ${finalBuyer} - IMPUGNAÇÃO REFERENTE A ${file.objectionName}`;
		} else if (type === "mensagem") {
			text = `Prezado(a) Sr(a). Pregoeiro(a).\n\nSegue anexo nosso pedido de impugnação referente a ${file.objectionName}, no qual é mencionado no presente edital.\n\n`;
		}

		navigator.clipboard.writeText(text);

		const key = `${file.objectionKey}-${type}`;
		setCopiedStates((prev) => ({ ...prev, [key]: true }));
		setTimeout(() => setCopiedStates((prev) => ({ ...prev, [key]: false })), 2000);
	};

	const totalItems = Object.keys(itemStatuses).length;
	const completedItems = Object.values(itemStatuses).filter((item) => item.status === "success" || item.status === "error").length;
	const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

	return (
		<div className="p-6 flex flex-col gap-6 max-w-6xl mx-auto bg-zinc-950 text-zinc-200 min-h-screen">
			{/* PAINEL EMPRESA E INFORMAÇÕES */}
			<div className="bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 shadow-xl flex flex-col gap-6">
				<div>
					<h2 className="text-xs font-bold uppercase tracking-wider text-lime-400 select-none mb-3">› Empresa</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
						{companyOptions.map((item) => (
							<button key={item.id} type="button" onClick={() => setEmpresa(item.id)} className={`py-2.5 px-4 rounded-lg font-bold text-sm transition-all border ${empresa === item.id ? "bg-lime-400 text-zinc-950 border-lime-400 shadow-md shadow-lime-400/10" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"}`}>
								{item.label}
							</button>
						))}
					</div>
				</div>

				<div className="border-t border-zinc-800/80 pt-5">
					<h2 className="text-xs font-bold uppercase tracking-wider text-lime-400 select-none mb-3">› Informações Gerais</h2>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<label className={labelStyle}>Número</label>
							<input type="text" className={getInputClassName(showErrors && !disputeNumber.trim())} value={disputeNumber} onChange={(e) => setDisputeNumber(e.target.value.toUpperCase())} />
						</div>
						<div>
							<label className={labelStyle}>Data</label>
							<input type="text" placeholder="DD/MM/AAAA" maxLength={10} className={getInputClassName((showErrors && !disputeDate) || !!dateErrorMessage)} value={disputeDate} onChange={handleDateChange} />
							{dateErrorMessage && <span className="text-red-500 text-[11px] font-bold mt-1.5 block">{dateErrorMessage}</span>}
						</div>
						<div>
							<label className={labelStyle}>Município - UF</label>
							<input type="text" className={getInputClassName(showErrors && !cityUF.trim())} value={cityUF} onChange={(e) => setCityUF(e.target.value.toUpperCase())} />
						</div>
						<div>
							<label className={labelStyle}>Órgão</label>
							<select
								value={buyer}
								onChange={(e) => {
									setBuyer(e.target.value);
									if (e.target.value === "PREFEITURA MUNICIPAL DE") setOtherBuyer("");
								}}
								className={`${getInputClassName(showErrors && !buyer)} h-[42px] cursor-pointer`}
							>
								<option value="" disabled className="bg-zinc-900 text-zinc-500">
									-- Selecione --
								</option>
								<option value="PREFEITURA MUNICIPAL DE" className="bg-zinc-900 text-zinc-200">
									PREFEITURA MUNICIPAL
								</option>
								<option value="SEM LOCALIDADE" className="bg-zinc-900 text-zinc-200">
									SEM LOCALIDADE
								</option>
								<option value="COM LOCALIDADE" className="bg-zinc-900 text-zinc-200">
									COM LOCALIDADE
								</option>
							</select>
						</div>
					</div>

					{(buyer === "COM LOCALIDADE" || buyer === "SEM LOCALIDADE") && (
						<div className="mt-4">
							<label className={labelStyle}>{buyer === "COM LOCALIDADE" ? "Nome do Órgão (Com Localidade)" : "Nome do Órgão (Sem Localidade)"}</label>
							<input type="text" className={getInputClassName(showErrors && !otherBuyer.trim())} value={otherBuyer} onChange={(e) => setOtherBuyer(e.target.value.toUpperCase())} />
						</div>
					)}
				</div>
			</div>

			{/* SELEÇÃO DE IMPUGNAÇÕES */}
			<div className="bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 shadow-xl">
				<h2 className="text-xs font-bold uppercase tracking-wider text-lime-400 select-none mb-3">› Impugnações</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
					{objectionOptions.map((item) => {
						const active = selectedObjections[item.id];
						return (
							<button key={item.id} type="button" onClick={() => handleObjectionToggle(item.id)} className={`py-2.5 px-3 rounded-lg font-semibold text-xs md:text-sm transition-all border ${active ? "bg-lime-400/10 text-lime-400 border-lime-400/50 ring-1 ring-lime-400/30 shadow-md" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"}`}>
								{item.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* DETALHES */}
			{hasDetailsToShow && (
				<div className="bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 shadow-xl flex flex-col gap-6">
					<h2 className="text-xs font-bold uppercase tracking-wider text-lime-400 select-none border-b border-zinc-800 pb-3">› Detalhes das Impugnações</h2>

					{selectedObjections.delivery && (
						<div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-lg flex flex-col gap-3">
							<h3 className="font-bold text-zinc-200 text-sm">Prazo de Entrega</h3>
							<div className="flex flex-col md:flex-row items-end gap-4">
								<div className="flex-1 w-full">
									<label className={labelStyle}>Prazo Estipulado</label>
									<input type="text" className={getInputClassName(false)} value={deliveryStipulate} onChange={(e) => setDeliveryStipulate(e.target.value.toUpperCase())} />
								</div>
								<div className="flex gap-2 w-full md:w-auto">
									{["Horas", "Dias", "Imediata"].map((unit) => (
										<button key={unit} type="button" onClick={() => setDeliveryUnit(unit)} className={`flex-1 md:flex-none py-2.5 px-4 rounded-lg font-bold text-xs border transition-all ${deliveryUnit === unit ? "bg-lime-400 text-zinc-950 border-lime-400" : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"}`}>
											{unit}
										</button>
									))}
								</div>
							</div>
						</div>
					)}

					{selectedObjections.sample && (
						<div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-lg flex flex-col gap-3">
							<h3 className="font-bold text-zinc-200 text-sm">Amostra</h3>
							<div className="flex flex-col gap-3">
								<div>
									<label className={labelStyle}>Objeto(s) de Amostra</label>
									<input type="text" className={getInputClassName(false)} value={sampleObject} onChange={(e) => setSampleObject(e.target.value.toUpperCase())} />
								</div>
								<div>
									<label className={labelStyle}>Cláusulas da Amostra</label>
									<textarea rows={3} value={sampleClause} onChange={(e) => setSampleClause(e.target.value)} className={getInputClassName(false)} placeholder="Insira as cláusulas de amostra..." />
								</div>
							</div>
						</div>
					)}

					{selectedObjections.ence && (
						<div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-lg flex flex-col gap-4">
							<h3 className="font-bold text-zinc-200 text-sm">ENCE</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Especificação</p>
									<div className="flex gap-2">
										{[
											{ key: "traction", label: "Aderência" },
											{ key: "resistance", label: "Resistência" },
										].map(({ key, label }) => (
											<button key={key} type="button" onClick={() => handleEnceSpecToggle(key)} className={`py-2 px-3 rounded-lg font-bold text-xs border transition-all ${enceSpecs[key] ? "bg-lime-400 text-zinc-950 border-lime-400" : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"}`}>
												{label}
											</button>
										))}
									</div>
								</div>
								<div>
									<p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Classificação (Grade)</p>
									<div className="flex gap-2">
										{["A", "B", "C", "D"].map((grade) => (
											<button key={grade} type="button" onClick={() => handleEnceGradeToggle(grade)} className={`py-2 px-3.5 rounded-lg font-bold text-xs border transition-all ${enceGrades[grade] ? "bg-lime-400 text-zinc-950 border-lime-400" : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"}`}>
												{grade}
											</button>
										))}
									</div>
								</div>
							</div>
						</div>
					)}

					{selectedObjections.service && (
						<div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-lg flex flex-col gap-3">
							<h3 className="font-bold text-zinc-200 text-sm">Serviço / Montagem</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div>
									<label className={labelStyle}>Tipo(s) de Serviço(s)</label>
									<input type="text" className={getInputClassName(false)} value={serviceType} onChange={(e) => setServiceType(e.target.value.toUpperCase())} />
								</div>
								<div>
									<label className={labelStyle}>Objeto(s) do Serviço</label>
									<input type="text" className={getInputClassName(false)} value={serviceObject} onChange={(e) => setServiceObject(e.target.value.toUpperCase())} />
								</div>
							</div>
						</div>
					)}

					{selectedObjections.restriction && (
						<div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-lg flex flex-col gap-3">
							<h3 className="font-bold text-zinc-200 text-sm">Restrição Regional</h3>
							<div>
								<label className={labelStyle}>Cláusulas da Restrição</label>
								<textarea rows={3} value={restrictionClause} onChange={(e) => setRestrictionClause(e.target.value)} className={getInputClassName(false)} placeholder="Insira as cláusulas relativas à restrição..." />
							</div>
						</div>
					)}
				</div>
			)}

			{/* BOTÃO GERAR */}
			<div className="flex justify-end bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 shadow-xl">
				<button type="button" onClick={handleGenerate} disabled={isProcessing} className="bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold py-3 px-8 rounded-lg transition-all text-sm shadow-lg shadow-lime-400/20 disabled:opacity-40 disabled:cursor-not-allowed">
					{isProcessing ? "Gerando Documentos..." : "Gerar Documento(s)"}
				</button>
			</div>

			{/* PAINEL DE PROGRESSO */}
			{totalItems > 0 && (
				<div className="bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 shadow-2xl flex flex-col gap-5 backdrop-blur-sm">
					<div className="flex flex-col gap-2.5">
						<div className="flex justify-between items-end">
							<div>
								<span className="text-[10px] font-extrabold uppercase tracking-wider text-lime-400/80 block">Processamento em Tempo Real</span>
								<h2 className="text-sm font-bold text-zinc-100">Progresso Geral</h2>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-xs font-mono font-bold text-lime-400 bg-lime-400/10 px-2.5 py-1 rounded-md border border-lime-400/20">
									{completedItems} / {totalItems} concluidos
								</span>
								<span className="text-xs font-mono font-extrabold text-zinc-200">{progressPercentage}%</span>
							</div>
						</div>

						<div className="w-full h-2.5 bg-zinc-950 rounded-full p-0.5 border border-zinc-800/80 relative overflow-hidden">
							<div className="h-full bg-gradient-to-r from-lime-500 to-lime-300 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(163,230,53,0.4)]" style={{ width: `${progressPercentage}%` }} />
						</div>
					</div>

					<div className="flex flex-col gap-2.5">
						{Object.keys(itemStatuses).map((key) => {
							const item = itemStatuses[key];
							const label = objectionOptions.find((o) => o.id === key)?.label || key;

							return (
								<div key={key} className={`flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-lg border transition-all ${item.status === "success" ? "bg-zinc-950/80 border-lime-400/30 shadow-sm shadow-lime-400/5" : item.status === "processing" ? "bg-zinc-900/90 border-lime-400/50 ring-1 ring-lime-400/20" : item.status === "error" ? "bg-zinc-950/80 border-red-500/30" : "bg-zinc-950/40 border-zinc-800/60 opacity-60"}`}>
									<div className="flex items-center gap-3 mb-2 md:mb-0">
										<div className="relative flex items-center justify-center w-3 h-3">
											{item.status === "pending" && <span className="w-2 h-2 rounded-full bg-zinc-600" />}
											{item.status === "processing" && (
												<>
													<span className="absolute w-3 h-3 rounded-full bg-lime-400/40 animate-ping" />
													<span className="w-2 h-2 rounded-full bg-lime-400" />
												</>
											)}
											{item.status === "success" && <span className="w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.8)]" />}
											{item.status === "error" && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
										</div>
										<span className="font-bold text-zinc-200 text-xs md:text-sm">{label}</span>
									</div>

									<div>
										{item.status === "pending" && <span className="text-xs font-medium text-zinc-500">Aguardando...</span>}
										{item.status === "processing" && (
											<span className="text-xs font-bold text-lime-400 animate-pulse flex items-center gap-1.5">
												<svg className="animate-spin h-3.5 w-3.5 text-lime-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
												</svg>
												Gerando PDF na API...
											</span>
										)}
										{item.status === "error" && <span className="text-xs font-semibold text-red-400">{item.error}</span>}
										{item.status === "success" && item.file && (
											<div className="flex flex-wrap gap-2">
												<a href={item.file.pdfUrl} download={item.file.pdfFilename} className="py-1.5 px-3 rounded-lg font-bold text-xs bg-lime-400 text-zinc-950 hover:bg-lime-300 transition-all shadow-sm shadow-lime-400/20">
													Download PDF
												</a>
												<button onClick={() => handleCopy("assunto", item.file)} className="py-1.5 px-3 rounded-lg font-bold text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-all">
													{copiedStates[`${item.file.objectionKey}-assunto`] ? "Copiado!" : "Copiar Assunto"}
												</button>
												<button onClick={() => handleCopy("mensagem", item.file)} className="py-1.5 px-3 rounded-lg font-bold text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-all">
													{copiedStates[`${item.file.objectionKey}-mensagem`] ? "Copiado!" : "Copiar Mensagem"}
												</button>
											</div>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
