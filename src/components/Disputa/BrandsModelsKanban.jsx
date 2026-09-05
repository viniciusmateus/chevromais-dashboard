import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import {
  FiEdit2 as EditIcon,
  FiTrash as DeleteIcon,
  FiSearch as SearchIcon,
} from "react-icons/fi";
import AddIcon from "@mui/icons-material/Add";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import CloseIcon from "@mui/icons-material/Close";
import { RxCross1 } from "react-icons/rx";

export default function BrandsModelsKanban() {
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState(null);

  // Estados dos Filtros de Busca
  const [searchBrand, setSearchBrand] = useState("");
  const [searchModel, setSearchModel] = useState("");

  // Estado dos Modais
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: "", // 'brand' ou 'model'
    mode: "add", // 'add' ou 'edit'
    id: null,
    initialValue: "",
  });
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados da Importação por Planilha
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("Nenhum arquivo selecionado");
  const [importStats, setImportStats] = useState(null);
  const [totalRows, setTotalRows] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  // Carregar dados do Supabase (incluindo a coluna usage para marcas e modelos)
  const loadData = async () => {
    try {
      const [brandsRes, modelsRes] = await Promise.all([
        supabase
          .from("brands")
          .select("id, name, usage")
          .order("name", { ascending: true }),
        supabase
          .from("models")
          .select("id, name, brand_id, usage")
          .order("name", { ascending: true }),
      ]);

      if (brandsRes.error) throw brandsRes.error;
      if (modelsRes.error) throw modelsRes.error;

      setBrands(brandsRes.data || []);
      setModels(modelsRes.data || []);
    } catch (err) {
      setError("Erro ao carregar dados: " + err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtra as marcas de acordo com o campo de busca
  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(searchBrand.toLowerCase()),
  );

  // Filtra os modelos pela marca selecionada E pelo termo de busca
  const filteredModels = models.filter(
    (m) =>
      m.brand_id === selectedBrandId &&
      m.name.toLowerCase().includes(searchModel.toLowerCase()),
  );

  // Atalho de teclado para adicionar (ENTER)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (modalConfig.isOpen || isImportModalOpen) return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (!selectedBrandId) {
          openModal("brand", "add");
        } else {
          openModal("model", "add");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedBrandId, modalConfig.isOpen, isImportModalOpen]);

  // Controles do Modal de Cadastro Manual
  const openModal = (type, mode, id = null, initialValue = "") => {
    setModalConfig({ isOpen: true, type, mode, id, initialValue });
    setInputValue(initialValue);
  };

  const closeModal = () => {
    setModalConfig({
      isOpen: false,
      type: "",
      mode: "add",
      id: null,
      initialValue: "",
    });
    setInputValue("");
    setError(null);
  };

  // Salvar Adição / Edição Manual
  const handleSave = async (e) => {
    e.preventDefault();
    const cleanValue = inputValue.trim().toUpperCase();
    if (!cleanValue) return;

    setIsLoading(true);
    const { type, mode, id } = modalConfig;

    try {
      if (type === "brand") {
        if (mode === "add") {
          const { error } = await supabase
            .from("brands")
            .insert([{ name: cleanValue }]);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("brands")
            .update({ name: cleanValue })
            .eq("id", id);
          if (error) throw error;
        }
      } else if (type === "model") {
        if (mode === "add") {
          const { error } = await supabase
            .from("models")
            .insert([{ name: cleanValue, brand_id: selectedBrandId }]);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("models")
            .update({ name: cleanValue })
            .eq("id", id);
          if (error) throw error;
        }
      }

      await loadData();
      closeModal();
    } catch (err) {
      setError("Erro ao salvar: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Excluir Item
  const handleDelete = async (type, id) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir est${type === "brand" ? "a marca" : "e modelo"}?`,
      )
    )
      return;

    try {
      if (type === "brand") {
        await supabase.from("models").delete().eq("brand_id", id);
        const { error } = await supabase.from("brands").delete().eq("id", id);
        if (error) throw error;

        if (selectedBrandId === id) setSelectedBrandId(null);
      } else if (type === "model") {
        const { error } = await supabase.from("models").delete().eq("id", id);
        if (error) throw error;
      }
      await loadData();
    } catch (err) {
      setError("Erro ao excluir: " + err.message);
    }
  };

  // Lógica de Seleção de Arquivo para Importação
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      setSelectedFile(file);
      setImportStats(null);
    } else {
      setFileName("Nenhum arquivo selecionado");
      setSelectedFile(null);
    }
  };

  // Processamento da Planilha com Supabase
  const processImportFile = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const totalRowsCount = rows.length - 1;
      setTotalRows(totalRowsCount);

      if (totalRowsCount <= 0) {
        alert("A planilha selecionada está vazia.");
        setIsImporting(false);
        return;
      }

      const headerRow = rows[0] || [];
      let brandColIndex = null;
      let modelColIndex = null;

      headerRow.forEach((header, idx) => {
        const normalized = header?.toString().trim().toLowerCase();
        if (normalized === "marca") brandColIndex = idx;
        if (normalized === "modelo") modelColIndex = idx;
      });

      if (brandColIndex === null || modelColIndex === null) {
        alert(
          "Erro: Não foi possível identificar as colunas 'Marca' e 'Modelo' na planilha.",
        );
        setIsImporting(false);
        return;
      }

      const [brandsRes, modelsRes] = await Promise.all([
        supabase.from("brands").select("*"),
        supabase.from("models").select("*"),
      ]);

      let currentBrands = brandsRes.data || [];
      let currentModels = modelsRes.data || [];

      let brandsMap = {};
      currentBrands.forEach((b) => {
        brandsMap[b.name.toUpperCase()] = b.id;
      });

      let stats = {
        brandsCreated: 0,
        brandsSkipped: 0,
        modelsCreated: 0,
        modelsSkipped: 0,
        rowsProcessed: 0,
      };

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;

        const rawBrand = row[brandColIndex];
        const rawModel = row[modelColIndex];

        if (!rawBrand || !rawModel) continue;

        const cleanBrand = rawBrand.toString().trim().toUpperCase();
        const cleanModel = rawModel.toString().trim().toUpperCase();

        let brandID = brandsMap[cleanBrand];

        // 1. Processar Marca
        if (brandID) {
          stats.brandsSkipped++;
        } else {
          const { data: newBrand, error: insertBrandErr } = await supabase
            .from("brands")
            .insert([{ name: cleanBrand }])
            .select()
            .single();

          if (insertBrandErr) {
            console.error("Erro ao inserir marca:", insertBrandErr);
            continue;
          }

          brandID = newBrand.id;
          brandsMap[cleanBrand] = brandID;
          stats.brandsCreated++;
        }

        // 2. Processar Modelo
        const isModelExists = currentModels.some(
          (m) => m.name.toUpperCase() === cleanModel && m.brand_id === brandID,
        );

        if (isModelExists) {
          stats.modelsSkipped++;
        } else {
          const { data: newModel, error: insertModelErr } = await supabase
            .from("models")
            .insert([{ name: cleanModel, brand_id: brandID }])
            .select()
            .single();

          if (insertModelErr) {
            console.error("Erro ao inserir modelo:", insertModelErr);
          } else {
            stats.modelsCreated++;
            currentModels.push(newModel);
          }
        }

        stats.rowsProcessed = i;
        setImportStats({ ...stats });
      }

      await loadData();
    } catch (err) {
      alert("Erro ao processar planilha: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setSelectedFile(null);
    setFileName("Nenhum arquivo selecionado");
    setImportStats(null);
    setTotalRows(0);
  };

  // Renderiza coluna kanban genérica
  const renderColumn = ({
    title,
    type,
    data,
    isSelectedFn,
    onClickFn,
    emptyMsg,
    disabled,
    searchValue,
    onSearchChange,
  }) => (
    <div
      className={`shadow-lg overflow-hidden flex flex-col transition-all duration-200 ${disabled ? "opacity-30 pointer-events-none" : "opacity-100"}`}
    >
      {/* Cabeçalho da Coluna */}
      <div className="p-4 text-white flex justify-between items-center border-2 border-[#afdb21]">
        <span className="font-bold uppercase tracking-wider text-[#afdb21]">
          {title}
        </span>
        <button
          onClick={() => !disabled && openModal(type, "add")}
          disabled={disabled}
          className="hover:bg-[#afdb21] cursor-pointer active:scale-95 disabled:opacity-40 text-slate-100 w-10 aspect-square transition-all shadow-sm inline-flex items-center justify-center shrink-0 border-2 border-[#afdb21] hover:text-black"
          title={`Adicionar ${title} (Atalho: ENTER)`}
        >
          <AddIcon sx={{ fontSize: 16 }} />
        </button>
      </div>

      {/* Campo de Pesquisa */}
      {!disabled && (
        <div>
          <div className="relative flex items-center">
            <SearchIcon
              className="absolute left-3 text-zinc-500"
              sx={{ fontSize: 18 }}
            />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Buscar ${title.toLowerCase()}...`}
              className="w-full bg-zinc-950 border-b-2 border-[#afdb21] py-3 pl-9 pr-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#afdb21] placeholder:text-zinc-600 transition-all uppercase"
            />
          </div>
        </div>
      )}

      {/* Lista de Itens */}
      <div className="max-h-125 overflow-y-auto p-1.5 bg-zinc-950 custom-scrollbar">
        {disabled ? (
          <div className="p-6 text-center flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/50 m-2 opacity-70 min-h-25">
            <span className="text-zinc-500 text-xs font-semibold">
              {emptyMsg}
            </span>
          </div>
        ) : data.length === 0 ? (
          <div className="py-6 text-center flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/50 m-2 opacity-70 min-h-25">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
              {searchValue ? "Nenhum resultado encontrado" : "Nenhum item"}
            </span>
          </div>
        ) : (
          data.map((item) => {
            const isSelected = isSelectedFn(item);

            // Contagem dos modelos vinculados (apenas se for marca)
            const modelsCount =
              type === "brand"
                ? models.filter((m) => m.brand_id === item.id).length
                : null;

            // Uso retornado diretamente da coluna 'usage' do banco de dados
            const usageCount = item.usage ?? 0;

            return (
              <div
                key={item.id}
                onClick={() => onClickFn && onClickFn(item)}
                className={`p-3.5 my-1 flex justify-between font-bold items-center transition-all border-2 ${
                  isSelected
                    ? "bg-[#afdb21] text-black border-[#afdb21] shadow-md shadow-[#afdb21]/10"
                    : "border-black/0 hover:border-[#afdb21] text-slate-300 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-2 truncate w-full">
                  {type === "brand" && (
                    <span
                      className={`text-[10px] flex gap-3 items-center justify-end font-semibold transition-colors ${
                        isSelected ? "text-black " : " text-zinc-300"
                      }`}
                    >
                      <span
                        className={`font-black p-1 w-5 aspect-square flex items-center text-black justify-center ${isSelected ? "bg-black/25 " : "bg-[#afdb21]"}`}
                      >
                        {modelsCount}
                      </span>
                    </span>
                  )}
                  <span className="truncate text-sm uppercase w-full">
                    {item.name}
                  </span>

                  {/* Badge para MARCAS: Usado e Modelos */}
                  {type === "brand" && (
                    <span
                      className={`text-[10px] font-semibold transition-colors ${
                        isSelected ? "text-black " : " text-zinc-300"
                      }`}
                    >
                      <span
                        className={`flex items-baseline justify-center gap-1
                          ${
                            isSelected
                              ? "text-black font-bold"
                              : "text-zinc-700 font-bold"
                          }`}
                      >
                        <RxCross1 className="text-[10px]" />{" "}
                        <span className="font-semibold text-sm">
                          {usageCount}
                        </span>
                      </span>
                    </span>
                  )}

                  {/* Badge para MODELOS: apenas Usado */}
                  {type === "model" && (
                    <span className="flex items-baseline justify-center gap-1 text-zinc-700">
                      <RxCross1 className="text-[10px]" />{" "}
                      <span className="font-semibold text-sm">
                        {usageCount}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex gap-1 items-center shrink-0 ml-3">
                  <button
                    title="Editar"
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(type, "edit", item.id, item.name);
                    }}
                    className={`cursor-pointer w-10 h-10 inline-flex items-center justify-center transition-all duration-300 ${
                      isSelected
                        ? " bg-black/25 hover:bg-black/30 text-black"
                        : " hover:text-[#afdb21]"
                    }`}
                  >
                    <EditIcon />
                  </button>
                  <button
                    title="Excluir"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(type, item.id);
                    }}
                    className={`cursor-pointer w-10 h-10 inline-flex items-center justify-center transition-all duration-300 ${
                      isSelected
                        ? "bg-black/25 hover:bg-black/30 text-black hover:text-red-700"
                        : "text-zinc-400 hover:text-red-500"
                    }`}
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6 font-sans text-slate-100 select-none bg-zinc-950 ">
      {/* HEADER E BOTÃO DE IMPORTAR */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="group relative z-10 flex items-center gap-2 bg-transparent border-2 border-[#afdb21] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#afdb21] hover:text-zinc-950 transition-colors duration-300 transform overflow-hidden shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#afdb21] focus:ring-offset-2 focus:ring-offset-zinc-950 cursor-pointer"
        >
          {/* Camada de animação de fundo (preenchimento da esquerda para a direita) */}
          <div className="absolute inset-0 bg-[#afdb21] -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0" />

          {/* Ícone com compensação do skew */}
          <div className="relative z-10 shrink-0 transform">
            <FileUploadIcon sx={{ fontSize: 18 }} />
          </div>

          {/* Texto com compensação do skew */}
          <span className="relative z-10 tracking-wider transform">
            Importar Planilha
          </span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950 border border-red-800 text-red-200 rounded-2xl font-medium text-sm">
          {error}
        </div>
      )}

      {/* GRID KANBAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* COLUNA 1: MARCAS */}
        {renderColumn({
          title: "Marcas",
          type: "brand",
          data: filteredBrands,
          isSelectedFn: (item) => item.id === selectedBrandId,
          onClickFn: (item) => setSelectedBrandId(item.id),
          disabled: false,
          searchValue: searchBrand,
          onSearchChange: setSearchBrand,
        })}

        {/* COLUNA 2: MODELOS */}
        {renderColumn({
          title: "Modelos",
          type: "model",
          data: filteredModels,
          isSelectedFn: () => false,
          onClickFn: null,
          emptyMsg: "Selecione uma marca",
          disabled: !selectedBrandId,
          searchValue: searchModel,
          onSearchChange: setSearchModel,
        })}
      </div>

      {/* MODAL DE ADICIONAR / EDITAR MANUAL */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-zinc-800 transition-all scale-100">
            <h3 className="text-base font-bold mb-5 text-slate-50 capitalize flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#afdb21] rounded-full"></span>
              {modalConfig.mode === "add" ? "Adicionar" : "Editar"}{" "}
              {modalConfig.type === "brand" ? "Marca" : "Modelo"}
            </h3>

            <form onSubmit={handleSave}>
              <div className="flex flex-col gap-5 mb-7">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                    Nome d
                    {modalConfig.type === "brand" ? "a Marca" : "o Modelo"}:
                  </label>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Digite o nome..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#afdb21] font-medium text-slate-100 text-sm transition-all placeholder:text-zinc-600 uppercase"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 bg-zinc-800 text-slate-300 rounded-xl hover:bg-zinc-700 font-semibold text-xs tracking-wide transition-all border border-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-[#afdb21] text-black rounded-xl hover:bg-lime-500 active:scale-95 font-bold text-xs tracking-wide transition-all shadow-lg border border-lime-500 disabled:opacity-50"
                >
                  {isLoading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO DE PLANILHA */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-zinc-800 transition-all">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-slate-50 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#afdb21] rounded-full"></span>
                Importar Marcas e Modelos (.xlsx)
              </h3>
              <button
                onClick={closeImportModal}
                className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <CloseIcon sx={{ fontSize: 20 }} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <label className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border border-zinc-700 transition-all shrink-0">
                  Escolher arquivo
                  <input
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                <span className="text-xs text-zinc-400 truncate max-w-60">
                  {fileName}
                </span>
              </div>

              <button
                onClick={processImportFile}
                disabled={!selectedFile || isImporting}
                className="w-full py-3 bg-[#afdb21] hover:bg-lime-500 active:scale-98 text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg border border-lime-500 mt-2"
              >
                {isImporting ? "Importando..." : "Enviar e Processar"}
              </button>

              {importStats && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mt-2">
                  <div className="mb-3 font-bold text-xs uppercase tracking-wider text-slate-300 pb-2 border-b border-zinc-800">
                    Progresso da Importação
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 mb-3">
                    <div className="flex justify-between">
                      <span>Processadas:</span>
                      <span className="font-bold text-slate-200">
                        {importStats.rowsProcessed}/{totalRows}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Progresso:</span>
                      <span className="font-bold text-slate-200">
                        {Math.round(
                          (importStats.rowsProcessed / totalRows) * 100,
                        )}
                        %
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-zinc-800/60 pt-3">
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>✅ Marcas criadas:</span>
                      <span>{importStats.brandsCreated}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>⏭️ Marcas ignoradas:</span>
                      <span>{importStats.brandsSkipped}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>✅ Modelos criados:</span>
                      <span>{importStats.modelsCreated}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>⏭️ Modelos ignorados:</span>
                      <span>{importStats.modelsSkipped}</span>
                    </div>
                  </div>

                  {importStats.rowsProcessed === totalRows && (
                    <div className="mt-4 pt-3 border-t border-zinc-800 text-center text-[#afdb21] font-bold text-xs uppercase tracking-wide">
                      ✅ Importação Concluída com Sucesso!
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-5 mt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={closeImportModal}
                className="px-5 py-2.5 bg-zinc-800 text-slate-300 rounded-xl hover:bg-zinc-700 font-semibold text-xs tracking-wide transition-all border border-zinc-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESTILOS CSS PERSONALIZADOS PARA A SCROLLBAR */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: red;}
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #afdb21; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #84cc16; }
      `}</style>
    </div>
  );
}
