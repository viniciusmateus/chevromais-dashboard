import React, { useState, useEffect } from "react";

export default function InputMargemCalculada() {
	const [rawMargin, setRawMargin] = useState("");
	const [rawCost, setRawCost] = useState("");
	const [valorCalculado, setValorCalculado] = useState("0,00");

	const formatCurrency = (value) =>
		new Intl.NumberFormat("pt-BR", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);

	const parseToFloat = (value) => parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;

	const formatPercent = (value) => {
		const digits = value.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
		let int = digits.slice(0, 2);
		let dec = digits.slice(2, 4);
		if (parseInt(int) < 10) int = parseInt(int).toString();
		return `${int},${dec}`;
	};

	const handleMarginChange = (e) => {
		const clean = e.target.value.replace(/\D/g, "");
		setRawMargin(clean);
	};

	const handleCostChange = (e) => {
		const clean = e.target.value.replace(/[^0-9,]/g, "");
		setRawCost(clean);
	};

	const aplicarMargemComArredondamento = (custo, margemPercentual) => {
		const margemDecimal = margemPercentual / 100;
		const bruto = custo * (1 + margemDecimal);

		if (bruto < 100) {
			const inteiro = Math.floor(bruto);
			const decimal = Math.ceil((bruto - inteiro) * 10);
			return inteiro + decimal / 10;
		} else {
			return Math.ceil(bruto);
		}
	};

	useEffect(() => {
		const margem = parseToFloat(formatPercent(rawMargin));
		const custo = parseToFloat(rawCost);
		if (margem && custo) {
			const resultado = aplicarMargemComArredondamento(custo, margem);
			setValorCalculado(formatCurrency(resultado));
		} else {
			setValorCalculado("0,00");
		}
	}, [rawMargin, rawCost]);

	return (
		<div className="flex gap-4 items-center w-full">
			{/* Margem (%) */}
			<div className="space-y-1 w-full justify-center">
				<div className="flex">
					<input
						type="text"
						name="margin"
						id="margin"
						className="w-full border border-e-0 border-zinc-700 bg-zinc-950 p-2 px-3 text-lg rounded-l-xl focus:outline-none focus:border-lime-400 font-mono font-bold text-right text-zinc-100"
						value={formatPercent(rawMargin)}
						onChange={handleMarginChange}
						maxLength={5}
						placeholder="00,00"
					/>
					<div className="border border-zinc-700 bg-zinc-800 rounded-r-xl text-lime-400 px-3 font-bold text-sm flex items-center select-none">
						%
					</div>
				</div>
			</div>

			{/* Custo base */}
			<div className="w-full justify-center">
				<div className="flex">
					<input
						type="text"
						name="baseValue"
						id="baseValue"
						className="w-full border border-zinc-700 bg-zinc-950 p-2 px-3 text-lg rounded-xl focus:outline-none focus:border-lime-400 font-mono font-bold text-right text-zinc-100"
						value={rawCost}
						onChange={handleCostChange}
						placeholder="0,00"
					/>
				</div>
			</div>

			{/* Resultado */}
			<div className="p-2 w-full justify-center flex text-2xl font-mono font-extrabold text-lime-400" id="singleResult">
				{valorCalculado}
			</div>
		</div>
	);
}