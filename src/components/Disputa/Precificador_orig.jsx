// Precificador.jsx
import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import LinePricer from "./LinePricer";
import { getDatabase, ref, update, get } from "firebase/database";
import { app } from "../firebase-config";
import SingleCalculator from "./SingleCalculator";
import ImportQuantity from "./ImportQuantity";
import Button from "../Editais/Button";

export default function Precificador() {
	const [lineData, setLineData] = useState([]);
	const [fileName, setFileName] = useState("");
	const [rawMargin, setRawMargin] = useState("");
	const [checkedGlobalLotes, setCheckedGlobalLotes] = useState({});
	const costInputRefs = useRef({});
	const fileInputRef = useRef(null);
	const firstModeloInputRef = useRef(null);

	// -----------------------------
	// Helpers
	// -----------------------------
	const formatMargin = (value) => {
		const digits = value.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
		let integer = digits.slice(0, 2);
		let decimal = digits.slice(2, 4);
		if (parseInt(integer) < 10) integer = parseInt(integer).toString();
		return `${integer},${decimal}`;
	};

	const orderAdjust = () => {
		window.location.href = "/disputa/ajustar-ordem";
	};

	const getFormattedMargin = () => formatMargin(rawMargin);

	// -----------------------------
	// File Handler
	// -----------------------------
	const handleFile = async (event) => {
		const file = event.target.files[0];
		if (!file) return;
		setFileName(file.name);

		const data = await file.arrayBuffer();
		const workbook = XLSX.read(data);
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
		const rows = json.slice(1);

		const parsedRows = rows.map(([lote, item, ref, qtde], index) => ({
			index,
			lote,
			item,
			refValue: typeof ref === "string" ? parseFloat(ref.replace(",", ".")) : Number(ref),
			qtde: qtde || 1,
			marca: null,
			modelo: null,
			valorCalculado: 0,
			switchChecked: false,
			custoBase: 0,
		}));

		// Detecta lotes duplicados e ativa globalSwitch
		const lotesCount = {};
		parsedRows.forEach((r) => {
			lotesCount[r.lote] = (lotesCount[r.lote] || 0) + 1;
		});
		const newGlobals = {};
		Object.entries(lotesCount).forEach(([lote, count]) => {
			if (count > 1) newGlobals[lote] = true;
		});

		const updatedRows = parsedRows.map((line) => ({
			...line,
			switchChecked: !!newGlobals[line.lote],
		}));

		setCheckedGlobalLotes(newGlobals);
		setLineData(updatedRows);
	};

	const handleMarginChange = (e) => {
		const onlyDigits = e.target.value.replace(/\D/g, "");
		setRawMargin(onlyDigits);
	};

	const handleMarginKey = (e) => {
		if (e.key === "Enter" || e.key === "Tab") {
			e.preventDefault();
			costInputRefs.current[0]?.focus();
		}
	};

	const handleReset = () => window.location.reload();

	const toggleGlobalLote = (lote) => {
		setCheckedGlobalLotes((prev) => {
			const newState = !prev[lote];
			setLineData((prevLines) => prevLines.map((line) => (line.lote === lote ? { ...line, switchChecked: newState } : line)));
			return { ...prev, [lote]: newState };
		});
	};

	const handleCostKeyDown = (e, index) => {
		if (e.key === "Enter") {
			e.preventDefault();
			const targetIndex = e.shiftKey ? index - 1 : index + 1;
			costInputRefs.current[targetIndex]?.focus();
		}
	};

	const handleLineChange = (index, updatedFields) => {
		setLineData((prev) => {
			const copy = [...prev];
			copy[index] = { ...copy[index], ...updatedFields };
			return copy;
		});
	};

	// -----------------------------
	// LOG DE DIAGNÓSTICO
	// -----------------------------
	useEffect(() => {
		console.clear();
		console.log("📊 lineData atualizado:", JSON.parse(JSON.stringify(lineData)));
	}, [lineData]);

	// -----------------------------
	// Validação
	// -----------------------------
	const validateBeforeExport = () => {
		const errors = [];

		Object.entries(checkedGlobalLotes).forEach(([lote, active]) => {
			if (!active) return;
			const linhasLote = lineData.filter((l) => l.lote === Number(lote));
			const incompletas = linhasLote.filter((l) => !l.marca?.name || !l.modelo?.name || !l.custoBase || l.custoBase <= 0);
			if (incompletas.length > 0) {
				errors.push(`Lote ${lote} tem linhas incompletas.`);
			}
		});

		if (errors.length > 0) {
			alert(`Erros encontrados:\n${errors.join("\n")}`);
			return false;
		}
		return true;
	};

	// -----------------------------
	// Exportação PROPOSTA
	// -----------------------------
	const handleExportProposta = () => {
		const data = [["Lote", "Item", "", "Marca", "Modelo", "", "Valor"]];
	
		console.clear();
		console.log("Exportando PROPOSTA...");
		console.log("LineData atual:", lineData);
	
		const agg = {};
	
		lineData.forEach((line) => {
			const { lote, valorCalculado, refValue, qtde, marca, modelo } = line;
			if (!marca?.name || !modelo?.name) return;
	
			const v = parseFloat(valorCalculado) || 0;
			const r = parseFloat(refValue) || 0;
			const q = parseFloat(qtde) || 1;
	
			if (!agg[lote]) {
				agg[lote] = {
					count: 0,
					sumVal: 0,
					sumRef: 0,
					sumValQty: 0,
					sumRefQty: 0,
				};
			}
	
			agg[lote].count += 1;
			agg[lote].sumVal += v;
			agg[lote].sumRef += r;
			agg[lote].sumValQty += v * q;
			agg[lote].sumRefQty += r * q;
		});
	
		lineData.forEach((line) => {
			const { lote, item, marca, modelo, valorCalculado, refValue } = line;
			if (!marca?.name || !modelo?.name) return;
	
			const valorNum = parseFloat(valorCalculado) || 0;
			const refNum = parseFloat(refValue) || 0;
	
			if (valorNum === 0) return;
	
			const isSingle = (agg[lote]?.count || 0) === 1;
			let include = false;
			let outVal = 0;
	
			if (!refNum) {
				include = true;
				outVal = valorNum * 3;
			} else {
				if (isSingle) {
					if (valorNum > refNum * 1.1) return;
				} else {
					if (agg[lote].sumVal > agg[lote].sumRef * 1.1) return;
				}
	
				include = true;
				outVal = valorNum < refNum ? refNum : valorNum;
			}
	
			if (include) {
				data.push([
					lote,
					item,
					"",
					marca.name,
					modelo.name,
					"",
					Number(outVal),
				]);
			}
		});
	
		if (data.length <= 1) {
			alert("Nenhum dado válido encontrado para exportar PROPOSTA.");
			return false;
		}
	
		const ws = XLSX.utils.aoa_to_sheet(data);
	
		Object.keys(ws).forEach((cell) => {
			if (cell.startsWith("G") && ws[cell].v !== "Valor") {
				ws[cell].t = "n";
				ws[cell].z = "0.00";
			}
		});
	
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Proposta");
		XLSX.writeFile(wb, `${fileName.replace(/\.xlsx$/, "")}-proposta.xlsx`);
	
		return true;
	};

	// -----------------------------
	// Exportação DISPUTA
	// -----------------------------
	const handleExportDisputa = () => {
		console.clear();
		console.log("🧾 Exportando DISPUTA...");
		console.log("LineData atual:", lineData);

		const data = [["Item", "Descrição", "Valor limite", "Variação inicial", "Variação final", "Tipo de redução"]];

		const agg = {};

		lineData.forEach((line) => {
			const { lote, marca, modelo, valorCalculado, refValue, qtde, switchChecked } = line;
			if (!marca?.name || !modelo?.name) return;

			const v = parseFloat(valorCalculado) || 0;
			const r = parseFloat(refValue) || 0;
			const q = parseFloat(qtde) || 1;

			if (v === 0) return;

			const mult = switchChecked ? q : 1;

			if (!agg[lote]) agg[lote] = { sumVal: 0, sumRef: 0, unitario: !switchChecked };
			agg[lote].sumVal += v * mult;
			agg[lote].sumRef += r * mult;

			if (!switchChecked) agg[lote].unitario = true;
		});

		Object.entries(agg).forEach(([lote, { sumVal, sumRef, unitario }]) => {
			if (sumRef !== 0) {
				if (sumVal > sumRef * 1.1) return;
			}

			const valorLimite = Number(sumVal.toFixed(2));
			const descricao = unitario ? `LOTE ${lote} (Unitário)` : `LOTE ${lote} (Global)`;

			data.push([
				lote,
				descricao,
				valorLimite,
				0.1,
				1,
				"Valor",
			]);
		});

		if (data.length <= 1) {
			alert("Nenhum dado válido encontrado para exportar DISPUTA.");
			return false;
		}

		const ws = XLSX.utils.aoa_to_sheet(data);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Disputa");
		XLSX.writeFile(wb, `${fileName.replace(/\.xlsx$/, "")}-disputa.xlsx`);

		return true;
	};

	// -----------------------------
	// Exportação AMBOS + Firebase
	// -----------------------------
	const handleExportAmbos = async () => {
		if (!validateBeforeExport()) return;

		const ok1 = handleExportProposta();
		const ok2 = handleExportDisputa();
		if (!ok1 || !ok2) return;

		const db = getDatabase(app);
		const snapshot = await get(ref(db));
		if (!snapshot.exists()) return;

		const brandsData = snapshot.val().brands || {};
		const modelsData = snapshot.val().models || {};

		lineData.forEach((line) => {
			const updateUsage = (type, data, value) => {
				if (!value) return;
				const found = Object.entries(data).find(([, obj]) => obj.name === value);
				if (!found) return;
				const [id, obj] = found;
				const newUsage = (obj.usage || 0) + 1;
				update(ref(db, `${type}/${id}`), { usage: newUsage });
			};

			updateUsage("brands", brandsData, line.marca?.name);
			updateUsage("models", modelsData, line.modelo?.name);
		});
	};

	// -----------------------------
	// Effects
	// -----------------------------
	useEffect(() => {
		const handleBeforeUnload = (e) => {
			e.preventDefault();
			e.returnValue = "";
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, []);

	useEffect(() => {
		const handleFocus = (e) => {
			if (e.target.tagName === "INPUT" && e.target.type === "text") e.target.select();
		};
		document.addEventListener("focusin", handleFocus);
		return () => document.removeEventListener("focusin", handleFocus);
	}, []);

	// -----------------------------
	// Render
	// -----------------------------
	return (
		<div className="p-6 max-w-[1600px] mx-auto text-zinc-100">
			{!fileName && (
				<div className="flex flex-col min-h-[calc(100vh-140px)] justify-center items-center p-4 gap-6">
					{/* Card Calculadora Single */}
					<div className="bg-zinc-900 border border-zinc-800 shadow-2xl p-6 rounded-2xl flex flex-col items-center justify-center gap-4 w-full max-w-xl">
						<p className="text-xs font-bold uppercase tracking-wider text-lime-400 select-none">Calculadora Rápidas</p>
						<SingleCalculator rawMargin={rawMargin} setRawMargin={setRawMargin} />
					</div>

					{/* Card Importação & Ajuste */}
					<div className="bg-zinc-900 border border-zinc-800 shadow-2xl p-6 rounded-2xl flex flex-col items-center justify-center gap-4 w-full max-w-xl">
						<p className="text-xs font-bold uppercase tracking-wider text-lime-400 select-none">Importar Planilha .xlsx</p>
						<div className="flex items-center">
							<label className="inline-block px-5 py-3 text-center bg-lime-400 text-zinc-950 font-bold rounded-xl text-xs uppercase cursor-pointer hover:bg-lime-300 transition-all shadow-lg hover:shadow-lime-400/20 active:scale-95 select-none">
								Escolher arquivo
								<input type="file" accept=".xlsx" onChange={handleFile} ref={fileInputRef} className="hidden" />
							</label>
						</div>
						<div className="w-full border-t border-zinc-800/80 my-2"></div>
						<p className="text-xs font-bold uppercase tracking-wider text-zinc-400 select-none">Ajustar ordem dos lotes</p>
						<Button label="Ajustar Ordem" name="order-adjust" id="order-adjust" onClick={orderAdjust} />
					</div>
				</div>
			)}

			{lineData.length > 0 && (
				<>
					{/* Barra Superior de Ações */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 shadow-xl p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
						<div>
							<h2 className="text-xs font-bold uppercase tracking-wider text-lime-400 select-none flex items-center gap-1">
								<span>›</span> Margem Global
							</h2>
							<div className="flex mt-2">
								<input
									type="text"
									name="margin"
									id="margin"
									className="w-full border border-e-0 border-zinc-700 bg-zinc-950 p-2 px-3 text-xl rounded-l-xl focus:outline-none focus:border-lime-400 font-mono font-bold text-right text-zinc-100"
									value={getFormattedMargin()}
									onChange={handleMarginChange}
									onKeyDown={handleMarginKey}
									maxLength={5}
									placeholder="00,00"
								/>
								<div className="border border-zinc-700 bg-zinc-800 rounded-r-xl text-lime-400 p-2.5 font-bold text-sm flex items-center select-none">
									%
								</div>
							</div>
						</div>

						<div>
							<h2 className="text-xs font-bold uppercase tracking-wider text-lime-400 select-none flex items-center gap-1">
								<span>›</span> Exportação
							</h2>
							<div className="flex gap-2 mt-2">
								<Button label="Proposta + Disputa" onClick={handleExportAmbos} />
							</div>
						</div>

						<div>
							<h2 className="text-xs font-bold uppercase tracking-wider text-lime-400 select-none flex items-center gap-1">
								<span>›</span> Opções
							</h2>
							<div className="flex gap-2 mt-2">
								<Button label="Limpar" onClick={handleReset} />
								<ImportQuantity lines={lineData} onImport={(updatedLines) => setLineData(updatedLines)} />
							</div>
						</div>
					</div>

					{/* Lista de Itens Precificados */}
					<div className="mt-6 space-y-3">
						{lineData.map((line, index) => (
							<LinePricer
								key={line.index}
								data-index={index}
								{...line}
								inputRef={index === 0 ? firstModeloInputRef : null}
								margin={getFormattedMargin()}
								globalChecked={!!checkedGlobalLotes[line.lote]}
								onToggleGlobal={() => toggleGlobalLote(line.lote)}
								costInputRef={(el) => (costInputRefs.current[index] = el)}
								onCostKeyDown={(e) => handleCostKeyDown(e, index)}
								onChange={(updatedFields) => handleLineChange(index, updatedFields)}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
}