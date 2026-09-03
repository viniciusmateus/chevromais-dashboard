import React, { useState, useMemo, useRef, useEffect } from "react";

export default function LineItem({
	index,
	totalLines,
	lineData,
	margin,
	brands,
	models,
	disabled,
	lineErrors,
	onChange,
	onToggleBatchSwitch,
}) {
	const [modeloInput, setModeloInput] = useState(lineData.modelo?.name || "");
	const [marcaInput, setMarcaInput] = useState(lineData.marca?.name || "");
	const [showModeloSuggestions, setShowModeloSuggestions] = useState(false);
	const [showMarcaSuggestions, setShowMarcaSuggestions] = useState(false);

	const [activeModeloIndex, setActiveModeloIndex] = useState(0);
	const [activeMarcaIndex, setActiveMarcaIndex] = useState(0);

	const [custoText, setCustoText] = useState(
		lineData.custoBase
			? Number(lineData.custoBase).toLocaleString("pt-BR", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
			  })
			: ""
	);

	const modeloRef = useRef(null);
	const marcaRef = useRef(null);
	const custoRef = useRef(null);

	useEffect(() => {
		if (lineData.modelo?.name !== undefined && lineData.modelo.name !== modeloInput) {
			setModeloInput(lineData.modelo.name);
		}
		if (lineData.marca?.name !== undefined && lineData.marca.name !== marcaInput) {
			setMarcaInput(lineData.marca.name);
		}
	}, [lineData.modelo, lineData.marca]);

	const parsedMargin = useMemo(() => {
		if (!margin || String(margin).trim() === "") return null;
		const cleaned = String(margin).replace(".", "").replace(",", ".");
		const num = parseFloat(cleaned);
		return isNaN(num) ? null : num;
	}, [margin]);

	const evaluateMathExpression = (expr) => {
		if (!expr || !String(expr).trim()) return 0;
		try {
			const normalized = String(expr).replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.+-/*]/g, "");
			if (!normalized) return 0;
			// eslint-disable-next-line no-eval
			const res = Function(`'use strict'; return (${normalized})`)();
			return isNaN(res) || !isFinite(res) ? 0 : res;
		} catch {
			return 0;
		}
	};

	const custoNumerico = useMemo(() => evaluateMathExpression(custoText), [custoText]);

	const handleCustoChange = (e) => {
		let val = e.target.value.replace(/[^0-9.,+\-*/]/g, "");
		const terms = val.split(/[+\-*/]/);
		if ((terms[terms.length - 1].match(/,/g) || []).length > 1) return;
		setCustoText(val);
	};

	const finalizeCusto = () => {
		const calculated = evaluateMathExpression(custoText);
		if (calculated > 0) {
			setCustoText(calculated.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
		} else {
			setCustoText("");
		}
	};

	const { valorUnitarioCalculado, valorTotalLinha } = useMemo(() => {
		if (!custoNumerico || custoNumerico <= 0 || parsedMargin === null) return { valorUnitarioCalculado: 0, valorTotalLinha: 0 };
		const baseUnitaria = custoNumerico * (1 + parsedMargin / 100);
		const unitarioArredondado = Math.ceil(baseUnitaria * 100) / 100;
		const qtde = lineData.qtde || 1;
		return {
			valorUnitarioCalculado: unitarioArredondado,
			valorTotalLinha: Math.ceil(unitarioArredondado * qtde * 100) / 100,
		};
	}, [custoNumerico, parsedMargin, lineData.qtde]);

	const variacaoReferencia = useMemo(() => {
		if (!lineData.refValue || lineData.refValue <= 0 || !valorUnitarioCalculado) return null;
		return ((valorUnitarioCalculado - lineData.refValue) / lineData.refValue) * 100;
	}, [valorUnitarioCalculado, lineData.refValue]);

	const statusMargem = useMemo(() => {
		if (variacaoReferencia === null) return "neutro";
		if (variacaoReferencia <= -5) return "ok";
		if (variacaoReferencia <= 0) return "atencao";
		return "cautela";
	}, [variacaoReferencia]);

	useEffect(() => {
		const valorFinal = lineData.switchChecked ? valorTotalLinha : valorUnitarioCalculado;
		onChange(index, {
			custoBase: custoNumerico,
			valorCalculado: valorFinal,
			valorUnitarioCalculado,
			valorTotalCalculado: valorTotalLinha,
		});
	}, [custoNumerico, valorUnitarioCalculado, valorTotalLinha, lineData.switchChecked]);

	const filteredModelos = useMemo(() => {
		if (!modeloInput.trim()) return [];
		const search = modeloInput.toLowerCase().trim();
		const uniqueMap = new Map();
		models.forEach((m) => {
			if (m.name.toLowerCase().includes(search)) {
				const key = m.name.toLowerCase();
				if (!uniqueMap.has(key)) uniqueMap.set(key, m);
			}
		});
		const matches = Array.from(uniqueMap.values());
		if (!matches.some((m) => m.name.toLowerCase() === search)) {
			matches.push({ id: null, name: modeloInput.trim(), custom: true });
		}
		return matches;
	}, [modeloInput, models]);

	const filteredMarcas = useMemo(() => {
		let searchList = brands;
		if (modeloInput.trim()) {
			const modNameLower = modeloInput.trim().toLowerCase();
			const matchingModelRecords = models.filter((m) => m.name.toLowerCase() === modNameLower && m.brand_id);
			if (matchingModelRecords.length > 0) {
				const brandIds = new Set(matchingModelRecords.map((m) => String(m.brand_id)));
				searchList = brands.filter((b) => brandIds.has(String(b.id)));
			}
		}
		if (marcaInput.trim()) {
			const search = marcaInput.toLowerCase().trim();
			searchList = searchList.filter((b) => b.name.toLowerCase().includes(search));
			if (!searchList.some((b) => b.name.toLowerCase() === search)) {
				searchList.push({ id: null, name: marcaInput.trim(), custom: true });
			}
		}
		return searchList;
	}, [marcaInput, modeloInput, brands, models]);

	const handleSelectModelo = (m) => {
		setModeloInput(m.name);
		setShowModeloSuggestions(false);
		setActiveModeloIndex(0);

		const modNameLower = m.name.toLowerCase();
		const matchingModelRecords = models.filter((item) => item.name.toLowerCase() === modNameLower);

		if (matchingModelRecords.length === 1 && matchingModelRecords[0].brand_id) {
			const linkedBrand = brands.find((b) => String(b.id) === String(matchingModelRecords[0].brand_id));
			if (linkedBrand) {
				setMarcaInput(linkedBrand.name);
				onChange(index, { modelo: matchingModelRecords[0], marca: linkedBrand });
				setTimeout(() => document.querySelector(`[data-modelo-index="${index + 1}"]`)?.focus(), 10);
				return;
			}
		}

		onChange(index, { modelo: m, marca: null });
		setMarcaInput("");
		setTimeout(() => {
			setShowMarcaSuggestions(true);
			marcaRef.current?.focus();
		}, 10);
	};

	const handleSelectMarca = (b) => {
		setMarcaInput(b.name);
		setShowMarcaSuggestions(false);
		setActiveMarcaIndex(0);

		let modelRecordToSave = lineData.modelo;
		if (modeloInput && b.id) {
			const exactModelWithBrand = models.find(
				(m) => m.name.toLowerCase() === modeloInput.trim().toLowerCase() && String(m.brand_id) === String(b.id)
			);
			if (exactModelWithBrand) modelRecordToSave = exactModelWithBrand;
		}

		onChange(index, { modelo: modelRecordToSave, marca: b });
		setTimeout(() => document.querySelector(`[data-modelo-index="${index + 1}"]`)?.focus(), 10);
	};

	const handleKeyDownModelo = (e) => {
		if (!showModeloSuggestions || filteredModelos.length === 0) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveModeloIndex((prev) => Math.min(prev + 1, filteredModelos.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveModeloIndex((prev) => Math.max(prev - 1, 0));
		} else if (e.key === "Enter" || e.key === "Tab") {
			e.preventDefault();
			handleSelectModelo(filteredModelos[activeModeloIndex]);
		}
	};

	const handleKeyDownMarca = (e) => {
		if (!showMarcaSuggestions || filteredMarcas.length === 0) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveMarcaIndex((prev) => Math.min(prev + 1, filteredMarcas.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveMarcaIndex((prev) => Math.max(prev - 1, 0));
		} else if (e.key === "Enter" || e.key === "Tab") {
			e.preventDefault();
			handleSelectMarca(filteredMarcas[activeMarcaIndex]);
		}
	};

	const handleKeyDownCusto = (e) => {
		if (e.key === "Enter" || e.key === "Tab") {
			e.preventDefault();
			finalizeCusto();
			if (index + 1 < totalLines) {
				document.querySelector(`[data-custo-index="${index + 1}"]`)?.focus();
			} else {
				document.querySelector(`[data-modelo-index="0"]`)?.focus();
			}
		}
	};

	const modeloTextColor = useMemo(() => {
		if (lineData.modelo && lineData.modelo.name === modeloInput) {
			return lineData.modelo.custom ? "text-yellow-400" : "text-lime-400";
		}
		return "text-zinc-100";
	}, [lineData.modelo, modeloInput]);

	const marcaTextColor = useMemo(() => {
		if (lineData.marca && lineData.marca.name === marcaInput) {
			return lineData.marca.custom ? "text-yellow-400" : "text-lime-400";
		}
		return "text-zinc-100";
	}, [lineData.marca, marcaInput]);

	const isLineComplete = useMemo(() => {
		const temModelo = Boolean(lineData.modelo && lineData.modelo.name);
		const temMarca = Boolean(lineData.marca && lineData.marca.name);
		const temCusto = custoNumerico > 0;
		return temModelo && temMarca && temCusto;
	}, [lineData.modelo, lineData.marca, custoNumerico]);

	const hasError = lineErrors && lineErrors.length > 0;
	const borderColorClass = hasError
		? "border-red-500 shadow-red-900/20"
		: isLineComplete
		? "border-lime-400 shadow-lime-950/20"
		: "border-zinc-800";

	return (
		<div
			id={`line-${index}`}
			className={`bg-zinc-900 border rounded-2xl p-4 flex flex-wrap lg:flex-nowrap items-center gap-3 shadow-xl transition-all ${borderColorClass} ${disabled ? "opacity-40 pointer-events-none" : "hover:border-zinc-700"}`}
		>
			{/* Lote e Item */}
			<div className="flex items-center gap-1.5">
				<div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 px-2.5 text-center min-w-[52px]">
					<span className="text-[10px] text-zinc-500 font-extrabold uppercase block">Lote</span>
					<span className="text-sm font-extrabold text-zinc-100">{String(lineData.lote).padStart(4, "0")}</span>
				</div>
				<div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 px-2.5 text-center min-w-[52px]">
					<span className="text-[10px] text-zinc-500 font-extrabold uppercase block">Item</span>
					<span className="text-sm font-extrabold text-zinc-100">{String(lineData.item).padStart(4, "0")}</span>
				</div>
			</div>

			{/* Quantidade */}
			<div className="bg-zinc-950 border border-zinc-800 focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400 rounded-xl p-2 px-3 flex flex-col items-center min-w-[115px] transition-all">
				<span className="text-[10px] text-zinc-500 font-extrabold uppercase mb-1 block">Qtd.</span>
				<div className="flex items-center gap-1.5">
					<button type="button" onClick={() => onChange(index, { qtde: Math.max(1, (lineData.qtde || 1) - 1) })} className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm flex items-center justify-center">-</button>
					<input type="text" value={lineData.qtde || 1} onChange={(e) => onChange(index, { qtde: parseInt(e.target.value.replace(/\D/g, ""), 10) || 1 })} onFocus={(e) => e.target.select()} className="w-10 text-center bg-zinc-900 border-none rounded-lg text-sm font-extrabold text-zinc-100 outline-none focus:outline-none focus:ring-0" />
					<button type="button" onClick={() => onChange(index, { qtde: Math.max(1, (lineData.qtde || 1) + 1) })} className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm flex items-center justify-center">+</button>
				</div>
			</div>

			{/* Ref Unitária */}
			<div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 px-3.5 min-w-[130px]">
				<span className="text-[10px] text-zinc-500 font-extrabold uppercase block">Ref. Unitária</span>
				<span className="text-sm font-extrabold text-zinc-300 block mt-0.5">R$ {Number(lineData.refValue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
			</div>

			{/* 1. MODELO */}
			<div className="relative flex-[1.6] min-w-[220px]">
				<label className={`text-[11px] font-extrabold uppercase mb-1 block ${hasError && lineErrors.includes("Modelo") ? "text-red-400" : "text-zinc-400"}`}>Modelo</label>
				<input
					ref={modeloRef}
					data-modelo-index={index}
					value={modeloInput}
					onChange={(e) => {
						setModeloInput(e.target.value);
						setShowModeloSuggestions(true);
						setActiveModeloIndex(0);
					}}
					onFocus={(e) => { e.target.select(); setShowModeloSuggestions(true); }}
					onKeyDown={handleKeyDownModelo}
					onBlur={() => setTimeout(() => setShowModeloSuggestions(false), 200)}
					placeholder="DIGITE O MODELO"
					className={`w-full bg-zinc-950 border p-2.5 px-3.5 rounded-xl text-base font-extrabold uppercase focus:outline-none focus:ring-1 ${
						hasError && lineErrors.includes("Modelo") ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-zinc-700 focus:border-lime-400 focus:ring-lime-400"
					} ${modeloTextColor}`}
				/>
				{showModeloSuggestions && filteredModelos.length > 0 && (
					<ul className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl max-h-48 overflow-y-auto z-50 shadow-2xl divide-y divide-zinc-800">
						{filteredModelos.map((m, idx) => (
							<li
								key={m.id || `custom-${idx}`}
								className={`px-4 py-2.5 text-xs font-extrabold cursor-pointer uppercase transition-colors ${
									idx === activeModeloIndex ? "bg-zinc-800 text-lime-400" : "text-zinc-200"
								} hover:bg-zinc-800 hover:text-lime-400`}
								onMouseDown={() => handleSelectModelo(m)}
							>
								{m.custom ? `${m.name} (NOVO)` : m.name}
							</li>
						))}
					</ul>
				)}
			</div>

			{/* 2. MARCA */}
			<div className="relative flex-[1.3] min-w-[190px]">
				<label className={`text-[11px] font-extrabold uppercase mb-1 block ${hasError && lineErrors.includes("Marca") ? "text-red-400" : "text-zinc-400"}`}>Marca</label>
				<input
					ref={marcaRef}
					data-marca-index={index}
					disabled={!modeloInput || !modeloInput.trim()}
					value={marcaInput}
					onChange={(e) => {
						setMarcaInput(e.target.value);
						setShowMarcaSuggestions(true);
						setActiveMarcaIndex(0);
					}}
					onFocus={(e) => { e.target.select(); setShowMarcaSuggestions(true); }}
					onKeyDown={handleKeyDownMarca}
					onBlur={() => setTimeout(() => setShowMarcaSuggestions(false), 200)}
					placeholder={!modeloInput || !modeloInput.trim() ? "PREENCHA O MODELO" : "DIGITE A MARCA"}
					className={`w-full bg-zinc-950 border p-2.5 px-3.5 rounded-xl text-base font-extrabold uppercase focus:outline-none focus:ring-1 ${
						hasError && lineErrors.includes("Marca") ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-zinc-700 focus:border-lime-400 focus:ring-lime-400"
					} ${(!modeloInput || !modeloInput.trim()) ? "opacity-40 cursor-not-allowed text-zinc-500" : marcaTextColor}`}
				/>
				{(!(!modeloInput || !modeloInput.trim())) && showMarcaSuggestions && filteredMarcas.length > 0 && (
					<ul className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl max-h-48 overflow-y-auto z-50 shadow-2xl divide-y divide-zinc-800">
						{filteredMarcas.map((b, idx) => (
							<li
								key={b.id || `custom-b-${idx}`}
								className={`px-4 py-2.5 text-xs font-extrabold cursor-pointer uppercase transition-colors ${
									idx === activeMarcaIndex ? "bg-zinc-800 text-lime-400" : "text-zinc-200"
								} hover:bg-zinc-800 hover:text-lime-400`}
								onMouseDown={() => handleSelectMarca(b)}
							>
								{b.custom ? `${b.name} (NOVO)` : b.name}
							</li>
						))}
					</ul>
				)}
			</div>

			{/* 3. CUSTO */}
			<div className="w-full lg:w-36">
				<label className={`text-[11px] font-extrabold uppercase mb-1 block ${hasError && lineErrors.includes("Custo") ? "text-red-400" : "text-zinc-400"}`}>Custo</label>
				<input
					ref={custoRef}
					data-custo-index={index}
					type="text"
					value={custoText}
					onChange={handleCustoChange}
					onFocus={(e) => e.target.select()}
					onBlur={finalizeCusto}
					onKeyDown={handleKeyDownCusto}
					placeholder="0,00"
					className={`w-full bg-zinc-950 border p-2.5 px-3.5 rounded-xl text-base font-extrabold text-zinc-100 focus:outline-none focus:ring-1 text-right ${
						hasError && lineErrors.includes("Custo") ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-zinc-700 focus:border-lime-400 focus:ring-lime-400"
					}`}
				/>
			</div>

			{/* Preço e Total Fixo */}
			<div className="flex items-center gap-3 w-full lg:w-auto min-w-[240px]">
				<div className={`p-2.5 px-4 rounded-xl border flex-1 text-right h-[72px] flex flex-col justify-center ${statusMargem === "ok" || statusMargem === "atencao" ? "bg-lime-950/20 border-lime-500/40 text-lime-400" : statusMargem === "cautela" ? "bg-red-950/30 border-red-500/40 text-red-500" : "bg-zinc-950 border-zinc-800 text-zinc-400"}`}>
					<div className="flex items-center justify-between gap-2">
						<span className="text-[10px] font-extrabold uppercase opacity-80">Preço</span>
						<span className="text-xs font-extrabold">{variacaoReferencia !== null ? `${variacaoReferencia >= 0 ? "+" : ""}${variacaoReferencia.toFixed(2).replace(".", ",")}%` : "--"}</span>
					</div>
					<span className="text-lg font-extrabold block leading-tight">R$ {valorUnitarioCalculado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
					<span className="text-[11px] font-extrabold text-zinc-400 block h-4 leading-tight mt-0.5">R$ {valorTotalLinha.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
				</div>
				<div className="flex flex-col items-center min-w-[55px]">
					<span className="text-[10px] font-extrabold text-zinc-500 uppercase mb-1">{lineData.switchChecked ? "Global" : "Unitário"}</span>
					<button type="button" onClick={() => onToggleBatchSwitch(lineData.lote, !lineData.switchChecked)} className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${lineData.switchChecked ? "bg-lime-400 justify-end" : "bg-zinc-800 justify-start"}`}>
						<div className={`w-5 h-5 rounded-full ${lineData.switchChecked ? "bg-zinc-950" : "bg-zinc-500"}`} />
					</button>
				</div>
			</div>
		</div>
	);
}