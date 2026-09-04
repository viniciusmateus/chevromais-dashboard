import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  FaTruck,
  FaMapMarkerAlt,
  FaBoxOpen,
  FaPlus,
  FaMinus,
  FaTrashAlt,
  FaCalculator,
  FaClock,
  FaMoneyBillWave,
  FaCheckCircle,
  FaInfoCircle,
  FaChevronDown,
} from "react-icons/fa";

// Apenas o nome da transportadora
const TRANSPORTADORAS = [{ id: "alfa", nome: "Alfa Transportes" }];

export default function CotacaoFrete() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erroApi, setErroApi] = useState(null);

  const [transpSelecionada, setTranspSelecionada] = useState(
    TRANSPORTADORAS[0],
  );
  const [transpDropdownOpen, setTranspDropdownOpen] = useState(false);
  const transpRef = useRef(null);

  const [dadosGerais, setDadosGerais] = useState({
    cepDestino: "",
    valorNota: "",
    cliTip: 1, // 1 = PJ, 2 = PF
    cnpjDestino: "",
  });

  const [volumes, setVolumes] = useState([
    {
      id: Date.now(),
      qtd: 1,
      peso: "",
      comprimento: "",
      largura: "",
      altura: "",
    },
  ]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (transpRef.current && !transpRef.current.contains(event.target)) {
        setTranspDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFocus = (e) => e.target.select();

  // Máscara CEP (00.000-000)
  const handleCepChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);

    if (value.length > 5) {
      value = value.replace(/^(\d{2})(\d{3})(\d{1,3})$/, "$1.$2-$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{1,3})$/, "$1.$2");
    }

    setDadosGerais((prev) => ({ ...prev, cepDestino: value }));
  };

  // Máscara Valor Nota (R$ 0,00)
  const handleValorNotaChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) {
      setDadosGerais((prev) => ({ ...prev, valorNota: "" }));
      return;
    }
    const numValue = (parseFloat(value) / 100).toFixed(2);
    const formatted = Number(numValue).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setDadosGerais((prev) => ({ ...prev, valorNota: formatted }));
  };

  const parseMoedaToFloat = (valorStr) => {
    if (!valorStr) return 0;
    return parseFloat(valorStr.replace(/\./g, "").replace(",", "."));
  };

  const totais = useMemo(() => {
    return volumes.reduce(
      (acc, vol) => {
        const c = Number(vol.comprimento) / 100;
        const l = Number(vol.largura) / 100;
        const a = Number(vol.altura) / 100;
        const qtd = Number(vol.qtd);

        const m3 = c * l * a * qtd;
        const pesoTotal = Number(vol.peso) * qtd;

        return {
          cubagem: acc.cubagem + m3,
          peso: acc.peso + pesoTotal,
          qtd: acc.qtd + qtd,
        };
      },
      { cubagem: 0, peso: 0, qtd: 0 },
    );
  }, [volumes]);

  const adicionarVolume = () => {
    setVolumes([
      ...volumes,
      {
        id: Date.now(),
        qtd: 1,
        peso: "",
        comprimento: "",
        largura: "",
        altura: "",
      },
    ]);
  };

  const removerVolume = (id) => {
    if (volumes.length === 1) return;
    setVolumes(volumes.filter((v) => v.id !== id));
  };

  const atualizarVolume = (id, campo, valor) => {
    setVolumes(
      volumes.map((v) => (v.id === id ? { ...v, [campo]: valor } : v)),
    );
  };

  const alterarQtd = (id, delta) => {
    setVolumes(
      volumes.map((v) => {
        if (v.id === id) {
          const novaQtd = Math.max(1, Number(v.qtd) + delta);
          return { ...v, qtd: novaQtd };
        }
        return v;
      }),
    );
  };

  const buscarCotacao = async () => {
    const rawCep = dadosGerais.cepDestino.replace(/\D/g, "");
    const rawValor = parseMoedaToFloat(dadosGerais.valorNota);

    if (!rawCep || rawCep.length < 8) {
      setErroApi("Preencha um CEP válido com 8 dígitos.");
      return;
    }

    if (!rawValor || rawValor <= 0) {
      setErroApi("Preencha o valor da nota fiscal.");
      return;
    }

    setLoading(true);
    setErroApi(null);

    const payload = {
      transportadoraId: transpSelecionada.id,
      cepDestino: rawCep,
      valorMercadoria: rawValor,
      pesoTotal: totais.peso,
      volumeTotal: totais.cubagem,
      qtdTotal: totais.qtd,
      cliTip: dadosGerais.cliTip,
      cnpjDestino: dadosGerais.cnpjDestino,
    };

    try {
      const response = await fetch(`/api/cotacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.erro) {
        throw new Error(data.erro || "Erro ao consultar cotação");
      }

      setResultado(data);
    } catch (error) {
      console.error("Erro ao buscar cotação:", error);
      setErroApi(
        error.message || "Houve um erro ao comunicar com a transportadora.",
      );
    } finally {
      setLoading(false);
    }
  };

  const noSpinClasses =
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="w-full max-w-7xl mx-auto text-gray-200 font-sans p-2 md:p-6 selection:bg-[#c3ff00] selection:text-black">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* COLUNA ESQUERDA: Form (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seção 1: Dados Gerais */}
          <div className="bg-[#121212] p-6 rounded-2xl border-2 border-gray-800/80 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2 text-[#c3ff00]">
                <FaMapMarkerAlt size={16} />
                <h3 className="font-bold uppercase tracking-wider text-xs text-white">
                  1. Dados da Cotação & Transportadora
                </h3>
              </div>
              <div className="text-xs text-gray-400 bg-[#1e1e1e] px-3 py-1 rounded-lg border border-gray-800">
                CEP Origem:{" "}
                <span className="text-white font-bold">81810-270</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Transportadora */}
              <div className="space-y-1.5 relative" ref={transpRef}>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Transportadora *
                </label>
                <button
                  type="button"
                  onClick={() => setTranspDropdownOpen(!transpDropdownOpen)}
                  className="w-full h-11.5 bg-[#1e1e1e] border-2 border-gray-800 rounded-xl px-4 text-white text-sm font-semibold flex items-center justify-between hover:border-gray-700 focus:border-[#c3ff00] transition-all cursor-pointer outline-none"
                >
                  <span className="flex items-center gap-2">
                    <FaTruck className="text-[#c3ff00]" size={14} />
                    {transpSelecionada.nome}
                  </span>
                  <FaChevronDown
                    size={12}
                    className={`text-gray-400 transition-transform ${transpDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {transpDropdownOpen && (
                  <div className="absolute top-18.75 left-0 w-full bg-[#1e1e1e] border-2 border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                    {TRANSPORTADORAS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTranspSelecionada(t);
                          setTranspDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-[#c3ff00] bg-[#c3ff00]/10 cursor-pointer"
                      >
                        {t.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tipo do Cliente */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Tipo do Cliente
                </label>
                <select
                  value={dadosGerais.cliTip}
                  onChange={(e) =>
                    setDadosGerais({
                      ...dadosGerais,
                      cliTip: Number(e.target.value),
                    })
                  }
                  className="w-full h-11.5 bg-[#1e1e1e] border-2 border-gray-800 rounded-xl px-4 text-white text-sm font-semibold focus:border-[#c3ff00] transition-all outline-none cursor-pointer"
                >
                  <option value={1}>Pessoa Jurídica (PJ)</option>
                  <option value={2}>Pessoa Física (PF)</option>
                </select>
              </div>

              {/* CEP Destino */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  CEP Destino *
                </label>
                <input
                  type="text"
                  placeholder="00.000-000"
                  value={dadosGerais.cepDestino}
                  onChange={handleCepChange}
                  onFocus={handleFocus}
                  className="w-full h-11.5 bg-[#1e1e1e] border-2 border-gray-800 rounded-xl px-4 text-white text-sm font-semibold focus:border-[#c3ff00] transition-all outline-none"
                />
              </div>

              {/* Valor da Nota */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Valor da Nota (R$) *
                </label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={dadosGerais.valorNota}
                  onChange={handleValorNotaChange}
                  onFocus={handleFocus}
                  className="w-full h-11.5 bg-[#1e1e1e] border-2 border-gray-800 rounded-xl px-4 text-white text-sm font-semibold focus:border-[#c3ff00] transition-all outline-none"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Dimensões dos Volumes */}
          <div className="bg-[#121212] p-6 rounded-2xl border-2 border-gray-800/80 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2 text-[#c3ff00]">
                <FaBoxOpen size={16} />
                <h3 className="font-bold uppercase tracking-wider text-xs text-white">
                  2. Dimensões dos Volumes
                </h3>
              </div>
              <button
                type="button"
                onClick={adicionarVolume}
                className="text-xs font-extrabold text-black bg-[#c3ff00] hover:bg-[#aee600] py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <FaPlus size={11} /> Adicionar Volume
              </button>
            </div>

            {/* Cabeçalho das Colunas */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <div className="col-span-2">Qtd Vol.</div>
              <div className="col-span-2">Peso (Kg)</div>
              <div className="col-span-2">Comp. (cm)</div>
              <div className="col-span-2">Larg. (cm)</div>
              <div className="col-span-2">Alt. (cm)</div>
              <div className="col-span-1 text-center">M³ Ref.</div>
              <div className="col-span-1 text-center">Ações</div>
            </div>

            {/* Lista de Volumes */}
            <div className="space-y-3">
              {volumes.map((vol) => {
                const m3Calc = (
                  (Number(vol.comprimento) / 100) *
                  (Number(vol.largura) / 100) *
                  (Number(vol.altura) / 100) *
                  Number(vol.qtd)
                ).toFixed(3);

                return (
                  <div
                    key={vol.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-[#1e1e1e] p-3 rounded-xl border-2 border-gray-800/60 items-center"
                  >
                    {/* Qtd Vol */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="md:hidden text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                        Qtd Vol.
                      </label>
                      <div className="flex items-center h-11.5 bg-[#121212] border-2 border-gray-800 focus-within:border-[#c3ff00] rounded-xl overflow-hidden transition-all">
                        <button
                          type="button"
                          onClick={() => alterarQtd(vol.id, -1)}
                          className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
                        >
                          <FaMinus size={10} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={vol.qtd}
                          onChange={(e) =>
                            atualizarVolume(vol.id, "qtd", e.target.value)
                          }
                          onFocus={handleFocus}
                          className={`w-full bg-transparent text-center text-sm font-semibold text-white outline-none ${noSpinClasses}`}
                        />
                        <button
                          type="button"
                          onClick={() => alterarQtd(vol.id, 1)}
                          className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
                        >
                          <FaPlus size={10} />
                        </button>
                      </div>
                    </div>

                    {/* Peso */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="md:hidden text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                        Peso (Kg)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={vol.peso}
                        onChange={(e) =>
                          atualizarVolume(vol.id, "peso", e.target.value)
                        }
                        onFocus={handleFocus}
                        className={`w-full h-11.5 bg-[#121212] border-2 border-gray-800 focus:border-[#c3ff00] rounded-xl px-3 text-sm font-semibold text-white transition-all outline-none ${noSpinClasses}`}
                      />
                    </div>

                    {/* Comprimento */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="md:hidden text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                        Comp. (cm)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={vol.comprimento}
                        onChange={(e) =>
                          atualizarVolume(vol.id, "comprimento", e.target.value)
                        }
                        onFocus={handleFocus}
                        className={`w-full h-11.5 bg-[#121212] border-2 border-gray-800 focus:border-[#c3ff00] rounded-xl px-3 text-sm font-semibold text-white transition-all outline-none ${noSpinClasses}`}
                      />
                    </div>

                    {/* Largura */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="md:hidden text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                        Larg. (cm)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={vol.largura}
                        onChange={(e) =>
                          atualizarVolume(vol.id, "largura", e.target.value)
                        }
                        onFocus={handleFocus}
                        className={`w-full h-11.5 bg-[#121212] border-2 border-gray-800 focus:border-[#c3ff00] rounded-xl px-3 text-sm font-semibold text-white transition-all outline-none ${noSpinClasses}`}
                      />
                    </div>

                    {/* Altura */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="md:hidden text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                        Alt. (cm)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={vol.altura}
                        onChange={(e) =>
                          atualizarVolume(vol.id, "altura", e.target.value)
                        }
                        onFocus={handleFocus}
                        className={`w-full h-11.5 bg-[#121212] border-2 border-gray-800 focus:border-[#c3ff00] rounded-xl px-3 text-sm font-semibold text-white transition-all outline-none ${noSpinClasses}`}
                      />
                    </div>

                    {/* M³ Calculado */}
                    <div className="col-span-1 md:col-span-1 flex flex-col justify-center items-center h-11.5 bg-[#121212] border-2 border-gray-800/50 rounded-xl px-1">
                      <span className="text-[9px] text-gray-500 font-bold uppercase leading-none mb-0.5">
                        M³
                      </span>
                      <span className="text-xs font-black text-[#c3ff00] leading-none">
                        {m3Calc}
                      </span>
                    </div>

                    {/* Ação Excluir */}
                    <div className="col-span-1 md:col-span-1 flex items-center justify-center h-11.5">
                      {volumes.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removerVolume(vol.id)}
                          className="h-full w-full flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border-2 border-red-500/20 transition-colors cursor-pointer"
                          title="Remover volume"
                        >
                          <FaTrashAlt size={12} />
                        </button>
                      ) : (
                        <div className="h-full w-full border-2 border-gray-800/40 rounded-xl bg-[#121212]/30"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totais */}
            <div className="flex flex-wrap gap-3 pt-1 text-xs text-gray-400">
              <div className="bg-[#1e1e1e] px-4 py-2 rounded-xl border-2 border-gray-800 flex items-center gap-2">
                Total de Volumes:{" "}
                <strong className="text-white">{totais.qtd}</strong>
              </div>
              <div className="bg-[#1e1e1e] px-4 py-2 rounded-xl border-2 border-gray-800 flex items-center gap-2">
                Peso Total:{" "}
                <strong className="text-white">
                  {totais.peso.toFixed(2)} kg
                </strong>
              </div>
              <div className="bg-[#1e1e1e] px-4 py-2 rounded-xl border-2 border-gray-800 flex items-center gap-2">
                Cubagem Total:{" "}
                <strong className="text-[#c3ff00]">
                  {totais.cubagem.toFixed(4)} m³
                </strong>
              </div>
            </div>
          </div>

          {erroApi && (
            <div className="bg-red-500/10 border-2 border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
              <FaInfoCircle size={18} />
              <span>{erroApi}</span>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: Painel de Resultado */}
        <div className="lg:col-span-1 lg:sticky lg:top-6">
          <div
            className={`p-6 rounded-2xl border-2 transition-all shadow-2xl flex flex-col justify-between ${resultado ? "bg-[#151c11] border-[#c3ff00]/60 shadow-[0_0_30px_rgba(195,255,0,0.1)]" : "bg-[#121212] border-gray-800"}`}
          >
            <div>
              <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
                <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <FaMoneyBillWave
                    className={resultado ? "text-[#c3ff00]" : "text-gray-600"}
                    size={16}
                  />
                  Resultado do Frete
                </span>
                {resultado ? (
                  <span className="bg-[#c3ff00]/20 text-[#c3ff00] text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-[#c3ff00]/40 flex items-center gap-1">
                    <FaCheckCircle size={10} /> CALCULADO
                  </span>
                ) : (
                  <span className="bg-gray-800 text-gray-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                    AGUARDANDO
                  </span>
                )}
              </div>

              {/* Valor Principal */}
              <div className="space-y-1 mb-6">
                <span className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">
                  Valor Total
                </span>
                <div className="text-4xl font-black text-white tracking-tight">
                  {resultado ? (
                    <span className="text-[#c3ff00]">
                      R${" "}
                      {Number(resultado.valorFrete).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  ) : (
                    <span className="text-gray-600">R$ 0,00</span>
                  )}
                </div>
              </div>

              {/* Informações de Prazo e Transportadora */}
              <div className="space-y-3 border-t border-gray-800/80 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-semibold flex items-center gap-2">
                    <FaClock className="text-gray-500" /> Prazo Estimado:
                  </span>
                  <span className="text-sm font-extrabold text-white">
                    {resultado ? resultado.prazo : "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-semibold flex items-center gap-2">
                    <FaTruck className="text-gray-500" /> Transportadora:
                  </span>
                  <span className="text-sm font-extrabold text-white">
                    {transpSelecionada.nome}
                  </span>
                </div>
              </div>

              {/* Detalhamento de Custos */}
              {resultado?.detalhesValores && (
                <div className="mt-6 pt-4 border-t border-gray-800 text-xs space-y-2 bg-[#1a1a1a]/80 p-3.5 rounded-xl border">
                  <p className="font-bold text-gray-300 mb-2 uppercase text-[10px] tracking-wider">
                    Composição da Tarifa:
                  </p>
                  <div className="flex justify-between text-gray-400 font-medium">
                    <span>Valor Inicial:</span>
                    <span className="text-gray-200">
                      R${" "}
                      {Number(
                        resultado.detalhesValores.valorInicial || 0,
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400 font-medium">
                    <span>Pedágio:</span>
                    <span className="text-gray-200">
                      R${" "}
                      {Number(
                        resultado.detalhesValores.valorPedagio || 0,
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400 font-medium">
                    <span>Seguro:</span>
                    <span className="text-gray-200">
                      R${" "}
                      {Number(
                        resultado.detalhesValores.valorSeguro || 0,
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400 font-medium">
                    <span>Taxas / Impostos:</span>
                    <span className="text-gray-200">
                      R${" "}
                      {Number(
                        Number(resultado.detalhesValores.valorTaxa || 0) +
                          Number(resultado.detalhesValores.valorImposto || 0),
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Disparo */}
            <div className="mt-8 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={buscarCotacao}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-[#c3ff00] hover:bg-[#aee600] text-black font-black text-sm py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 shadow-[0_4px_20px_rgba(195,255,0,0.25)] cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <FaCalculator size={16} />
                    CALCULAR FRETE AGORA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
