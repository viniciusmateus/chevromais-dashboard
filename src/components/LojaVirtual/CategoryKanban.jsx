import React, { useState, useEffect } from "react";
import { app } from "../firebase-config";
import {
  getDatabase,
  ref,
  onValue,
  off,
  push,
  update,
  remove,
  set,
} from "firebase/database";
import DeleteIcon from "@mui/icons-material/DeleteForeverOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import AddIcon from "@mui/icons-material/Add";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import MapIcon from "@mui/icons-material/Map";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import SaveIcon from "@mui/icons-material/SaveOutlined";

const encodeKey = (str) => String(str).replace(/\./g, "_");
const decodeKey = (str) => String(str).replace(/_/g, ".");

export default function CategoryKanban() {
  const [activeTab, setActiveTab] = useState("kanban");

  const [categories, setCategories] = useState({});
  const [mapsData, setMapsData] = useState({ width: {}, profile: {}, rim: {} });

  // Seleções ativas
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(null);
  const [selectedWidthKey, setSelectedWidthKey] = useState(null);
  const [selectedProfileKey, setSelectedProfileKey] = useState(null);

  // Drag and Drop State (Uso exclusivo na aba Maps)
  const [draggedItem, setDraggedItem] = useState(null);

  // Estados dos Modais
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: "",
    mode: "add",
    targetPath: "",
    initialValue: "",
    rimIndex: null,
    mapType: "",
    uid: "",
  });

  const [inputValue, setInputValue] = useState("");
  const [mapCatIdSelect, setMapCatIdSelect] = useState("");
  const [mapUrlInput, setMapUrlInput] = useState("");
  const [error, setError] = useState(null);
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  useEffect(() => {
    const database = getDatabase(app);
    const tireSelectionRef = ref(database, "tire-selection");

    const handleData = (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setCategories(val.categories || {});
        setMapsData({
          width: val.maps?.width || {},
          profile: val.maps?.profile || {},
          rim: val.maps?.rim || {},
        });
      } else {
        setCategories({});
        setMapsData({ width: {}, profile: {}, rim: {} });
      }
    };

    onValue(tireSelectionRef, handleData);

    return () => {
      off(tireSelectionRef, "value", handleData);
    };
  }, []);

  // FUNÇÃO QUE COMUNICA COM O NODE.JS PARA SALVAR O ARQUIVO LOCALMENTE
  const saveJsonToLocal = async () => {
    setIsSavingLocal(true);
    const payload = {
      "tire-selection": {
        categories: categories,
        maps: mapsData,
      },
    };

    try {
      const response = await fetch("http://localhost:3001/api/save-json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert("Sucesso: Arquivo tire-selection.json salvo na pasta do servidor Node!");
      } else {
        alert("Erro ao salvar arquivo: " + (result.message || "Erro desconhecido"));
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão: Verifique se o servidor Node está rodando na porta 3001.");
    } finally {
      setIsSavingLocal(false);
    }
  };

  const currentCategory = selectedCategoryKey ? categories[selectedCategoryKey] : null;

  const currentWidths =
    currentCategory && typeof currentCategory.widths === "object" && currentCategory.widths !== null
      ? currentCategory.widths
      : {};

  const currentProfiles =
    selectedWidthKey && typeof currentWidths[selectedWidthKey] === "object" && currentWidths[selectedWidthKey] !== null
      ? currentWidths[selectedWidthKey]
      : {};

  const currentRims =
    selectedProfileKey && Array.isArray(currentProfiles[selectedProfileKey])
      ? currentProfiles[selectedProfileKey]
      : [];

  const sortMapList = (mapType, keysArray) => {
    const mapObj = mapsData[mapType] || {};
    return [...keysArray].sort((aKey, bKey) => {
      const aLabel = decodeKey(aKey);
      const bLabel = decodeKey(bKey);

      const aEntry = Object.values(mapObj).find((item) => String(item?.label) === aLabel);
      const bEntry = Object.values(mapObj).find((item) => String(item?.label) === bLabel);

      const aOrder = aEntry?.order !== undefined ? aEntry.order : 9999;
      const bOrder = bEntry?.order !== undefined ? bEntry.order : 9999;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return aLabel.localeCompare(bLabel, undefined, { numeric: true });
    });
  };

  const sortSelectedToTop = (arrayOrKeys, selectedKey) => {
    if (!selectedKey || !arrayOrKeys) return arrayOrKeys;
    const list = [...arrayOrKeys];
    const index = list.indexOf(selectedKey);
    if (index > -1) {
      list.splice(index, 1);
      list.unshift(selectedKey);
    }
    return list;
  };

  // Reordena exclusivamente pelo Gerenciador de Maps
  const handleDropMaps = async (e, dropIndex, mapType, itemsList) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.type !== mapType) return;

    const dragIndex = draggedItem.index;
    if (dragIndex === dropIndex) return;

    const newList = [...itemsList];
    const [movedItemKey] = newList.splice(dragIndex, 1);
    newList.splice(dropIndex, 0, movedItemKey);

    const database = getDatabase(app);
    const updates = {};

    newList.forEach((itemKey, index) => {
      const label = decodeKey(itemKey);
      const mapEntries = Object.entries(mapsData[mapType] || {});
      const foundEntry = mapEntries.find(([_, item]) => String(item?.label) === label);

      if (foundEntry) {
        const [uid] = foundEntry;
        updates[`tire-selection/maps/${mapType}/${uid}/order`] = index;
      }
    });

    try {
      await update(ref(database), updates);
      setDraggedItem(null);
    } catch (err) {
      setError("Erro ao reordenar itens: " + err.message);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (modalConfig.isOpen || activeTab !== "kanban") return;

      if (e.key === "Enter") {
        e.preventDefault();

        if (!selectedCategoryKey) {
          openModal("category", "add", "tire-selection/categories");
        } else if (!selectedWidthKey) {
          openModal("width", "add", `tire-selection/categories/${selectedCategoryKey}/widths`);
        } else if (!selectedProfileKey) {
          openModal("profile", "add", `tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}`);
        } else {
          openModal("rim", "add", `tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}/${selectedProfileKey}`);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCategoryKey, selectedWidthKey, selectedProfileKey, modalConfig.isOpen, activeTab]);

  const getUsageCategories = (valueToFind, level) => {
    const usedCategories = [];
    const targetValue = encodeKey(valueToFind);

    Object.entries(categories).forEach(([catUid, catData]) => {
      if (!catData?.widths || typeof catData.widths !== "object") return;

      if (level === "width") {
        if (Object.keys(catData.widths).includes(targetValue)) {
          usedCategories.push(catData.label || catUid);
        }
      } else if (level === "profile") {
        Object.values(catData.widths).forEach((profilesObj) => {
          if (profilesObj && typeof profilesObj === "object") {
            if (Object.keys(profilesObj).includes(targetValue)) {
              if (!usedCategories.includes(catData.label || catUid)) {
                usedCategories.push(catData.label || catUid);
              }
            }
          }
        });
      } else if (level === "rim") {
        Object.values(catData.widths).forEach((profilesObj) => {
          if (profilesObj && typeof profilesObj === "object") {
            Object.values(profilesObj).forEach((rimsArr) => {
              if (Array.isArray(rimsArr) && rimsArr.includes(targetValue)) {
                if (!usedCategories.includes(catData.label || catUid)) {
                  usedCategories.push(catData.label || catUid);
                }
              }
            });
          }
        });
      }
    });

    return usedCategories.length > 0 ? usedCategories.join(", ") : "Nenhuma";
  };

  const ensureMapItemExists = (mapType, rawLabelValue, updatesRef, database) => {
    if (rawLabelValue === "-") return;

    const currentMapList = mapsData[mapType] || {};
    const exists = Object.values(currentMapList).some(
      (item) => String(item?.label).trim() === String(rawLabelValue).trim()
    );

    if (!exists) {
      const nextOrder = Object.keys(currentMapList).length;
      const newMapRef = push(ref(database, `tire-selection/maps/${mapType}`));
      updatesRef[`tire-selection/maps/${mapType}/${newMapRef.key}`] = {
        label: rawLabelValue,
        catID: "",
        order: nextOrder,
      };
    }
  };

  const cleanupOrphanMapItem = (mapType, rawLabelValue, updatesRef) => {
    if (rawLabelValue === "-") return;
    const usage = getUsageCategories(rawLabelValue, mapType);

    if (!usage || usage === "Nenhuma") {
      const mapUid = Object.keys(mapsData[mapType] || {}).find(
        (k) => mapsData[mapType][k]?.label === rawLabelValue
      );
      if (mapUid) {
        updatesRef[`tire-selection/maps/${mapType}/${mapUid}`] = null;
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const { type, mode, targetPath, initialValue, rimIndex, mapType, uid } = modalConfig;
    const rawCleanValue = inputValue.trim();
    const encodedValue = encodeKey(rawCleanValue);
    const database = getDatabase(app);

    try {
      const updates = {};

      if (type === "category") {
        if (mode === "add") {
          const newCatRef = push(ref(database, "tire-selection/categories"));
          const newCatKey = newCatRef.key;

          updates[`tire-selection/categories/${newCatKey}`] = {
            label: rawCleanValue,
            url: mapUrlInput.trim() || "",
            widths: "",
          };

          setSelectedCategoryKey(newCatKey);
          setSelectedWidthKey(null);
          setSelectedProfileKey(null);
        } else if (mode === "edit") {
          updates[`${targetPath}/label`] = rawCleanValue;
          updates[`${targetPath}/url`] = mapUrlInput.trim() || "";
        }
      } else if (type === "width") {
        if (mode === "add") {
          updates[`${targetPath}/${encodedValue}`] = { _placeholder: true };
          ensureMapItemExists("width", rawCleanValue, updates, database);

          setSelectedWidthKey(encodedValue);
          setSelectedProfileKey(null);
        } else if (mode === "edit") {
          const oldRawValue = decodeKey(initialValue);
          const oldData = currentWidths[initialValue] || "";

          if (initialValue !== encodedValue) {
            const existingNewData = currentWidths[encodedValue] || {};
            const mergedData =
              typeof oldData === "object" && typeof existingNewData === "object"
                ? { ...existingNewData, ...oldData }
                : oldData;

            updates[`${targetPath}/${initialValue}`] = null;
            updates[`${targetPath}/${encodedValue}`] = mergedData;

            ensureMapItemExists("width", rawCleanValue, updates, database);
            cleanupOrphanMapItem("width", oldRawValue, updates);

            if (selectedWidthKey === initialValue) {
              setSelectedWidthKey(encodedValue);
            }
          }
        }
      } else if (type === "profile") {
        if (mode === "add") {
          updates[`${targetPath}/${encodedValue}`] = [""];
          ensureMapItemExists("profile", rawCleanValue, updates, database);

          setSelectedProfileKey(encodedValue);
        } else if (mode === "edit") {
          const oldRawValue = decodeKey(initialValue);
          const oldData = currentProfiles[initialValue] || [];

          if (initialValue !== encodedValue) {
            const existingNewData = currentProfiles[encodedValue] || [];
            const mergedRims = Array.from(new Set([...existingNewData, ...oldData]));

            updates[`${targetPath}/${initialValue}`] = null;
            updates[`${targetPath}/${encodedValue}`] = mergedRims;

            ensureMapItemExists("profile", rawCleanValue, updates, database);
            cleanupOrphanMapItem("profile", oldRawValue, updates);

            if (selectedProfileKey === initialValue) {
              setSelectedProfileKey(encodedValue);
            }
          }
        }
      } else if (type === "rim") {
        const updatedRims = currentRims.filter((r) => r !== "");
        if (mode === "add") {
          if (!updatedRims.includes(encodedValue)) {
            updatedRims.push(encodedValue);
          }
          ensureMapItemExists("rim", rawCleanValue, updates, database);
        } else if (mode === "edit") {
          const oldRimVal = decodeKey(currentRims[rimIndex]);
          updatedRims[rimIndex] = encodedValue;

          ensureMapItemExists("rim", rawCleanValue, updates, database);
          cleanupOrphanMapItem("rim", oldRimVal, updates);
        }
        updates[targetPath] = updatedRims;
      } else if (type === "mapItem" && mode === "edit") {
        const oldLabel = mapsData[mapType][uid]?.label;
        const oldEncodedLabel = encodeKey(oldLabel);

        updates[`tire-selection/maps/${mapType}/${uid}/label`] = rawCleanValue;
        updates[`tire-selection/maps/${mapType}/${uid}/catID`] = mapCatIdSelect || "";

        if (oldLabel && oldLabel !== rawCleanValue) {
          Object.entries(categories).forEach(([catUid, catData]) => {
            if (!catData?.widths || typeof catData.widths !== "object") return;

            if (mapType === "width" && catData.widths[oldEncodedLabel]) {
              const widthContent = catData.widths[oldEncodedLabel];
              updates[`tire-selection/categories/${catUid}/widths/${oldEncodedLabel}`] = null;
              updates[`tire-selection/categories/${catUid}/widths/${encodedValue}`] = widthContent;
            } else if (mapType === "profile") {
              Object.entries(catData.widths).forEach(([wKey, pObj]) => {
                if (pObj && typeof pObj === "object" && pObj[oldEncodedLabel]) {
                  const pContent = pObj[oldEncodedLabel];
                  updates[`tire-selection/categories/${catUid}/widths/${wKey}/${oldEncodedLabel}`] = null;
                  updates[`tire-selection/categories/${catUid}/widths/${wKey}/${encodedValue}`] = pContent;
                }
              });
            } else if (mapType === "rim") {
              Object.entries(catData.widths).forEach(([wKey, pObj]) => {
                if (pObj && typeof pObj === "object") {
                  Object.entries(pObj).forEach(([pKey, rArr]) => {
                    if (Array.isArray(rArr) && rArr.includes(oldEncodedLabel)) {
                      const newArr = rArr.map((r) => (r === oldEncodedLabel ? encodedValue : r));
                      updates[`tire-selection/categories/${catUid}/widths/${wKey}/${pKey}`] = newArr;
                    }
                  });
                }
              });
            }
          });
        }
      }

      if (type === "profile" && currentWidths[selectedWidthKey]?._placeholder) {
        updates[`tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}/_placeholder`] = null;
      }

      await update(ref(database), updates);
      closeModal();
    } catch (err) {
      setError("Erro ao salvar dados: " + err.message);
    }
  };

  const handleAddNoProfile = async () => {
    if (!selectedCategoryKey || !selectedWidthKey) return;
    const database = getDatabase(app);
    try {
      const targetPath = `tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}/-`;
      await set(ref(database, targetPath), [""]);
      setSelectedProfileKey("-");
    } catch (err) {
      setError("Erro ao adicionar sem perfil: " + err.message);
    }
  };

  const handleDelete = async (path, keyToRemove, type) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    const database = getDatabase(app);

    try {
      const updates = {};

      if (type === "rim") {
        const removedRimVal = decodeKey(currentRims[keyToRemove]);
        const updatedRims = currentRims.filter((_, idx) => idx !== keyToRemove);
        updates[path] = updatedRims;

        cleanupOrphanMapItem("rim", removedRimVal, updates);
      } else if (type === "mapItem") {
        const pathParts = path.split("/");
        const mapType = pathParts[2];
        const uid = pathParts[3];
        const labelToDelete = mapsData[mapType][uid]?.label;
        const encodedToDelete = encodeKey(labelToDelete);

        updates[path] = null;

        if (labelToDelete) {
          Object.entries(categories).forEach(([catUid, catData]) => {
            if (!catData?.widths || typeof catData.widths !== "object") return;

            if (mapType === "width" && catData.widths[encodedToDelete]) {
              updates[`tire-selection/categories/${catUid}/widths/${encodedToDelete}`] = null;
            } else if (mapType === "profile") {
              Object.entries(catData.widths).forEach(([wKey, pObj]) => {
                if (pObj && typeof pObj === "object" && pObj[encodedToDelete]) {
                  updates[`tire-selection/categories/${catUid}/widths/${wKey}/${encodedToDelete}`] = null;
                }
              });
            } else if (mapType === "rim") {
              Object.entries(catData.widths).forEach(([wKey, pObj]) => {
                if (pObj && typeof pObj === "object") {
                  Object.entries(pObj).forEach(([pKey, rArr]) => {
                    if (Array.isArray(rArr) && rArr.includes(encodedToDelete)) {
                      const newArr = rArr.filter((r) => r !== encodedToDelete);
                      updates[`tire-selection/categories/${catUid}/widths/${wKey}/${pKey}`] = newArr;
                    }
                  });
                }
              });
            }
          });
        }
      } else {
        updates[`${path}/${keyToRemove}`] = null;

        const decodedKeyToRemove = decodeKey(keyToRemove);
        if (type === "width" || type === "profile") {
          cleanupOrphanMapItem(type, decodedKeyToRemove, updates);
        }

        if (type === "category" && selectedCategoryKey === keyToRemove) {
          setSelectedCategoryKey(null);
          setSelectedWidthKey(null);
          setSelectedProfileKey(null);
        } else if (type === "width" && selectedWidthKey === keyToRemove) {
          setSelectedWidthKey(null);
          setSelectedProfileKey(null);
        } else if (type === "profile" && selectedProfileKey === keyToRemove) {
          setSelectedProfileKey(null);
        }
      }

      await update(ref(database), updates);
    } catch (err) {
      setError("Erro ao excluir: " + err.message);
    }
  };

  const openModal = (type, mode, targetPath, initialValue = "", rimIndex = null, mapType = "", uid = "", initialUrl = "") => {
    setModalConfig({ 
      isOpen: true, 
      type, 
      mode, 
      targetPath, 
      initialValue: decodeKey(initialValue), 
      rimIndex,
      mapType, 
      uid 
    });
    setInputValue(decodeKey(initialValue));
    setMapCatIdSelect("");
    setMapUrlInput(initialUrl || "");
  };

  const openEditMapModal = (mapType, uid, item) => {
    setModalConfig({
      isOpen: true,
      type: "mapItem",
      mode: "edit",
      targetPath: "",
      initialValue: item?.label || "",
      rimIndex: null,
      mapType,
      uid,
    });
    setInputValue(item?.label || "");
    setMapCatIdSelect(item?.catID || "");
    setMapUrlInput("");
  };

  const closeModal = () => {
    setModalConfig({
      isOpen: false,
      type: "",
      mode: "add",
      targetPath: "",
      initialValue: "",
      rimIndex: null,
      mapType: "",
      uid: "",
    });
    setInputValue("");
    setMapCatIdSelect("");
    setMapUrlInput("");
  };

  if (error) {
    return (
      <div className="p-4 m-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl font-medium text-sm">
        Erro: {error}
      </div>
    );
  }

  const orderedCategoryKeys = Object.keys(categories);
  const rawWidthKeys = sortMapList("width", Object.keys(currentWidths).filter((k) => k !== "_placeholder"));
  const orderedWidthKeys = sortSelectedToTop(rawWidthKeys, selectedWidthKey);

  const rawProfileKeys = sortMapList("profile", Object.keys(currentProfiles).filter((k) => k !== "_placeholder" && k !== "-"));
  const orderedProfileKeys = sortSelectedToTop(rawProfileKeys, selectedProfileKey);

  const rawRimKeys = sortMapList("rim", currentRims.filter((r) => r !== ""));

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6 font-sans text-slate-800 select-none">
      
      {/* NAVEGAÇÃO SUPERIOR */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200/80 shadow-inner">
        <button
          onClick={() => setActiveTab("kanban")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wide uppercase transition-all duration-150 ${
            activeTab === "kanban"
              ? "bg-white text-slate-900 shadow-md shadow-slate-200/60"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <ViewKanbanIcon className="text-slate-600" sx={{ fontSize: 18 }} />
          Navegador Kanban
        </button>
        <button
          onClick={() => setActiveTab("maps")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wide uppercase transition-all duration-150 ${
            activeTab === "maps"
              ? "bg-white text-slate-900 shadow-md shadow-slate-200/60"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <MapIcon className="text-slate-600" sx={{ fontSize: 18 }} />
          Gerenciador de Maps
        </button>

        {/* BOTÃO SALVAR JSON VIA NODE.JS */}
        <button
          onClick={saveJsonToLocal}
          disabled={isSavingLocal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wide uppercase bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-md transition-all duration-150 active:scale-95"
          title="Salvar arquivo JSON via servidor Node local"
        >
          <SaveIcon sx={{ fontSize: 18 }} />
          {isSavingLocal ? "Salvando..." : "Salvar JSON Local"}
        </button>
      </div>

      {/* ABA 1: KANBAN */}
      {activeTab === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          
          {/* COLUNA 1: CATEGORIA */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Categoria
              </span>
              <button
                onClick={() => openModal("category", "add", "tire-selection/categories")}
                className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white w-7 h-7 rounded-lg transition-all shadow-sm inline-flex items-center justify-center shrink-0"
                title="Adicionar Categoria (Atalho: ENTER)"
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto p-1.5">
              {orderedCategoryKeys.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  Nenhuma categoria
                </div>
              ) : (
                orderedCategoryKeys.map((catUid) => {
                  const catData = categories[catUid];
                  const isSelected = selectedCategoryKey === catUid;

                  return (
                    <div
                      key={catUid}
                      onClick={() => {
                        setSelectedCategoryKey(catUid);
                        setSelectedWidthKey(null);
                        setSelectedProfileKey(null);
                      }}
                      className={`p-3.5 my-1 rounded-xl flex justify-between items-center cursor-pointer transition-all ${
                        isSelected
                          ? "bg-slate-300 text-slate-900 font-bold shadow-sm"
                          : "hover:bg-slate-100/80 text-slate-700 font-medium"
                      }`}
                    >
                      <span className="truncate text-sm">{catData?.label || catUid}</span>
                      <div className="flex gap-1 items-center shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal("category", "edit", `tire-selection/categories/${catUid}`, catData?.label, null, "", "", catData?.url);
                          }}
                          className={`w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors ${
                            isSelected 
                              ? "bg-slate-400/30 hover:bg-slate-400/60 text-slate-800" 
                              : "hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                          }`}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete("tire-selection/categories", catUid, "category");
                          }}
                          className={`w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors ${
                            isSelected 
                              ? "bg-slate-400/30 hover:bg-slate-400/60 text-red-700" 
                              : "hover:bg-slate-200 text-slate-400 hover:text-red-600"
                          }`}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA 2: LARGURA */}
          <div
            className={`bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-200 ${
              !selectedCategoryKey ? "opacity-30 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Largura
              </span>
              <button
                onClick={() =>
                  selectedCategoryKey &&
                  openModal("width", "add", `tire-selection/categories/${selectedCategoryKey}/widths`)
                }
                disabled={!selectedCategoryKey}
                className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 text-white w-7 h-7 rounded-lg transition-all shadow-sm inline-flex items-center justify-center shrink-0"
                title="Adicionar Largura (Atalho: ENTER)"
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto p-1.5">
              {!selectedCategoryKey ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  Selecione uma categoria
                </div>
              ) : orderedWidthKeys.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  Nenhuma largura
                </div>
              ) : (
                orderedWidthKeys.map((widthKey) => {
                  const isSelected = selectedWidthKey === widthKey;

                  return (
                    <div
                      key={widthKey}
                      onClick={() => {
                        setSelectedWidthKey(widthKey);
                        setSelectedProfileKey(null);
                      }}
                      className={`p-3.5 my-1 rounded-xl flex justify-between items-center cursor-pointer transition-all ${
                        isSelected
                          ? "bg-slate-300 text-slate-900 font-bold shadow-sm"
                          : "hover:bg-slate-100/80 text-slate-700 font-medium"
                      }`}
                    >
                      <span className="text-sm">{decodeKey(widthKey)}</span>
                      <div className="flex gap-1 items-center shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal("width", "edit", `tire-selection/categories/${selectedCategoryKey}/widths`, widthKey);
                          }}
                          className={`w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors ${
                            isSelected 
                              ? "bg-slate-400/30 hover:bg-slate-400/60 text-slate-800" 
                              : "hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                          }`}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(`tire-selection/categories/${selectedCategoryKey}/widths`, widthKey, "width");
                          }}
                          className={`w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors ${
                            isSelected 
                              ? "bg-slate-400/30 hover:bg-slate-400/60 text-red-700" 
                              : "hover:bg-slate-200 text-slate-400 hover:text-red-600"
                          }`}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA 3: PERFIL */}
          <div
            className={`bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-200 ${
              !selectedWidthKey ? "opacity-30 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Perfil
              </span>
              <button
                onClick={() =>
                  selectedWidthKey &&
                  openModal("profile", "add", `tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}`)
                }
                disabled={!selectedWidthKey}
                className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 text-white w-7 h-7 rounded-lg transition-all shadow-sm inline-flex items-center justify-center shrink-0"
                title="Adicionar Perfil (Atalho: ENTER)"
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto p-1.5">
              {!selectedWidthKey ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  Selecione uma largura
                </div>
              ) : (
                <>
                  {(() => {
                    const noProfileElement = (
                      <div
                        key="no-profile-item"
                        onClick={() => {
                          if (!Object.keys(currentProfiles).includes("-")) {
                            handleAddNoProfile();
                          } else {
                            setSelectedProfileKey("-");
                          }
                        }}
                        className={`p-3.5 my-1 rounded-xl flex justify-between items-center cursor-pointer transition-all border border-dashed ${
                          selectedProfileKey === "-"
                            ? "bg-slate-300 text-slate-900 font-bold border-transparent shadow-sm"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-700 font-medium"
                        }`}
                      >
                        <span className="text-sm">- (Sem perfil)</span>
                      </div>
                    );

                    if (!selectedProfileKey || selectedProfileKey === "-") {
                      return (
                        <>
                          {noProfileElement}
                          {orderedProfileKeys.map((profileKey) => (
                            <div
                              key={profileKey}
                              onClick={() => setSelectedProfileKey(profileKey)}
                              className="p-3.5 my-1 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:bg-slate-100/80 text-slate-700 font-medium"
                            >
                              <span className="text-sm">{decodeKey(profileKey)}</span>
                              <div className="flex gap-1 items-center shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openModal("profile", "edit", `tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}`, profileKey);
                                  }}
                                  className="w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                                >
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(`tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}`, profileKey, "profile");
                                  }}
                                  className="w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-slate-200 text-slate-400 hover:text-red-600 transition-colors"
                                >
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    }

                    const firstProfile = orderedProfileKeys[0];
                    const remainingProfiles = orderedProfileKeys.slice(1);

                    return (
                      <>
                        <div
                          key={firstProfile}
                          onClick={() => setSelectedProfileKey(firstProfile)}
                          className="p-3.5 my-1 rounded-xl flex justify-between items-center cursor-pointer transition-all bg-slate-300 text-slate-900 font-bold shadow-sm"
                        >
                          <span className="text-sm">{decodeKey(firstProfile)}</span>
                          <div className="flex gap-1 items-center shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openModal("profile", "edit", `tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}`, firstProfile);
                              }}
                              className="w-7 h-7 rounded-md inline-flex items-center justify-center bg-slate-400/30 hover:bg-slate-400/60 text-slate-800 transition-colors"
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(`tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}`, firstProfile, "profile");
                              }}
                              className="w-7 h-7 rounded-md inline-flex items-center justify-center bg-slate-400/30 hover:bg-slate-400/60 text-red-700 transition-colors"
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </button>
                          </div>
                        </div>

                        {noProfileElement}

                        {remainingProfiles.map((profileKey) => (
                          <div
                            key={profileKey}
                            onClick={() => setSelectedProfileKey(profileKey)}
                            className="p-3.5 my-1 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:bg-slate-100/80 text-slate-700 font-medium"
                          >
                            <span className="text-sm">{decodeKey(profileKey)}</span>
                            <div className="flex gap-1 items-center shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal("profile", "edit", `tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}`, profileKey);
                                }}
                                className="w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                              >
                                <EditIcon sx={{ fontSize: 16 }} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(`tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}`, profileKey, "profile");
                                }}
                                className="w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-slate-200 text-slate-400 hover:text-red-600 transition-colors"
                              >
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>

          {/* COLUNA 4: ARO */}
          <div
            className={`bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-200 ${
              !selectedProfileKey ? "opacity-30 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Aro
              </span>
              <button
                onClick={() =>
                  selectedProfileKey &&
                  openModal("rim", "add", `tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}/${selectedProfileKey}`)
                }
                disabled={!selectedProfileKey}
                className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 text-white w-7 h-7 rounded-lg transition-all shadow-sm inline-flex items-center justify-center shrink-0"
                title="Adicionar Aro (Atalho: ENTER)"
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto p-1.5">
              {!selectedProfileKey ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  Selecione um perfil
                </div>
              ) : rawRimKeys.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  Nenhum aro
                </div>
              ) : (
                rawRimKeys.map((rimValue, index) => (
                  <div
                    key={index}
                    className="p-3.5 my-1 rounded-xl flex justify-between items-center bg-white border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all text-slate-700"
                  >
                    <span className="text-sm font-semibold">{decodeKey(rimValue)}</span>
                    <div className="flex gap-1 items-center shrink-0">
                      <button
                        onClick={() => openModal("rim", "edit", `tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}/${selectedProfileKey}`, rimValue, index)}
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </button>
                      <button
                        onClick={() => handleDelete(`tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}/${selectedProfileKey}`, index, "rim")}
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-slate-200 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ABA 2: GERENCIADOR DE MAPS */}
      {activeTab === "maps" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* MAPS: CATEGORY */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex justify-between items-center">
              <span>Maps: Categoria</span>
              <span className="text-[10px] bg-slate-700/80 text-slate-200 px-2.5 py-0.5 rounded-full font-normal">
                {Object.keys(categories).length} {Object.keys(categories).length === 1 ? "item" : "itens"}
              </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto p-1.5">
              {Object.keys(categories).length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  Nenhuma categoria cadastrada
                </div>
              ) : (
                Object.entries(categories).map(([catUid, catData]) => {
                  const hasUrl = Boolean(catData?.url);

                  return (
                    <div
                      key={catUid}
                      className="p-3.5 my-1 rounded-xl flex justify-between items-center bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-base font-bold text-slate-900">{catData?.label || catUid}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                              hasUrl ? "bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/80" : "bg-slate-100 text-slate-400"
                            }`}>
                              URL: {catData?.url || "vazio"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 items-center shrink-0">
                        <button
                          onClick={() => openModal("category", "edit", `tire-selection/categories/${catUid}`, catData?.label, null, "", catUid, catData?.url)}
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </button>
                        <button
                          onClick={() => handleDelete("tire-selection/categories", catUid, "category")}
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-slate-200/80 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* MAPS: WIDTH, PROFILE, RIM */}
          {["width", "profile", "rim"].map((mapType) => {
            const sortedMapEntries = Object.entries(mapsData[mapType] || {}).sort((a, b) => {
              const orderA = a[1]?.order !== undefined ? a[1].order : 9999;
              const orderB = b[1]?.order !== undefined ? b[1].order : 9999;
              if (orderA !== orderB) return orderA - orderB;
              return String(a[1]?.label).localeCompare(String(b[1]?.label), undefined, { numeric: true });
            });

            const keysList = sortedMapEntries.map(([_, item]) => encodeKey(item?.label));

            return (
              <div key={mapType} className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex justify-between items-center">
                  <span>Maps: {mapType}</span>
                  <span className="text-[10px] bg-slate-700/80 text-slate-200 px-2.5 py-0.5 rounded-full font-normal">
                    {sortedMapEntries.length} {sortedMapEntries.length === 1 ? "item" : "itens"}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto p-1.5">
                  {sortedMapEntries.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs font-medium">
                      Nenhum mapeamento em {mapType}
                    </div>
                  ) : (
                    sortedMapEntries.map(([uid, item], index) => {
                      const usageCats = getUsageCategories(item?.label, mapType);
                      const hasCatId = Boolean(item?.catID);

                      return (
                        <div
                          key={uid}
                          draggable
                          onDragStart={() => setDraggedItem({ index, type: mapType, list: keysList })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropMaps(e, index, mapType, keysList)}
                          className="p-3.5 my-1 rounded-xl flex justify-between items-center bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all cursor-grab active:cursor-grabbing group"
                        >
                          <div className="flex items-center gap-3">
                            <DragHandleIcon sx={{ fontSize: 16 }} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-base font-bold text-slate-900">{item?.label}</span>
                              <span className="text-slate-500 text-[11px] font-medium">
                                <strong className="text-slate-700">Categorias:</strong> {usageCats}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                                  hasCatId ? "bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/80" : "bg-slate-100 text-slate-400"
                                }`}>
                                  catID: {item?.catID || "vazio"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 items-center shrink-0">
                            <button
                              onClick={() => openEditMapModal(mapType, uid, item)}
                              className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors"
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </button>
                            <button
                              onClick={() => handleDelete(`tire-selection/maps/${mapType}/${uid}`, null, "mapItem")}
                              className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-slate-200/80 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE ADICIONAR / EDITAR */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 transition-all">
            <h3 className="text-base font-bold mb-4 text-slate-900 capitalize">
              {modalConfig.mode === "add" ? "Adicionar" : "Editar"}{" "}
              {modalConfig.type === "mapItem" ? `Map (${modalConfig.mapType})` : modalConfig.type}
            </h3>
            <form onSubmit={handleSave}>
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Nome/Valor:</label>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ex: Máquinas Agrícolas, 7.50, 185..."
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 font-medium text-slate-800 text-sm transition-all"
                    autoFocus
                  />
                </div>

                {modalConfig.type === "category" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      URL do Site:
                    </label>
                    <input
                      type="text"
                      value={mapUrlInput}
                      onChange={(e) => setMapUrlInput(e.target.value)}
                      placeholder="Ex: /maquinas-agricolas"
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 font-medium text-slate-800 text-sm transition-all"
                    />
                  </div>
                )}

                {modalConfig.type === "mapItem" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      catID (ID do Site):
                    </label>
                    <input
                      type="text"
                      value={mapCatIdSelect}
                      onChange={(e) => setMapCatIdSelect(e.target.value)}
                      placeholder="Ex: 3152185"
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 font-medium text-slate-800 text-sm transition-all"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold text-xs tracking-wide transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 active:scale-95 font-semibold text-xs tracking-wide transition-all shadow-md shadow-slate-200"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}