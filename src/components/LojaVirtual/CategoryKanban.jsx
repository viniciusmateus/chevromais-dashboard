import React, { useState, useEffect } from "react";
import { app } from "../firebase-config";
import { getDatabase, ref, onValue, off, push, update, remove, set } from "firebase/database";
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

	const currentWidths = currentCategory && typeof currentCategory.widths === "object" && currentCategory.widths !== null ? currentCategory.widths : {};

	const currentProfiles = selectedWidthKey && typeof currentWidths[selectedWidthKey] === "object" && currentWidths[selectedWidthKey] !== null ? currentWidths[selectedWidthKey] : {};

	const currentRims = selectedProfileKey && Array.isArray(currentProfiles[selectedProfileKey]) ? currentProfiles[selectedProfileKey] : [];

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
		const exists = Object.values(currentMapList).some((item) => String(item?.label).trim() === String(rawLabelValue).trim());

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
			const mapUid = Object.keys(mapsData[mapType] || {}).find((k) => mapsData[mapType][k]?.label === rawLabelValue);
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
						const mergedData = typeof oldData === "object" && typeof existingNewData === "object" ? { ...existingNewData, ...oldData } : oldData;

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
			uid,
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
		return <div className="p-4 m-4 bg-red-950 border border-red-800 text-red-200 rounded-2xl font-medium text-sm">Erro: {error}</div>;
	}

	const orderedCategoryKeys = Object.keys(categories);
	const rawWidthKeys = sortMapList(
		"width",
		Object.keys(currentWidths).filter((k) => k !== "_placeholder"),
	);
	const orderedWidthKeys = sortSelectedToTop(rawWidthKeys, selectedWidthKey);

	const rawProfileKeys = sortMapList(
		"profile",
		Object.keys(currentProfiles).filter((k) => k !== "_placeholder" && k !== "-"),
	);
	const orderedProfileKeys = sortSelectedToTop(rawProfileKeys, selectedProfileKey);

	const rawRimKeys = sortMapList(
		"rim",
		currentRims.filter((r) => r !== ""),
	);

	return (
		<div className="p-6 max-w-7xl mx-auto flex flex-col gap-6 font-sans text-slate-100 select-none bg-zinc-950 min-h-screen">
			{/* NAVEGAÇÃO SUPERIOR */}
			<div className="flex items-center justify-between gap-4 p-4 bg-zinc-900 rounded-2xl border border-zinc-800/80 shadow-2xl">
				<div className="flex items-center gap-1.5 p-1.5 bg-zinc-950 rounded-xl w-fit border border-zinc-800/80">
					<button onClick={() => setActiveTab("kanban")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-xs tracking-wide uppercase transition-all duration-150 ${activeTab === "kanban" ? "bg-zinc-800 text-slate-50 shadow-md border border-zinc-700" : "text-slate-400 hover:text-slate-50 hover:bg-zinc-800/50"}`}>
						<ViewKanbanIcon className="text-lime-400" sx={{ fontSize: 18 }} />
						Navegador Kanban
					</button>
					<button onClick={() => setActiveTab("maps")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-xs tracking-wide uppercase transition-all duration-150 ${activeTab === "maps" ? "bg-zinc-800 text-slate-50 shadow-md border border-zinc-700" : "text-slate-400 hover:text-slate-50 hover:bg-zinc-800/50"}`}>
						<MapIcon className="text-lime-400" sx={{ fontSize: 18 }} />
						Gerenciador de Maps
					</button>
				</div>

				{/* BOTÃO SALVAR JSON VIA NODE.JS */}
				<button onClick={saveJsonToLocal} disabled={isSavingLocal} className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs tracking-wide uppercase bg-lime-400 hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed text-black shadow-lg shadow-lime-400/10 transition-all duration-150 active:scale-95 border border-lime-500" title="Salvar arquivo JSON via servidor Node local">
					{isSavingLocal ? (
						<svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
					) : (
						<SaveIcon sx={{ fontSize: 18 }} />
					)}
					{isSavingLocal ? "Salvando..." : "Salvar JSON Local"}
				</button>
			</div>

			{/* ABA 1: KANBAN */}
			{activeTab === "kanban" && (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
					{[
						{ title: "Categoria", type: "category", path: "tire-selection/categories", data: orderedCategoryKeys, selected: selectedCategoryKey },
						{ title: "Largura", type: "width", path: `tire-selection/categories/${selectedCategoryKey}/widths`, data: orderedWidthKeys, selected: selectedWidthKey, disabled: !selectedCategoryKey, emptyMsg: "Selecione uma categoria" },
						{ title: "Perfil", type: "profile", path: `tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}`, data: orderedProfileKeys, selected: selectedProfileKey, disabled: !selectedWidthKey, emptyMsg: "Selecione uma largura", isProfile: true },
						{ title: "Aro", type: "rim", path: `tire-selection/categories/${selectedCategoryKey}/widths/${selectedWidthKey}/${selectedProfileKey}`, data: rawRimKeys, disabled: !selectedProfileKey, emptyMsg: "Selecione um perfil", isRim: true },
					].map((col) => (
						<div key={col.type} className={`bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden flex flex-col transition-all duration-200 ${col.disabled ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
							<div className="p-4 bg-zinc-800 text-white flex justify-between items-center border-b border-zinc-700/80">
								<span className="font-bold text-xs uppercase tracking-wider text-lime-400">{col.title}</span>
								<button onClick={() => !col.disabled && openModal(col.type, "add", col.path)} disabled={col.disabled} className="bg-zinc-700 hover:bg-zinc-600 active:scale-95 disabled:opacity-40 text-slate-100 w-7 h-7 rounded-lg transition-all shadow-sm inline-flex items-center justify-center shrink-0 border border-zinc-600" title={`Adicionar ${col.title} (Atalho: ENTER)`}>
									<AddIcon sx={{ fontSize: 16 }} />
								</button>
							</div>
							<div className="divide-y divide-zinc-800/50 max-h-[550px] overflow-y-auto p-1.5 bg-zinc-950 custom-scrollbar">
								{col.disabled ? (
									<div className="p-6 text-center flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/50 rounded-xl m-2 opacity-70 min-h-[100px]">
										<span className="text-zinc-500 text-xs font-semibold">{col.emptyMsg}</span>
									</div>
								) : col.data.length === 0 && !col.isProfile ? (
									<div className="p-6 text-center flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/50 rounded-xl m-2 opacity-70 min-h-[100px]">
										<span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Nenhum item</span>
									</div>
								) : (
									<>
										{/* Item Especial 'Sem Perfil' */}
										{col.isProfile && (
											<div
												onClick={() => {
													if (!Object.keys(currentProfiles).includes("-")) {
														handleAddNoProfile();
													} else {
														setSelectedProfileKey("-");
													}
												}}
												className={`p-3.5 my-1 rounded-xl flex justify-between items-center cursor-pointer transition-all border ${selectedProfileKey === "-" ? "bg-lime-400 text-black font-bold border-lime-500 shadow-md shadow-lime-400/10" : "bg-zinc-900 border-zinc-800/80 hover:bg-zinc-800/80 hover:border-zinc-700 text-slate-300 font-medium border-dashed"}`}
											>
												<span className="text-sm">- (Sem perfil)</span>
											</div>
										)}

										{/* Lista Principal de Itens */}
										{col.data.map((key, index) => {
											const itemData = col.type === "category" ? categories[key] : null;
											const label = col.type === "category" ? itemData?.label : col.isRim ? decodeKey(key) : decodeKey(key);
											const isSelected = col.selected === key;
											const uniqueKey = col.isRim ? `${key}-${index}` : key;

											const handleColClick = () => {
												if (col.type === "category") {
													setSelectedCategoryKey(key);
													setSelectedWidthKey(null);
													setSelectedProfileKey(null);
												} else if (col.type === "width") {
													setSelectedWidthKey(key);
													setSelectedProfileKey(null);
												} else if (col.type === "profile") {
													setSelectedProfileKey(key);
												}
											};

											const handleEditClick = (e) => {
												e.stopPropagation();
												if (col.isRim) {
													openModal("rim", "edit", col.path, key, index);
												} else {
													openModal(col.type, "edit", col.path, key, null, "", "", itemData?.url);
												}
											};

											const handleDeleteClick = (e) => {
												e.stopPropagation();
												if (col.isRim) {
													handleDelete(col.path, index, "rim");
												} else {
													handleDelete(col.path, key, col.type);
												}
											};

											return (
												<div key={uniqueKey} onClick={col.isRim ? undefined : handleColClick} className={`p-3.5 my-1 rounded-xl flex justify-between items-center transition-all border ${col.isRim ? "bg-zinc-900 border-zinc-800/80 text-slate-300 cursor-default" : isSelected ? "bg-lime-400 text-black font-bold border-lime-500 shadow-md shadow-lime-400/10" : "bg-zinc-900 border-zinc-800/80 hover:bg-zinc-800/80 hover:border-zinc-700 text-slate-300 font-medium cursor-pointer"}`}>
													<span className={`truncate text-sm ${col.isRim ? "font-semibold" : ""}`}>{label}</span>
													<div className="flex gap-1 items-center shrink-0 ml-3">
														<button title="Editar" onClick={handleEditClick} className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors ${isSelected ? "bg-black/10 hover:bg-black/20 text-black" : "bg-zinc-800 hover:bg-zinc-700 text-slate-400 hover:text-slate-100 border border-zinc-700/80"}`}>
															<EditIcon sx={{ fontSize: 16 }} />
														</button>
														<button title="Excluir" onClick={handleDeleteClick} className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors ${isSelected ? "bg-black/20 hover:bg-black text-black hover:text-lime-400 border border-transparent" : "bg-black hover:bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800/80"}`}>
															<DeleteIcon sx={{ fontSize: 16 }} />
														</button>
													</div>
												</div>
											);
										})}
									</>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* ABA 2: GERENCIADOR DE MAPS */}
			{activeTab === "maps" && (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
					{/* MAPS: CATEGORY */}
					<div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden flex flex-col">
						<div className="p-4 bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider flex justify-between items-center border-b border-zinc-700/80">
							<span className="text-lime-400">Maps: Categoria</span>
							<span className="text-[10px] bg-zinc-700 text-slate-200 px-2.5 py-1 rounded-md font-medium border border-zinc-600">
								{Object.keys(categories).length} {Object.keys(categories).length === 1 ? "item" : "itens"}
							</span>
						</div>
						<div className="divide-y divide-zinc-800/50 max-h-[550px] overflow-y-auto p-1.5 bg-zinc-950 custom-scrollbar">
							{Object.keys(categories).length === 0 ? (
								<div className="p-6 text-center flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/50 rounded-xl m-2 opacity-70 min-h-[100px]">
									<span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Nenhuma categoria</span>
								</div>
							) : (
								Object.entries(categories).map(([catUid, catData]) => {
									const hasUrl = Boolean(catData?.url);

									return (
										<div key={catUid} className="p-3.5 my-1 rounded-xl flex justify-between items-center bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700 transition-all group">
											<div className="flex items-center gap-3">
												<div className="flex flex-col gap-0.5">
													<span className="text-base font-bold text-slate-50">{catData?.label || catUid}</span>
													<div className="flex items-center gap-1.5 mt-0.5">
														{/* PILL VERDE PARA PREENCHIDO, VERMELHO PARA VAZIO */}
														<span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${hasUrl ? "bg-lime-950/80 text-lime-400 border-lime-500/40 font-semibold" : "bg-red-950/80 text-red-400 border-red-500/40 font-semibold"}`}>URL: {catData?.url || "vazio"}</span>
													</div>
												</div>
											</div>
											<div className="flex gap-1 items-center shrink-0 ml-3">
												<button title="Editar" onClick={() => openModal("category", "edit", `tire-selection/categories/${catUid}`, catData?.label, null, "", catUid, catData?.url)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-slate-400 hover:text-slate-100 border border-zinc-700/80 transition-colors">
													<EditIcon sx={{ fontSize: 16 }} />
												</button>
												<button title="Excluir" onClick={() => handleDelete("tire-selection/categories", catUid, "category")} className="w-8 h-8 rounded-lg inline-flex items-center justify-center bg-black hover:bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800/80 transition-colors">
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
							<div key={mapType} className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden flex flex-col">
								<div className="p-4 bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider flex justify-between items-center border-b border-zinc-700/80">
									<span className="text-lime-400">Maps: {mapType}</span>
									<span className="text-[10px] bg-zinc-700 text-slate-200 px-2.5 py-1 rounded-md font-medium border border-zinc-600">
										{sortedMapEntries.length} {sortedMapEntries.length === 1 ? "item" : "itens"}
									</span>
								</div>
								<div className="divide-y divide-zinc-800/50 max-h-[550px] overflow-y-auto p-1.5 bg-zinc-950 custom-scrollbar">
									{sortedMapEntries.length === 0 ? (
										<div className="p-6 text-center flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/50 rounded-xl m-2 opacity-70 min-h-[100px]">
											<span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Nenhum mapeamento</span>
										</div>
									) : (
										sortedMapEntries.map(([uid, item], index) => {
											const usageCats = getUsageCategories(item?.label, mapType);
											const hasCatId = Boolean(item?.catID);

											return (
												<div key={uid} draggable onDragStart={() => setDraggedItem({ index, type: mapType, list: keysList })} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropMaps(e, index, mapType, keysList)} className="p-3.5 my-1 rounded-xl flex justify-between items-center bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-grab active:cursor-grabbing group">
													<div className="flex items-center gap-3">
														<DragHandleIcon sx={{ fontSize: 16 }} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
														<div className="flex flex-col gap-0.5">
															<span className="text-base font-bold text-slate-50">{item?.label}</span>
															<span className="text-slate-500 text-[11px] font-medium">
																<strong className="text-slate-400">Categorias:</strong> {usageCats}
															</span>
															<div className="flex items-center gap-1.5 mt-0.5">
																{/* PILL VERDE PARA PREENCHIDO, VERMELHO PARA VAZIO */}
																<span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${hasCatId ? "bg-lime-950/80 text-lime-400 border-lime-500/40 font-semibold" : "bg-red-950/80 text-red-400 border-red-500/40 font-semibold"}`}>catID: {item?.catID || "vazio"}</span>
															</div>
														</div>
													</div>
													<div className="flex gap-1 items-center shrink-0 ml-3">
														<button title="Editar" onClick={() => openEditMapModal(mapType, uid, item)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-slate-400 hover:text-slate-100 border border-zinc-700/80 transition-colors">
															<EditIcon sx={{ fontSize: 16 }} />
														</button>
														<button title="Excluir" onClick={() => handleDelete(`tire-selection/maps/${mapType}/${uid}`, null, "mapItem")} className="w-8 h-8 rounded-lg inline-flex items-center justify-center bg-black hover:bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800/80 transition-colors">
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
				<div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
					<div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-zinc-800 transition-all scale-100">
						<h3 className="text-base font-bold mb-5 text-slate-50 capitalize flex items-center gap-2">
							<span className="w-1.5 h-6 bg-lime-400 rounded-full"></span>
							{modalConfig.mode === "add" ? "Adicionar" : "Editar"} {modalConfig.type === "mapItem" ? `Map (${modalConfig.mapType})` : modalConfig.type}
						</h3>
						<form onSubmit={handleSave}>
							<div className="flex flex-col gap-5 mb-7">
								{[
									{ label: "Nome/Valor:", value: inputValue, setter: setInputValue, placeholder: "Ex: Máquinas Agrícolas, 7.50, 185...", autoFocus: true },
									{ label: "URL do Site:", value: mapUrlInput, setter: setMapUrlInput, placeholder: "Ex: /maquinas-agricolas", show: modalConfig.type === "category" },
									{ label: "catID (ID do Site):", value: mapCatIdSelect, setter: setMapCatIdSelect, placeholder: "Ex: 3152185", show: modalConfig.type === "mapItem" },
								].map(
									(field, idx) =>
										field.show !== false && (
											<div key={idx}>
												<label className="text-xs font-semibold text-slate-400 mb-1.5 block">{field.label}</label>
												<input type="text" value={field.value} onChange={(e) => field.setter(e.target.value)} placeholder={field.placeholder} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium text-slate-100 text-sm transition-all placeholder:text-zinc-600" autoFocus={field.autoFocus} />
											</div>
										),
								)}
							</div>

							<div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
								<button type="button" onClick={closeModal} className="px-5 py-2.5 bg-zinc-800 text-slate-300 rounded-xl hover:bg-zinc-700 font-semibold text-xs tracking-wide transition-all border border-zinc-700">
									Cancelar
								</button>
								<button type="submit" className="px-5 py-2.5 bg-lime-400 text-black rounded-xl hover:bg-lime-500 active:scale-95 font-bold text-xs tracking-wide transition-all shadow-lg border border-lime-500">
									Salvar
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ESTILOS CSS PERSONALIZADOS PARA A SCROLLBAR */}
			<style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #09090b;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #a3e635; /* bg-lime-400 */
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #84cc16; /* bg-lime-500 */
        }
      `}</style>
		</div>
	);
}
