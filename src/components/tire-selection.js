/* =========================
    MAPAS
========================= */
const widthMap = {
	15: "311173",
	16: "317456",
	30: "293226",
	18: "312162",
	31: "293057",
	21: "317457",
	20: "319901",
	33: "293274",
	24: "317458",
	35: "293275",
	37: "293276",
	165: "291946",
	175: "292009",
	185: "292017",
	195: "291646",
	205: "292258",
	215: "292932",
	225: "292931",
	235: "292259",
	245: "292900",
	255: "292650",
	265: "292648",
	275: "292646",
	295: "292647",
	315: "292645",
	6.00: "294075",
	6.50: "294077",
	7.50: "294071",
	9.00: "294078",
	10: "320113",
	17.5: "294092",
};

const profileMap = {
	6.00: "311174",
	9.5: "293227",
	6.50: "317459",
	10.5: "293058",
	7: "317461",
	12.5: "293277",
	8: "317460",
	35: "292896",
	8.5: "317467",
	40: "291648",
	45: "292654",
	10: "319896",
	50: "292653",
	55: "292268",
	60: "292269",
	30: "320129",
	65: "292897",
	70: "291947",
	75: "292260",
	80: "307678",
};

const rimMap = {
	6: "311172",
	8: "312163",
	13: "291948",
	9: "319120",
	14: "292264",
	10: "317462",
	15: "292261",
	12: "317463",
	11: "319895",
	16: "292266",
	17: "291647",
	17.5: "307636",
	18: "292263",
	19: "292265",
	20: "292267",
	16.5: "320114",
	22.5: "283875",
	25: "293876",
};

const categorySlugMap = {
	Passeio: "passeio",
	"Van ou Veículo Comercial": "van-ou-veiculo-comercial",
	"Maquinas Agricolas": "maquinas-agricolas",
	"Pickup e SUV": "pickup-e-suv",
	"Caminhão e Ônibus": "caminhao-e-onibus",
	Industrial: "industrial",
	OTR: "otr",
};

/* =========================
   DADOS (CORRIGIDOS + EXPANDIDOS)
========================= */
const tyreDataCompressed = {
	Passeio: {
		165: { 
			40: [17],
			70: [13],
		},

		175: {
			65: [14,15],
			70: [13,14],
			75: [14],
			80: [14],
		},

		185: {
			55: [16],
			60: [14,15],
			65: [14,15],
			70: [13,14],
		},

		195: {
			40: [17],
			45: [17],
			50: [15,16],
			55: [15,16],
			60: [15,16],
			65: [15],
		},

		205: {
			40: [17],
			45: [17],
			50: [17],
			55: [15,16,17],
			60: [15,16],
			65: [15,16],
		},

		215: {
			45: [17,18],
			50: [17],
			55: [17],
			60: [18],
			65: [16,17],
		},

		225: {
			30: [20],
			40: [18],
			45: [17,18],
			50: [17,18],
			60: [18],
			65: [16],
			75: [16],
		},

		235: {
			50: [18],
			55: [17,18,19],
			65: [17],
		},

		245: {
			40: [18],
			45: [17,18,20],
			50: [18],
		},

		255: {
			50: [19,20],
			55: [19],
		},

		265: {
			50: [20],
			70: [16],
		},

		275: {
			40: [19,20],
			45: [20],
		},

		315: {
			35: [20],
		},
	},


	"Van ou Veículo Comercial": {

		175: {
			70: [14],
		},

		185:{
			"-":[14],
		},

		195:{
			"-":[14],
			70:[15],
			75:[16],
		},

		205:{
			70:[15],
			75:[16],
		},

		215:{
			65:[16],
			75:[16,17.5],
		},

		225:{
			65:[16],
			70:[15],
			75:[16],
		},

		235:{
			65:[16],
		},
	},


	"Pickup e SUV": {

		30:{
			9.5:[15],
		},

		31:{
			10.5:[15],
		},

		33:{
			12.5:[15],
		},

		35:{
			12.5:[15],
		},

		37:{
			12.5:[17],
		},

		175:{
			70:[14],
		},

		205:{
			60:[15,16],
			65:[15],
			70:[15],
		},

		215:{
			50:[17],
			60:[17],
			65:[16],
			70:[16],
		},

		225:{
			55:[18],
			60:[17,18],
			65:[17],
			70:[16,17],
			75:[16],
		},

		235:{
			55:[17,18],
			60:[16],
			70:[16],
			75:[15],
		},

		245:{
			70:[16],
			75:[16],
		},

		255:{
			55:[18],
			60:[18],
			70:[16],
		},

		265:{
			60:[18],
			65:[17],
			70:[16,17,18],
		},
	},


	"Caminhão e Ônibus": {

		7.50:{
			"-":[16],
		},

		9.00:{
			"-":[20],
		},

		215:{
			75:[17.5],
		},

		295:{
			80:[22.5],
		},
	},


	OTR: {

		15:{
			6.00:[6],
		},

		16:{
			6.50:[8],
		},

		17.5:{
			"-":[25],
		},

		18:{
			8.50:[8],
			9.50:[8],
		},

		20:{
			10:[8],
		},

		21:{
			7:[10],
		},

		24:{
			8:[12],
			10:[11],
		},

		18.5:{
			9.50:[8],
		},
	},


	Industrial: {

		10:{
			"-":[16.5],
		},

		6.00:{
			9:[12],
		},

		6.50:{
			10:[12],
		},
	}
};

/* =========================
    UTILS
========================= */
function resetSelect(...selects) {
	selects.forEach((s) => {
		s.innerHTML = "<option>-</option>";
		s.disabled = true;
	});
}

function populateOptions(select, list) {
	if (!list || !list.length) return;
	select.disabled = false;
	[...new Set(list)].forEach((item) => {
		const opt = document.createElement("option");
		opt.value = item;
		opt.textContent = item;
		select.appendChild(opt);
	});
}

function normalizeTyreData(raw) {
	const result = { alwaysRims: [], profileMap: {} };

	if (Array.isArray(raw)) {
		result.alwaysRims = raw;
	} else if (typeof raw === "object") {
		Object.entries(raw).forEach(([k, v]) => {
			if (k === "-" || k === "0") result.alwaysRims = v;
			else result.profileMap[k] = v;
		});
	}

	return result;
}

/* =========================
    BUSCA POR CATEGORIA
========================= */
const categoriesDiv = document.getElementById("categories");
const widthCat = document.getElementById("widthCat");
const profileCat = document.getElementById("profileCat");
const rimCat = document.getElementById("rimCat");
const searchBtnCat = document.getElementById("searchBtnCat");
let selectedCategory = null;

Object.keys(tyreDataCompressed).forEach((cat) => {
	const btn = document.createElement("div");
	btn.className = "button-select-tyre";
	btn.textContent = cat;
	btn.onclick = () => {
		document.querySelectorAll(".button-select-tyre").forEach((b) => b.classList.remove("active"));
		btn.classList.add("active");
		selectedCategory = cat;
		resetSelect(widthCat, profileCat, rimCat);
		populateOptions(widthCat, Object.keys(tyreDataCompressed[cat]));
	};
	categoriesDiv.appendChild(btn);
});

widthCat.addEventListener("change", () => {
	const raw = tyreDataCompressed[selectedCategory]?.[widthCat.value];
	resetSelect(profileCat, rimCat);
	if (!raw) return;

	const { alwaysRims, profileMap } = normalizeTyreData(raw);

	if (Object.keys(profileMap).length) populateOptions(profileCat, Object.keys(profileMap));
	if (alwaysRims.length) populateOptions(rimCat, alwaysRims);

	checkFormCat();
});

profileCat.addEventListener("change", () => {
	const raw = tyreDataCompressed[selectedCategory]?.[widthCat.value];
	resetSelect(rimCat);
	if (!raw) return;

	const { alwaysRims, profileMap } = normalizeTyreData(raw);

	if (profileMap[profileCat.value]) populateOptions(rimCat, profileMap[profileCat.value]);
	if (alwaysRims.length) populateOptions(rimCat, alwaysRims);

	checkFormCat();
});

rimCat.addEventListener("change", checkFormCat);

function checkFormCat() {
	searchBtnCat.disabled = !selectedCategory || widthCat.value === "-" || rimCat.value === "-";
}

searchBtnCat.addEventListener("click", () => {
	const widthId = widthMap[widthCat.value];
	const rimId = rimMap[rimCat.value];
	const profileId = profileMap[profileCat.value];

	let features = `${widthId}%2C${rimId}`;
	if (profileId) features += `%2C${profileId}`;

	window.location.href = `https://www.pneuscuritiba.com.br/${categorySlugMap[selectedCategory]}?feature=${features}`;
});

/* =========================
    BUSCA SIMPLES
========================= */
const widthSimple = document.getElementById("widthSimple");
const profileSimple = document.getElementById("profileSimple");
const rimSimple = document.getElementById("rimSimple");
const searchBtnSimple = document.getElementById("searchBtnSimple");

const combinedData = {};

Object.values(tyreDataCompressed).forEach((catData) => {
	Object.entries(catData).forEach(([w, v]) => {
		const { alwaysRims, profileMap } = normalizeTyreData(v);

		combinedData[w] = combinedData[w] || { alwaysRims: [], profileMap: {} };

		combinedData[w].alwaysRims.push(...alwaysRims);

		Object.entries(profileMap).forEach(([p, rims]) => {
			combinedData[w].profileMap[p] = [...(combinedData[w].profileMap[p] || []), ...rims];
		});
	});
});

populateOptions(widthSimple, Object.keys(combinedData));

widthSimple.addEventListener("change", () => {
	const data = combinedData[widthSimple.value];
	resetSelect(profileSimple, rimSimple);
	if (!data) return;

	if (Object.keys(data.profileMap).length) populateOptions(profileSimple, Object.keys(data.profileMap));

	if (data.alwaysRims.length) populateOptions(rimSimple, data.alwaysRims);
});

profileSimple.addEventListener("change", () => {
	const data = combinedData[widthSimple.value]?.profileMap?.[profileSimple.value];
	resetSelect(rimSimple);
	if (data) populateOptions(rimSimple, data);

	if (combinedData[widthSimple.value]?.alwaysRims?.length) populateOptions(rimSimple, combinedData[widthSimple.value].alwaysRims);

	checkFormSimple();
});

rimSimple.addEventListener("change", checkFormSimple);

function checkFormSimple() {
	searchBtnSimple.disabled = widthSimple.value === "-" || rimSimple.value === "-";
}

searchBtnSimple.addEventListener("click", () => {
	const widthId = widthMap[widthSimple.value];
	const rimId = rimMap[rimSimple.value];
	const profileId = profileMap[profileSimple.value];

	let features = `${widthId}%2C${rimId}`;
	if (profileId) features += `%2C${profileId}`;

	window.location.href = `https://www.pneuscuritiba.com.br/pneus?feature=${features}`;
});