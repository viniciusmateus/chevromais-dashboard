import React, { useState, useMemo, useRef, useEffect } from "react";
import tireData from "./tire-selection.json";

const formatValue = (val) => (val !== undefined && val !== null ? String(val).replace("_", ".") : "");

const slugify = (text) => {
  if (!text) return "pneus";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

// COMPONENTE COMBOBOX
function CustomCombobox({ options, value, onChange, disabled, placeholder, label, isInvalid, isNextStep }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || "");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const path = event.composedPath ? event.composedPath() : [];
      if (containerRef.current && !path.includes(containerRef.current)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    let rawVal = e.target.value.replace(",", ".");
    rawVal = rawVal.replace(/[^0-9.]/g, "");

    const parts = rawVal.split(".");
    if (parts.length > 2) {
      rawVal = `${parts[0]}.${parts.slice(1).join("")}`;
    }

    setSearchTerm(rawVal);
    setIsOpen(true);
    onChange(rawVal);
  };

  const handleSelectOption = (opt) => {
    const displayVal = formatValue(opt);
    setSearchTerm(displayVal);
    onChange(displayVal);
    setIsOpen(false);
  };

  const { matches, others } = useMemo(() => {
    if (!searchTerm) {
      return { matches: options, others: [] };
    }

    const matched = [];
    const rest = [];

    options.forEach((opt) => {
      const displayVal = formatValue(opt);
      if (displayVal.includes(searchTerm)) {
        matched.push(opt);
      } else {
        rest.push(opt);
      }
    });

    return { matches: matched, others: rest };
  }, [options, searchTerm]);

  const getBorderStyle = () => {
    if (disabled) return "border-gray-900 bg-[#0b0d12]/50";
    if (isOpen) return "border-[#afd136] rounded-t-2xl rounded-b-none border-b-transparent bg-[#0b0d12]";
    if (isInvalid) return "border-red-500 text-red-400 focus:border-red-500 bg-[#0b0d12]";
    if (isNextStep && !value) return "border-[#afd136] bg-[#afd136]/5 animate-pulse shadow-lg shadow-[#afd136]/20";
    if (value) return "border-[#afd136]/60 bg-[#0b0d12] text-[#afd136]";
    return "border-gray-800 focus:border-[#afd136] bg-[#0b0d12]";
  };

  return (
    /* CORREÇÃO AQUI: adicionado z-index dinâmico no container pai (z-40 quando aberto, z-10 quando fechado) */
    <div className={`flex flex-col gap-2 relative transition-all duration-100 ${isOpen ? "z-40" : "z-10"}`} ref={containerRef}>
      <div className="flex items-center justify-center gap-1.5 min-h-[16px]">
        <span className={`text-[11px] font-black uppercase tracking-widest block transition-colors duration-200 ${isNextStep && !value ? "text-[#afd136]" : "text-gray-400"}`}>{label}</span>
        {isNextStep && !value && !disabled && <span className="bg-[#afd136] text-[#080a0e] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">!</span>}
      </div>

      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          placeholder={placeholder}
          value={searchTerm}
          onFocus={(e) => {
            if (!disabled) {
              setIsOpen(true);
              e.target.select();
            }
          }}
          onChange={handleInputChange}
          className={`w-full text-white font-extrabold py-4 border-2 outline-none text-center disabled:opacity-20 disabled:cursor-not-allowed box-border px-3 placeholder:text-gray-600 placeholder:font-normal rounded-2xl ${getBorderStyle()}`}
        />

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500">
          <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#afd136]" : isNextStep ? "text-[#afd136]" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-[70px] left-0 w-full bg-[#0b0d12] border-x-2 border-b-2 border-[#afd136] rounded-b-2xl shadow-2xl z-50 overflow-hidden -mt-[1px] origin-top animate-growDownSmooth">
          <ul className="max-h-60 overflow-y-auto m-0 p-1 list-none divide-y divide-gray-800/40 custom-tire-scrollbar">
            {matches.map((opt) => {
              const displayVal = formatValue(opt);
              const isSelected = displayVal === value || String(opt) === String(value);

              return (
                <li key={opt} onClick={() => handleSelectOption(opt)} className={`p-3 text-center font-extrabold cursor-pointer rounded-xl transition-colors duration-150 ${isSelected ? "bg-[#afd136] text-[#080a0e]" : "text-gray-200 hover:bg-[#afd136]/10 hover:text-[#afd136]"}`}>
                  {displayVal}
                </li>
              );
            })}

            {others.length > 0 && searchTerm && (
              <>
                <li className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-[#131822] text-center sticky top-0 border-y border-gray-800/80">Outras opções</li>
                {others.map((opt) => {
                  const displayVal = formatValue(opt);
                  const isSelected = displayVal === value || String(opt) === String(value);

                  return (
                    <li key={opt} onClick={() => handleSelectOption(opt)} className={`p-3 text-center font-extrabold cursor-pointer rounded-xl transition-colors duration-150 opacity-60 hover:opacity-100 ${isSelected ? "bg-[#afd136] text-[#080a0e] opacity-100" : "text-gray-300 hover:bg-[#afd136]/10 hover:text-[#afd136]"}`}>
                      {displayVal}
                    </li>
                  );
                })}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function TyreSearch() {
  const [isLoading, setIsLoading] = useState(true);
  const tireSelectionData = tireData["tire-selection"] || {};

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const [selectedCatKey, setSelectedCatKey] = useState(null);
  const [widthCat, setWidthCat] = useState("");
  const [profileCat, setProfileCat] = useState("");
  const [rimCat, setRimCat] = useState("");

  const [widthSimple, setWidthSimple] = useState("");
  const [profileSimple, setProfileSimple] = useState("");
  const [rimSimple, setRimSimple] = useState("");

  const sortByMapOrder = (items, mapType) => {
    const mapObj = tireSelectionData?.maps?.[mapType];
    if (!mapObj) return items;

    return [...items].sort((a, b) => {
      const formattedA = formatValue(a);
      const formattedB = formatValue(b);

      const itemA = Object.values(mapObj).find((i) => String(i.label) === formattedA || String(i.label) === String(a));
      const itemB = Object.values(mapObj).find((i) => String(i.label) === formattedB || String(i.label) === String(b));

      const orderA = itemA && itemA.order !== undefined ? Number(itemA.order) : 999;
      const orderB = itemB && itemB.order !== undefined ? Number(itemB.order) : 999;

      if (orderA !== orderB) return orderA - orderB;

      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });
  };

  const getDynamicFeatureId = (mapType, rawValue) => {
    if (!rawValue || rawValue === "-" || rawValue === "") return "";

    const formattedTarget = formatValue(rawValue).trim();
    const rawTarget = String(rawValue).trim();
    const mapObj = tireSelectionData?.maps?.[mapType];

    if (mapObj) {
      for (const key in mapObj) {
        const item = mapObj[key];
        if (!item) continue;

        const itemLabel = String(item.label || "").trim();
        const itemFormatted = formatValue(itemLabel);

        if (itemLabel === rawTarget || itemLabel === formattedTarget || itemFormatted === formattedTarget || key === rawTarget) {
          return item.catID && item.catID.trim() !== "" ? item.catID : rawTarget;
        }
      }
    }

    return rawTarget;
  };

  const categories = useMemo(() => {
    if (!tireSelectionData?.categories) return [];
    return Object.entries(tireSelectionData.categories).map(([key, item]) => ({
      key,
      label: item.label,
      url: item.url || "",
      widths: item.widths || {},
    }));
  }, [tireSelectionData]);

  const selectedCatData = useMemo(() => {
    if (!selectedCatKey || !tireSelectionData?.categories) return null;
    return tireSelectionData.categories[selectedCatKey];
  }, [selectedCatKey, tireSelectionData]);

  const availableWidthsCat = useMemo(() => {
    if (!selectedCatData?.widths) return [];
    const widths = Object.keys(selectedCatData.widths);
    return sortByMapOrder(widths, "width");
  }, [selectedCatData, tireSelectionData]);

  const availableProfilesCat = useMemo(() => {
    if (!selectedCatData?.widths || !widthCat) return [];

    const widthKeyInJson = Object.keys(selectedCatData.widths).find((k) => formatValue(k) === widthCat || k === widthCat);
    const profilesObj = (widthKeyInJson ? selectedCatData.widths[widthKeyInJson] : null) || {};

    const profiles = Object.keys(profilesObj).filter((p) => p !== "_" && p !== "_placeholder" && p !== "-");

    return sortByMapOrder(profiles, "profile");
  }, [selectedCatData, widthCat, tireSelectionData]);

  const availableRimsCat = useMemo(() => {
    if (!selectedCatData?.widths || !widthCat) return [];

    const widthKeyInJson = Object.keys(selectedCatData.widths).find((k) => formatValue(k) === widthCat || k === widthCat);
    const widthObj = (widthKeyInJson ? selectedCatData.widths[widthKeyInJson] : null) || {};

    let rims = [];

    if (profileCat) {
      const profileKeyInJson = Object.keys(widthObj).find((k) => formatValue(k) === profileCat || k === profileCat);
      if (profileKeyInJson && Array.isArray(widthObj[profileKeyInJson])) {
        rims = [...rims, ...widthObj[profileKeyInJson]];
      }
    }

    if (widthObj["-"] && Array.isArray(widthObj["-"])) {
      rims = [...rims, ...widthObj["-"]];
    }

    const uniqueRims = [...new Set(rims)].filter((r) => r !== "");
    return sortByMapOrder(uniqueRims, "rim");
  }, [selectedCatData, widthCat, profileCat, tireSelectionData]);

  const handleCatChange = (catKey) => {
    setSelectedCatKey(catKey);
    setWidthCat("");
    setProfileCat("");
    setRimCat("");
  };

  const combinedData = useMemo(() => {
    if (!tireSelectionData?.categories) return {};
    const combined = {};

    Object.values(tireSelectionData.categories).forEach((cat) => {
      if (!cat.widths) return;
      Object.entries(cat.widths).forEach(([w, profileMap]) => {
        const formattedW = formatValue(w);
        if (!combined[formattedW]) combined[formattedW] = { alwaysRims: [], profileMap: {} };

        Object.entries(profileMap).forEach(([p, rims]) => {
          if (p === "_placeholder") return;
          if (!Array.isArray(rims)) return;

          const formattedP = formatValue(p);
          if (formattedP === "-") {
            combined[formattedW].alwaysRims.push(...rims);
          } else {
            combined[formattedW].profileMap[formattedP] = [...(combined[formattedW].profileMap[formattedP] || []), ...rims];
          }
        });
      });
    });

    return combined;
  }, [tireSelectionData]);

  const availableWidthsSimple = useMemo(() => {
    const widths = Object.keys(combinedData);
    return sortByMapOrder(widths, "width");
  }, [combinedData, tireSelectionData]);

  const availableProfilesSimple = useMemo(() => {
    if (!widthSimple || !combinedData[widthSimple]) return [];
    const profiles = Object.keys(combinedData[widthSimple].profileMap).filter((p) => p !== "-");
    return sortByMapOrder(profiles, "profile");
  }, [widthSimple, combinedData, tireSelectionData]);

  const availableRimsSimple = useMemo(() => {
    if (!widthSimple || !combinedData[widthSimple]) return [];
    const widthData = combinedData[widthSimple];

    let rims = [];
    if (profileSimple && widthData.profileMap[profileSimple]) {
      rims = [...rims, ...widthData.profileMap[profileSimple]];
    }
    if (widthData.alwaysRims.length) {
      rims = [...rims, ...widthData.alwaysRims];
    }

    const uniqueRims = [...new Set(rims)].filter((r) => r !== "");
    return sortByMapOrder(uniqueRims, "rim");
  }, [widthSimple, profileSimple, combinedData, tireSelectionData]);

  const hasDirectRimCatOption = useMemo(() => {
    if (!selectedCatData?.widths || !widthCat) return false;
    const widthKeyInJson = Object.keys(selectedCatData.widths).find((k) => formatValue(k) === widthCat || k === widthCat);
    const widthObj = (widthKeyInJson ? selectedCatData.widths[widthKeyInJson] : null) || {};
    return Array.isArray(widthObj["-"]) && widthObj["-"].length > 0;
  }, [selectedCatData, widthCat]);

  const hasDirectRimSimpleOption = useMemo(() => {
    if (!widthSimple || !combinedData[widthSimple]) return false;
    return combinedData[widthSimple].alwaysRims.length > 0;
  }, [widthSimple, combinedData]);

  const isWidthCatValid = availableWidthsCat.map(formatValue).includes(widthCat) || availableWidthsCat.includes(widthCat);
  const isRimCatValid = Boolean(rimCat) && (availableRimsCat.map(formatValue).includes(rimCat) || availableRimsCat.includes(rimCat));

  const isWidthSimpleValid = availableWidthsSimple.map(formatValue).includes(widthSimple) || availableWidthsSimple.includes(widthSimple);
  const isRimSimpleValid = Boolean(rimSimple) && (availableRimsSimple.map(formatValue).includes(rimSimple) || availableRimsSimple.includes(rimSimple));

  const isRimCatInvalid = Boolean(rimCat) && !isRimCatValid;
  const isRimSimpleInvalid = Boolean(rimSimple) && !isRimSimpleValid;

  const isWidthCatNext = Boolean(selectedCatKey) && !widthCat;
  const isProfileCatNext = Boolean(widthCat) && availableProfilesCat.length > 0 && !profileCat && !rimCat;
  const isRimCatNext = Boolean(widthCat) && !rimCat && (Boolean(profileCat) || hasDirectRimCatOption || availableProfilesCat.length === 0);

  const isWidthSimpleNext = !widthSimple;
  const isProfileSimpleNext = Boolean(widthSimple) && availableProfilesSimple.length > 0 && !profileSimple && !rimSimple;
  const isRimSimpleNext = Boolean(widthSimple) && !rimSimple && (Boolean(profileSimple) || hasDirectRimSimpleOption || availableProfilesSimple.length === 0);

  const handleSearchCat = () => {
    if (!isWidthCatValid || !isRimCatValid) return;

    const wId = getDynamicFeatureId("width", widthCat);
    const pId = getDynamicFeatureId("profile", profileCat);
    const rId = getDynamicFeatureId("rim", rimCat);

    const ids = [wId, pId, rId].filter(Boolean);
    const features = ids.join("%2C");

    const catLabel = selectedCatData?.label || "";
    const rawUrl = selectedCatData?.url;

    let urlPath = rawUrl ? rawUrl.trim() : `/${slugify(catLabel)}`;
    if (urlPath && !urlPath.startsWith("/")) {
      urlPath = `/${urlPath}`;
    }

    window.location.href = `https://www.pneuscuritiba.com.br${urlPath}?feature=${features}`;
  };

  const handleSearchSimple = () => {
    if (!isWidthSimpleValid || !isRimSimpleValid) return;

    const wId = getDynamicFeatureId("width", widthSimple);
    const pId = getDynamicFeatureId("profile", profileSimple);
    const rId = getDynamicFeatureId("rim", rimSimple);

    const ids = [wId, pId, rId].filter(Boolean);
    const features = ids.join("%2C");

    window.location.href = `https://www.pneuscuritiba.com.br/pneus?feature=${features}`;
  };

  return (
    <div className="w-full bg-[#080a0e] p-4 sm:p-8 lg:p-10 font-sans text-left flex justify-center items-center relative">
      <style>{`
        .custom-tire-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-tire-scrollbar::-webkit-scrollbar-track {
          background: #0b0d12;
          border-radius: 8px;
        }
        .custom-tire-scrollbar::-webkit-scrollbar-thumb {
          background: #afd136;
          border-radius: 8px;
        }
        .custom-tire-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #bce03f;
        }

        @keyframes growDownSmooth {
          0% {
            transform: scaleY(0);
          }
          100% {
            transform: scaleY(1);
          }
        }

        .animate-growDownSmooth {
          animation: growDownSmooth 180ms cubic-bezier(0, 0, 0.2, 1) forwards;
        }
      `}</style>

      {/* OVERLAY COM BLUR E BOLINHAS ENQUANTO CARREGA */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-[#080a0e]/40 backdrop-blur-sm flex items-center justify-center rounded-3xl transition-all duration-200">
          <div className="bg-[#131822] border border-gray-800 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-[#afd136] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2.5 h-2.5 bg-[#afd136] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2.5 h-2.5 bg-[#afd136] rounded-full animate-bounce"></div>
          </div>
        </div>
      )}

      {/* FORMULÁRIO PRINCIPAL */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch w-full mx-auto transition-all duration-300 ${isLoading ? "pointer-events-none select-none filter blur-[2px]" : ""}`}>
        {/* PAINEL 1: POR CATEGORIA */}
        <div className="bg-[#131822] border border-gray-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between w-full h-full relative group">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800/80">
              <div className="flex items-center gap-3">
                <span className="bg-[#afd136]/10 text-[#afd136] font-black px-2.5 py-1 rounded-lg border border-[#afd136]/20 font-mono">&gt;&gt;</span>
                <h2 className="font-black text-white uppercase tracking-wider m-0">Buscar por categoria</h2>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-8">
              {categories.map((cat) => {
                const isActive = selectedCatKey === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleCatChange(cat.key)}
                    className={`flex-grow px-8 py-4 font-bold rounded-xl border-2 border-solid cursor-pointer text-center select-none transition-all duration-150 ${
                      isActive
                        ? "bg-[#afd136] text-[#080a0e] border-[#afd136] shadow-lg shadow-[#afd136]/20"
                        : "text-gray-300 bg-[#0b0d12]/90 border-[#afd136]/30 hover:border-[#afd136] hover:bg-[#afd136]/10 hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-800/80 mt-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <CustomCombobox
                label="Largura"
                placeholder="Selecione"
                value={widthCat}
                onChange={(val) => {
                  setWidthCat(val);
                  setProfileCat("");
                  setRimCat("");
                }}
                disabled={!selectedCatKey || availableWidthsCat.length === 0}
                options={availableWidthsCat}
                isNextStep={isWidthCatNext}
              />
              <CustomCombobox
                label="Perfil"
                placeholder="Selecione"
                value={profileCat}
                onChange={(val) => {
                  setProfileCat(val);
                  setRimCat("");
                }}
                disabled={!widthCat || availableProfilesCat.length === 0}
                options={availableProfilesCat}
                isNextStep={isProfileCatNext}
              />
              <CustomCombobox label="Aro" placeholder="Selecione" value={rimCat} onChange={(val) => setRimCat(val)} disabled={!widthCat || availableRimsCat.length === 0} options={availableRimsCat} isInvalid={isRimCatInvalid} isNextStep={isRimCatNext} />
            </div>

            <button type="button" onClick={handleSearchCat} disabled={!selectedCatKey || !isWidthCatValid || !isRimCatValid} className={`w-full font-bold uppercase py-6 tracking-wider rounded-2xl transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-xl border-0 active:scale-[0.99] ${isWidthCatValid && isRimCatValid ? "bg-[#afd136] hover:bg-[#bce03f] text-[#080a0e] shadow-lg shadow-[#afd136]/20" : "bg-gray-800 text-gray-500 opacity-20 cursor-not-allowed"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Buscar por Categoria</span>
            </button>
          </div>
        </div>

        {/* PAINEL 2: POR MEDIDA DIRETA */}
        <div className="bg-[#131822] border border-gray-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between w-full h-full relative group">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800/80">
              <div className="flex items-center gap-3">
                <span className="bg-[#afd136]/10 text-[#afd136] font-black px-2.5 py-1 rounded-lg border border-[#afd136]/20 font-mono">&gt;&gt;</span>
                <h2 className="font-black text-white uppercase tracking-wider m-0">Buscar por medida</h2>
              </div>
            </div>

            <div className="bg-[#0b0d12]/60 p-4 rounded-2xl border border-gray-800/60 mb-8 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-1/2 flex-shrink-0 flex items-center justify-center">
                <img src="https://app.pneuscuritiba.com.br/tire-measures.png" alt="Guia de Medidas do Pneu" className="w-full max-w-[200px] h-auto object-contain rounded-xl" />
              </div>

              <div className="w-full sm:w-1/2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#afd136] block mb-1">Como identificar</span>
                <p className="text-gray-300 font-medium leading-relaxed m-0">
                  Confira as marcações gravadas na lateral do seu pneu (como na imagem de exemplo) e selecione a <strong className="text-white">LARGURA</strong>, <strong className="text-white">PERFIL</strong> e <strong className="text-white">ARO</strong> desejados.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-800/80 mt-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <CustomCombobox
                label="Largura"
                placeholder="Selecione"
                value={widthSimple}
                onChange={(val) => {
                  setWidthSimple(val);
                  setProfileSimple("");
                  setRimSimple("");
                }}
                options={availableWidthsSimple}
                isNextStep={isWidthSimpleNext}
              />
              <CustomCombobox
                label="Perfil"
                placeholder="Selecione"
                value={profileSimple}
                onChange={(val) => {
                  setProfileSimple(val);
                  setRimSimple("");
                }}
                disabled={!widthSimple || availableProfilesSimple.length === 0}
                options={availableProfilesSimple}
                isNextStep={isProfileSimpleNext}
              />
              <CustomCombobox label="Aro" placeholder="Selecione" value={rimSimple} onChange={(val) => setRimSimple(val)} disabled={!widthSimple || availableRimsSimple.length === 0} options={availableRimsSimple} isInvalid={isRimSimpleInvalid} isNextStep={isRimSimpleNext} />
            </div>

            <button type="button" onClick={handleSearchSimple} disabled={!isWidthSimpleValid || !isRimSimpleValid} className={`w-full py-6 font-bold uppercase tracking-wider rounded-2xl transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-xl border-0 active:scale-[0.99] ${isWidthSimpleValid && isRimSimpleValid ? "bg-[#afd136] hover:bg-[#bce03f] text-[#080a0e] shadow-lg shadow-[#afd136]/20" : "bg-gray-800 text-gray-500 opacity-20 cursor-not-allowed"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Buscar por Medida</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}