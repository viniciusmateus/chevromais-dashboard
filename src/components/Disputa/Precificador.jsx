import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import LineItem from "./LineItem";

export default function Precificador() {
	const [lineData, setLineData] = useState([]);
	const [rawMargin, setRawMargin] = useState("00,00");
	const [calcCusto, setCalcCusto] = useState("100,00");
	const [calcMargem, setCalcMargem] = useState("20,00");
	const [importedFileName, setImportedFileName] = useState("");
	const [currentProcessId, setCurrentProcessId] = useState(null);
	const [savedProcesses, setSavedProcesses] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [activeErrorIdx, setActiveErrorIdx] = useState(0);
	const [jumpInputValue, setJumpInputValue] = useState("");

	const [brands, setBrands] = useState([]);
	const [models, setModels] = useState([]);

	const currentProcessIdRef = useRef(currentProcessId);
	const importedFileNameRef = useRef(importedFileName);
	const rawMarginRef = useRef(rawMargin);
	const lineDataRef = useRef(lineData);

	useEffect(() => {
		currentProcessIdRef.current = currentProcessId;
		importedFileNameRef.current = importedFileName;
		rawMarginRef.current = rawMargin;
		lineDataRef.current = lineData;
	}, [currentProcessId, importedFileName, rawMargin, lineData]);

	const loadProcesses = async () => {
		const { data, error } = await supabase.from("processos_salvos").select("*").order("updated_at", { ascending: false });
		if (!error && data) setSavedProcesses(data);
	};

	useEffect(() => {
		async function loadCatalog() {
			try {
				const [{ data: bData }, { data: mData }] = await Promise.all([supabase.from("brands").select("*").order("usage", { ascending: false }), supabase.from("models").select("*").order("usage", { ascending: false })]);
				setBrands(bData || []);
				setModels(mData || []);
			} catch (err) {
				console.error("Erro ao carregar catálogo:", err);
			}
		}
		loadCatalog();
		loadProcesses();
	}, []);

	const persistProgress = async () => {
		if (!importedFileNameRef.current) return null;

		const payload = {
			nome_arquivo: importedFileNameRef.current,
			margem_global: rawMarginRef.current,
			linhas: lineDataRef.current,
			updated_at: new Date().toISOString(),
		};

		if (currentProcessIdRef.current) {
			await supabase.from("processos_salvos").update(payload).eq("id", currentProcessIdRef.current);
			return currentProcessIdRef.current;
		} else {
			const { data } = await supabase.from("processos_salvos").insert(payload).select().single();
			if (data) {
				setCurrentProcessId(data.id);
				return data.id;
			}
		}
		return null;
	};

	useEffect(() => {
		if (!importedFileName || lineData.length === 0) return;
		const interval = setInterval(async () => {
			if (hasUnsavedChanges) {
				await persistProgress();
				setHasUnsavedChanges(false);
				loadProcesses();
			}
		}, 30000);
		return () => clearInterval(interval);
	}, [importedFileName, lineData.length, hasUnsavedChanges]);

	const handleSaveAndClose = async () => {
		await persistProgress();
		setLineData([]);
		setImportedFileName("");
		setCurrentProcessId(null);
		setHasUnsavedChanges(false);
		setJumpInputValue("");
		loadProcesses();
	};

	const handleDeleteProcess = async (id, e) => {
		e.stopPropagation();
		if (!window.confirm("Deseja realmente excluir este processo salvo?")) return;
		const { error } = await supabase.from("processos_salvos").delete().eq("id", id);
		if (!error) setSavedProcesses((prev) => prev.filter((p) => p.id !== id));
	};

	const handleResumeProcess = (process) => {
		setCurrentProcessId(process.id);
		setImportedFileName(process.nome_arquivo);
		setRawMargin(process.margem_global || "00,00");
		setLineData(process.linhas);
		setHasUnsavedChanges(false);
		setJumpInputValue("1");
	};

	const handleMarginChange = (e) => {
		const rawDigits = e.target.value.replace(/\D/g, "");
		if (!rawDigits) {
			setRawMargin("00,00");
			setHasUnsavedChanges(true);
			return;
		}
		const num = parseInt(rawDigits, 10);
		const formatted = (num / 100).toFixed(2).replace(".", ",");
		const parts = formatted.split(",");
		setRawMargin(`${parts[0].padStart(2, "0")},${parts[1]}`);
		setHasUnsavedChanges(true);
	};

	const handleFileUpload = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		const baseName = file.name.replace(/\.[^/.]+$/, "");
		const reader = new FileReader();
		reader.onload = (evt) => {
			const bstr = evt.target.result;
			const wb = XLSX.read(bstr, { type: "binary" });
			const wsname = wb.SheetNames[0];
			const ws = wb.Sheets[wsname];
			const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

			const parsedData = data
				.filter((row, i) => i > 0 && row.length > 0)
				.map((row, index) => {
					return {
						index,
						lote: row[0] !== undefined ? String(row[0]).trim() : "",
						item: row[1] !== undefined ? String(row[1]).trim() : "",
						refValue: row[2] !== undefined ? String(row[2]).trim() : "",
						qtde: "0",
						custoBase: 0,
						marca: "",
						modelo: "",
						switchChecked: false,
					};
				});

			setLineData(parsedData);
			setImportedFileName(baseName);
			setCurrentProcessId(null);
			setHasUnsavedChanges(true);
			setJumpInputValue("1");
		};
		reader.readAsBinaryString(file);
	};

	const handleImportQuantity = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (evt) => {
			const bstr = evt.target.result;
			const wb = XLSX.read(bstr, { type: "binary" });
			const wsname = wb.SheetNames[0];
			const ws = wb.Sheets[wsname];
			const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

			const quantityMap = {};
			data.slice(1).forEach((row) => {
				if (row[0] !== undefined && row[1] !== undefined && row[3] !== undefined) {
					const l = String(row[0]).trim();
					const it = String(row[1]).trim();
					const qt = String(row[3]).replace(/\D/g, "");
					const key = `${l}-${it}`;
					quantityMap[key] = qt;
				}
			});

			setLineData((prev) =>
				prev.map((line) => {
					const k = `${line.lote}-${line.item}`;
					return quantityMap[k] ? { ...line, qtde: quantityMap[k] } : line;
				}),
			);
			setHasUnsavedChanges(true);
		};
		reader.readAsBinaryString(file);
	};

	const handleLineChange = (index, field, value) => {
		setLineData((prev) => {
			const newData = [...prev];
			newData[index] = { ...newData[index], [field]: value };

			if (field === "marca" || field === "modelo" || field === "custoBase") {
				const currentLine = newData[index];
				if (currentLine.switchChecked && currentLine.marca && currentLine.modelo && currentLine.custoBase > 0) {
					for (let i = 0; i < newData.length; i++) {
						if (i !== index && newData[i].switchChecked && newData[i].refValue === currentLine.refValue) {
							newData[i] = {
								...newData[i],
								marca: currentLine.marca,
								modelo: currentLine.modelo,
								custoBase: currentLine.custoBase,
							};
						}
					}
				}
			}
			return newData;
		});
		setHasUnsavedChanges(true);
	};

	const handleToggleBatchSwitch = (index) => {
		setLineData((prev) => {
			const newData = [...prev];
			const currentChecked = newData[index].switchChecked;
			const refToMatch = newData[index].refValue;

			for (let i = 0; i < newData.length; i++) {
				if (newData[i].refValue === refToMatch) {
					newData[i].switchChecked = !currentChecked;
				}
			}
			return newData;
		});
		setHasUnsavedChanges(true);
	};

	const handleExport = () => {
		const mVal = parseFloat(rawMargin.replace(",", "."));
		if (mVal >= 100) return alert("A margem deve ser menor que 100%.");

		const marginMult = 1 - mVal / 100;

		const wsData = [["Lote", "Item", "Descrição", "Qtd.", "Valor Unitário", "Valor Total", "Marca", "Modelo"]];
		lineData.forEach((line) => {
			const unit = line.custoBase / marginMult;
			const qt = parseInt(line.qtde, 10) || 0;
			const tot = unit * qt;
			wsData.push([line.lote, line.item, line.refValue, qt, unit.toFixed(4).replace(".", ","), tot.toFixed(2).replace(".", ","), line.marca, line.modelo]);
		});

		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.aoa_to_sheet(wsData);
		XLSX.utils.book_append_sheet(wb, ws, "Precificação");
		XLSX.writeFile(wb, `${importedFileName || "precificacao"}_export.xlsx`);
	};

	const isMarginValid = parseFloat(rawMargin.replace(",", ".")) < 100;

	// MAPEAMENTO DE ERROS E TOTAIS POR LOTE
	const { errors, errorMap, loteTotals } = useMemo(() => {
		const errList = [];
		const eMap = {};
		const totals = {};

		const mVal = parseFloat(rawMargin.replace(",", ".")) || 0;
		const marginMult = mVal < 100 ? 1 - mVal / 100 : 1;

		if (!importedFileName) return { errors: errList, errorMap: eMap, loteTotals: totals };

		lineData.forEach((line) => {
			const lineErrs = [];
			const q = parseInt(line.qtde || "0", 10);

			// Validação de pendências
			if (q <= 0) lineErrs.push("Quantidade");
			if (line.custoBase <= 0) lineErrs.push("Custo");
			if (!line.marca) lineErrs.push("Marca");
			if (!line.modelo) lineErrs.push("Modelo");

			if (lineErrs.length > 0) {
				eMap[line.index] = lineErrs;
				errList.push({
					index: line.index,
					lote: line.lote,
					item: line.item,
					missing: lineErrs,
				});
			}

			// Cálculo de totais do lote para a barra verde
			const unitario = line.custoBase > 0 ? line.custoBase / marginMult : 0;
			const totalItem = unitario * q;
			const currentLote = String(line.lote);
			totals[currentLote] = (totals[currentLote] || 0) + totalItem;
		});

		return { errors: errList, errorMap: eMap, loteTotals: totals };
	}, [lineData, importedFileName, rawMargin]);

	// Garantir que o índice de erro ativo não saia do limite
	useEffect(() => {
		if (activeErrorIdx >= errors.length && errors.length > 0) {
			setActiveErrorIdx(Math.max(0, errors.length - 1));
		}
	}, [errors.length, activeErrorIdx]);

	const scrollToError = (idx) => {
		if (!errors[idx]) return;
		const el = document.getElementById(`line-${errors[idx].index}`);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "center" });
			el.classList.add("ring-2", "ring-red-500", "transition-all");
			setTimeout(() => el.classList.remove("ring-2", "ring-red-500"), 1500);
			setJumpInputValue(String(errors[idx].index + 1));
		}
	};

	const handlePrevError = () => {
		if (errors.length === 0) return;
		const prevIdx = activeErrorIdx === 0 ? errors.length - 1 : activeErrorIdx - 1;
		setActiveErrorIdx(prevIdx);
		scrollToError(prevIdx);
	};

	const handleNextError = () => {
		if (errors.length === 0) return;
		const nextIdx = (activeErrorIdx + 1) % errors.length;
		setActiveErrorIdx(nextIdx);
		scrollToError(nextIdx);
	};

	const totalItemsCount = importedFileName ? lineData.length : 0;
	const completedCount = totalItemsCount - errors.length;
	const currentProgress = totalItemsCount > 0 ? Math.round((completedCount / totalItemsCount) * 100) : 0;

	// Jump to item logic
	const handleJump = (e) => {
		if (e.key === "Enter") {
			const targetIdx = parseInt(jumpInputValue, 10) - 1;
			if (targetIdx >= 0 && targetIdx < lineData.length) {
				const el = document.getElementById(`line-${targetIdx}`);
				if (el) {
					el.scrollIntoView({ behavior: "smooth", block: "center" });
					el.classList.add("ring-2", "ring-lime-400", "transition-all");
					setTimeout(() => el.classList.remove("ring-2", "ring-lime-400"), 1500);
				}
			}
		}
	};

	const handleSimpleCalc = () => {
		const c = parseFloat(calcCusto.replace(".", "").replace(",", ".")) || 0;
		const m = parseFloat(calcMargem.replace(".", "").replace(",", ".")) || 0;
		if (m >= 100) return "Erro";
		const val = c / (1 - m / 100);
		return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	};

	if (!importedFileName) {
		const filteredProcesses = savedProcesses.filter((p) => p.nome_arquivo?.toLowerCase().includes(searchTerm.toLowerCase()));

		return (
			<div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col justify-center items-start gap-4">
						<div>
							<h1 className="text-2xl font-extrabold text-lime-400 uppercase tracking-wider mb-2">Novo Processo</h1>
							<p className="text-sm text-zinc-400 font-bold">Inicie importando a planilha de itens.</p>
						</div>
						<label className="cursor-pointer bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold px-8 py-4 rounded-xl text-sm uppercase transition-colors shadow-lg">
							Importar Novo Excel
							<input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden cursor-pointer" />
						</label>
					</div>

					<div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col justify-center gap-4">
						<h2 className="text-xl font-extrabold text-zinc-300 uppercase tracking-wider mb-2">Calculadora Simples</h2>
						<div className="flex gap-4 items-end">
							<div className="flex flex-col gap-1 w-1/3">
								<label className="text-xs font-bold text-zinc-500 uppercase">Custo</label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">R$</span>
									<input type="text" value={calcCusto} onChange={(e) => setCalcCusto(e.target.value.replace(/[^0-9,]/g, ""))} className="cursor-pointer w-full pl-9 pr-3 h-10 bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-bold text-zinc-100 outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400" />
								</div>
							</div>
							<div className="flex flex-col gap-1 w-1/3">
								<label className="text-xs font-bold text-zinc-500 uppercase">Margem</label>
								<div className="relative">
									<input type="text" value={calcMargem} onChange={(e) => setCalcMargem(e.target.value.replace(/[^0-9,]/g, ""))} className="cursor-pointer w-full pl-3 pr-8 h-10 bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-bold text-zinc-100 outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 text-right" />
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">%</span>
								</div>
							</div>
							<div className="flex flex-col gap-1 w-1/3">
								<div className="h-10 flex items-center justify-center bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-bold text-lime-400">R$ {handleSimpleCalc()}</div>
							</div>
						</div>
					</div>
				</div>

				<div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
					<div className="flex items-center justify-between mb-8">
						<h2 className="text-xl font-extrabold text-zinc-300 uppercase tracking-wider">Continuar Processos Salvos</h2>
						<input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="cursor-pointer w-64 h-10 px-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-100 outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all placeholder-zinc-700" />
					</div>

					{filteredProcesses.length === 0 ? (
						<div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-950/50">
							<p className="text-zinc-600 font-bold text-lg">Nenhum processo salvo encontrado.</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							{filteredProcesses.map((p) => {
								const totalItems = p.linhas ? p.linhas.length : 0;
								const comp = p.linhas ? p.linhas.filter((l) => l.custoBase > 0 && l.marca && l.modelo).length : 0;
								const pct = totalItems > 0 ? Math.round((comp / totalItems) * 100) : 0;

								return (
									<div key={p.id} className="group flex flex-col p-5 bg-zinc-950 border border-zinc-800 rounded-2xl transition-all hover:border-lime-400/50 hover:shadow-2xl hover:shadow-lime-900/10">
										<div className="flex justify-between items-start mb-4">
											<h3 className="font-extrabold text-lime-400 text-lg truncate w-3/4">{p.nome_arquivo}</h3>
											<button onClick={(e) => handleDeleteProcess(p.id, e)} className="cursor-pointer text-xs font-bold text-red-500 hover:text-red-400">
												Excluir
											</button>
										</div>
										<div className="flex items-center justify-between text-xs text-zinc-500 font-bold mb-4 bg-zinc-900 p-2 rounded-lg">
											<span>
												Total itens: <span className="text-zinc-300">{totalItems}</span>
											</span>
											<span>
												Concluídos: <span className="text-zinc-300">{comp}</span>
											</span>
										</div>
										<div className="mb-6">
											<div className="flex justify-between text-[10px] font-extrabold text-zinc-500 mb-1 tracking-wider">
												<span>PROGRESSO</span>
												<span className="text-lime-400">{pct}%</span>
											</div>
											<div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
												<div className="h-full bg-lime-400 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }}></div>
											</div>
										</div>
										<button onClick={() => handleResumeProcess(p)} className="cursor-pointer mt-auto w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-extrabold text-xs uppercase tracking-wider transition-colors">
											Continuar Processo
										</button>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-[1700px] mx-auto p-4 flex flex-col gap-4 relative">
			{/* Floating Jump Navigation */}
			<div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 bg-zinc-900/90 backdrop-blur border border-lime-400/50 rounded-xl p-3 flex flex-col items-center gap-2 shadow-2xl shadow-lime-900/20">
				<span className="text-[10px] font-extrabold text-lime-400 uppercase tracking-widest">Ir para</span>
				<div className="flex items-center gap-2">
					<input type="text" value={jumpInputValue} onChange={(e) => setJumpInputValue(e.target.value.replace(/\D/g, ""))} onKeyDown={handleJump} className="cursor-pointer w-14 h-8 bg-zinc-950 border border-zinc-700 rounded text-center text-sm font-bold text-zinc-100 outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400" />
					<span className="text-zinc-500 font-bold text-sm">/ {lineData.length}</span>
				</div>
			</div>

			{/* HEADER */}
			<div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
				<div className="flex flex-col">
					<span className="text-[10px] font-extrabold text-lime-400 uppercase tracking-widest mb-1">Processo Ativo</span>
					<h2 className="text-xl font-extrabold text-zinc-100 truncate max-w-md">{importedFileName}</h2>
				</div>

				<div className="flex items-center gap-6">
					<div className="flex flex-col gap-1.5 w-48 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
						<div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider">
							<span className="text-zinc-500">Progresso</span>
							<span className="text-lime-400">{currentProgress}%</span>
						</div>
						<div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
							<div className="h-full bg-lime-400 rounded-full transition-all duration-500" style={{ width: `${currentProgress}%` }}></div>
						</div>
					</div>

					<div className="h-10 w-px bg-zinc-800"></div>

					<div className="flex items-center gap-3">
						<label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Margem Global</label>
						<div className="relative w-28">
							<input type="text" value={rawMargin} onChange={handleMarginChange} className={`cursor-pointer w-full pl-3 pr-8 h-10 bg-zinc-950 border ${!isMarginValid ? "border-red-500 focus:border-red-500 focus:ring-red-500 text-red-500" : "border-zinc-800 focus:border-lime-400 focus:ring-lime-400 text-zinc-100"} rounded-xl text-sm font-bold outline-none focus:ring-1 transition-all text-right`} />
							<span className={`absolute right-3 top-1/2 -translate-y-1/2 font-bold ${!isMarginValid ? "text-red-500" : "text-zinc-500"}`}>%</span>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<label className="cursor-pointer flex items-center justify-center h-10 px-6 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-100 font-extrabold rounded-xl text-xs uppercase transition-colors shadow-lg">
							Importar Quantidades
							<input type="file" accept=".xlsx, .xls" onChange={handleImportQuantity} className="hidden cursor-pointer" />
						</label>
						<button onClick={handleExport} className="cursor-pointer flex items-center justify-center h-10 px-6 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold rounded-xl text-xs uppercase transition-colors shadow-lg">
							Exportar
						</button>
						<button onClick={handleSaveAndClose} className="cursor-pointer flex items-center justify-center h-10 px-6 bg-black border border-lime-400 hover:bg-zinc-900 text-zinc-100 font-extrabold rounded-xl text-xs uppercase transition-colors shadow-lg">
							Salvar e sair
						</button>
					</div>
				</div>
			</div>

			{/* BARRA DE PENDÊNCIAS COM NAVEGAÇÃO */}
			{errors.length > 0 ? (
				<div className="sticky top-2 z-30 bg-red-950/90 backdrop-blur border border-red-500/50 rounded-xl p-3 px-5 flex flex-wrap items-center justify-between shadow-lg shadow-red-900/20">
					<div className="flex items-center gap-3">
						<span className="flex items-center justify-center bg-red-500 text-zinc-950 w-6 h-6 rounded-full font-black text-sm">!</span>
						<span className="text-sm font-extrabold text-red-100 tracking-wide uppercase">
							Aviso {activeErrorIdx + 1} de {errors.length}: Lote {errors[activeErrorIdx]?.lote}, Item {errors[activeErrorIdx]?.item} — Pendências: {errors[activeErrorIdx]?.missing.join(", ")}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<button onClick={handlePrevError} className="cursor-pointer bg-zinc-950 border border-red-500/40 hover:bg-red-500 hover:text-zinc-950 text-red-400 px-4 py-2 rounded-lg text-xs font-black transition-colors">
							&lt; Anterior
						</button>
						<button onClick={handleNextError} className="cursor-pointer bg-zinc-950 border border-red-500/40 hover:bg-red-500 hover:text-zinc-950 text-red-400 px-4 py-2 rounded-lg text-xs font-black transition-colors">
							Próximo &gt;
						</button>
					</div>
				</div>
			) : (
				<div className="w-full flex items-center justify-center p-3 bg-lime-400/10 border border-lime-400/30 rounded-xl">
					<span className="text-lime-400 font-bold text-sm">Tudo pronto! Você já pode exportar a planilha.</span>
				</div>
			)}

			{/* LISTAGEM DOS ITENS E TOTALIZADOR DO LOTE */}
			<div className="flex flex-col gap-3 pb-20">
				{lineData.map((line, idx) => {
					const currentLote = String(line.lote);
					const nextLine = lineData[idx + 1];
					const isLastInLote = !nextLine || String(nextLine.lote) !== currentLote;

					return (
						<React.Fragment key={idx}>
							<div onFocusCapture={() => setJumpInputValue(String(idx + 1))}>
								<LineItem index={idx} totalLines={lineData.length} lineData={line} margin={rawMargin} brands={brands} models={models} disabled={!isMarginValid} lineErrors={errorMap[line.index]} onChange={handleLineChange} onToggleBatchSwitch={handleToggleBatchSwitch} />
							</div>

							{isLastInLote && (
								<div className="mt-2 mb-6 p-4 px-6 bg-lime-400 text-zinc-950 rounded-xl flex items-center justify-between shadow-lg shadow-lime-500/10 tracking-wide">
									<span className="uppercase tracking-wider font-black text-sm">Total do Lote {String(line.lote).padStart(4, "0")}</span>
									<span className="text-lg font-black">R$ {(loteTotals[currentLote] || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
								</div>
							)}
						</React.Fragment>
					);
				})}
			</div>
		</div>
	);
}
