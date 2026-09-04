import React, { useState, useEffect } from "react";
import ModelAutocomplete from "./ModelAutoComplete";
import Input from "../Editais/Input";
import Switch from "./Switch";

export default function LinePricer({ index, lote, item, refValue, qtde = "00001", inputRef, margin, globalChecked, onToggleGlobal, costInputRef, onCostKeyDown, onChange }) {
	const [costInput, setCostInput] = useState("");
	const [marca, setMarca] = useState("");
	const [modelo, setModelo] = useState("");

	const formatFourDigits = (v) => String(v).padStart(4, "0");
	const quantidade = parseInt(qtde) || 1;

	const formatCurrency = (v) =>
		new Intl.NumberFormat("pt-BR", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(v);

	const parseNumber = (value, isPercent = false) => {
		if (!value) return null;
		const clean = value
			.replace(/\./g, "")
			.replace(",", ".")
			.replace(/[^\d.]/g, "");
		const parsed = parseFloat(clean);
		return isNaN(parsed) ? null : isPercent ? parsed / 100 : parsed;
	};

	// --- Cálculo esperado ---
	const hasOperator = /[+\-*/]/.test(costInput);
	let expected = null;

	if (!hasOperator) {
		const parsedCost = parseNumber(costInput);
		const marginDecimal = parseNumber(margin, true);
		if (parsedCost !== null && marginDecimal !== null) {
			const calc = parsedCost * (1 + marginDecimal);
			expected = calc < 100 ? Math.floor(calc) + Math.ceil((calc % 1) * 10) / 10 : Math.ceil(calc);
		}
	}

	// --- Atualiza automaticamente o pai ---
	useEffect(() => {
		const formattedValor = expected ? parseFloat(expected.toFixed(2)) : 0;
		const parsedCost = parseNumber(costInput) || 0;
		onChange?.({
			marca,
			modelo,
			valorCalculado: formattedValor,
			custoBase: parsedCost,
			switchChecked: globalChecked,
		});
	}, [marca, modelo, expected, costInput, globalChecked]);

	const ACCENT = "#afd136";

	// --- Cores por estado (Dark Mode) ---
	const calcStateMap = {
		normal: "text-zinc-200",
		ok: "text-lime-400",
		attention: `text-[${ACCENT}]`,
		caution: "text-red-500",
	};

	let calcState = "normal";
	if (expected !== null) {
		if (expected <= refValue) calcState = "ok";
		else if (expected > refValue && expected <= refValue * 1.1) calcState = "attention";
		else calcState = "caution";
	}

	const calcClass = `py-1 ${calcStateMap[calcState]}`;

	// --- Handlers ---
	const handleCostChange = (e) => {
		let value = e.target.value;
		if (value.split(/[.,]/).length - 1 > 1) return;
		const [integers, decimals] = value.replace(/[^\d.,+\-*/]/g, "").split(/[,\.]/);
		setCostInput(decimals !== undefined ? `${integers},${decimals.slice(0, 2)}` : integers);
	};

	const handleCostBlur = () => {
		let input = costInput;
		if (!input) return setCostInput("");
		input = input.replace(",", ".").replace(/\s+/g, "");

		if (input.includes("+")) {
			try {
				const total = input
					.split("+")
					.map((n) => parseFloat(n))
					.reduce((a, b) => a + (b || 0), 0);
				if (!isNaN(total)) {
					setCostInput(formatCurrency(total));
					return;
				}
			} catch {}
		}

		const parsed = parseNumber(costInput);
		setCostInput(parsed ? formatCurrency(parsed) : "");
	};

	const handleSwitchChange = () => {
		onToggleGlobal(lote);
	};

	// --- Render ---
	return (
		<div
			className="p-4 md:p-5 flex flex-col md:flex-row justify-between items-start border border-zinc-800/80 rounded-xl transition-all duration-200 bg-zinc-900 shadow-xl hover:border-zinc-700 focus-within:border-lime-400/50 focus-within:bg-zinc-900/90 gap-6"
			data-index={index}
		>
			{/* Lote/Item/Quantidade/Ref */}
			<div className="flex flex-row gap-6 p-1 items-center bg-zinc-950/60 rounded-lg px-4 py-2 border border-zinc-800/50">
				{[
					{ label: "Lote/Item", value: `${formatFourDigits(lote)}/${formatFourDigits(item)}` },
					{ label: "Qntd.", value: formatFourDigits(qtde), extra: "text-center" },
					{ label: "Ref.", value: formatCurrency(refValue || 0), className: "text-lime-400 font-mono" },
				].map(({ label, value, className = "", extra = "" }, i) => (
					<div key={i} className="flex flex-col justify-center">
						<p className={`text-zinc-500 text-[11px] font-semibold tracking-wider uppercase select-none ${extra}`}>{label}</p>
						<p className={`text-sm font-bold py-1 text-zinc-100 ${className}`}>{value}</p>
					</div>
				))}
			</div>

			{/* Autocomplete */}
			<div className="flex-1 w-full md:w-auto">
				<ModelAutocomplete index={index} onSelectMarca={(value) => setMarca(value)} onSelectModelo={(value) => setModelo(value)} />
			</div>

			{/* Custo / Valor calculado / Switch */}
			<div className="flex flex-1 items-start gap-6 p-1 w-full md:w-auto justify-between md:justify-end">
				<div className="w-32">
					<Input
						label="Custo"
						type="text"
						value={costInput}
						onChange={handleCostChange}
						onBlur={handleCostBlur}
						onKeyDown={onCostKeyDown}
						onFocus={(e) =>
							setTimeout(() => {
								e.target.scrollIntoView({ behavior: "smooth", block: "center" });
							}, 50)
						}
						ref={(el) => {
							costInputRef?.(el);
							if (inputRef) inputRef.current = el;
						}}
					/>
				</div>

				<div className="flex flex-col justify-center min-w-[180px]">
					<span className={`${calcClass} text-2xl font-black font-mono flex items-baseline gap-2`}>
						{expected !== null ? formatCurrency(expected) : "--"}
						{expected !== null && refValue && (
							<span
								className={`text-xs font-bold font-mono ${
									expected < refValue ? "text-lime-400" : expected <= refValue * 1.1 ? `text-[${ACCENT}]` : "text-red-500"
								}`}
							>
								({(((expected - refValue) / refValue) * 100).toFixed(2).replace(".", ",")}%)
							</span>
						)}
					</span>

					<span className="text-xs font-mono font-semibold text-zinc-400">
						{expected !== null ? `Total: ${formatCurrency(globalChecked ? expected * quantidade : expected)}` : "--"}
					</span>

					<div className="flex items-center gap-2 mt-2 bg-zinc-950/40 p-1 px-2 rounded-lg border border-zinc-800/40 w-fit">
						<span className={`font-semibold text-xs select-none transition-colors ${!globalChecked ? "text-lime-400" : "text-zinc-500"}`}>
							Unitário
						</span>
						<Switch checked={globalChecked} onChange={handleSwitchChange} />
						<span className={`font-semibold text-xs select-none transition-colors ${globalChecked ? "text-lime-400" : "text-zinc-500"}`}>
							Global
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}