import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.post("/api/save-json", (req, res) => {
  const data = req.body;

  // Caminho apontando diretamente para src/components/LojaVirtual
  const filePath = path.join(__dirname, "src", "components", "LojaVirtual", "tire-selection.json");

  fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8", (err) => {
    if (err) {
      console.error("Erro ao salvar o arquivo JSON:", err);
      return res.status(500).json({ success: false, message: "Erro ao salvar arquivo." });
    }

    console.log("tire-selection.json atualizado em src/components/LojaVirtual!");
    return res.status(200).json({ success: true, message: "Arquivo salvo com sucesso!" });
  });
});

app.listen(3001, () => {
  console.log("Servidor Node rodando na porta 3001");
});