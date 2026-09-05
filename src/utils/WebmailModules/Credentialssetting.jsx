import React, { useState, useEffect } from "react";
import {
  FaServer,
  FaPaperPlane,
  FaEye,
  FaEyeSlash,
  FaCheck,
  FaKey,
} from "react-icons/fa6";
import { supabase } from "@/lib/supabase";

function CredentialsSettingContent() {
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUser, setImapUser] = useState("");
  const [imapPass, setImapPass] = useState("");

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");

  const [showImapPass, setShowImapPass] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchEmailSettings();
  }, []);

  const fetchEmailSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value");
      if (error) throw error;

      if (data) {
        data.forEach((item) => {
          switch (item.key) {
            case "IMAP_HOST":
              setImapHost(item.value);
              break;
            case "IMAP_PORT":
              setImapPort(item.value);
              break;
            case "IMAP_USER":
              setImapUser(item.value);
              break;
            case "IMAP_PASS":
              setImapPass(item.value);
              break;
            case "SMTP_HOST":
              setSmtpHost(item.value);
              break;
            case "SMTP_PORT":
              setSmtpPort(item.value);
              break;
            case "SMTP_USER":
              setSmtpUser(item.value);
              break;
            case "SMTP_PASS":
              setSmtpPass(item.value);
              break;
            default:
              break;
          }
        });
      }
    } catch (err) {
      console.error("Erro ao buscar configurações de email:", err);
    }
  };

  const handleSaveEmailSettings = async () => {
    setIsSaving(true);

    try {
      // 1. Faz o teste de conexão primeiro
      const testRes = await fetch("/api/test-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imapHost,
          imapPort,
          imapUser,
          imapPass,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
        }),
      });

      const testData = await testRes.json();

      if (!testData.success) {
        alert(
          "Falha ao conectar no servidor. Verifique os dados inseridos.\n\nDetalhe do erro: " +
            testData.error,
        );
        setIsSaving(false);
        return; // Impede que salve no banco de dados
      }

      // 2. Se o teste passou, salva no banco de dados (Supabase)
      const settings = [
        { key: "IMAP_HOST", value: imapHost },
        { key: "IMAP_PORT", value: imapPort },
        { key: "IMAP_USER", value: imapUser },
        { key: "IMAP_PASS", value: imapPass },
        { key: "SMTP_HOST", value: smtpHost },
        { key: "SMTP_PORT", value: smtpPort },
        { key: "SMTP_USER", value: smtpUser },
        { key: "SMTP_PASS", value: smtpPass },
      ];

      const { error } = await supabase
        .from("app_settings")
        .upsert(settings, { onConflict: "key" });
      if (error) throw error;

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Erro geral ao processar credenciais:", err);
      alert("Erro inesperado ao salvar credenciais.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center pb-6 border-b border-[#1f1f1f] mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Servidor IMAP/SMTP</h1>
          <p className="text-xs text-gray-400 mt-1">
            Configure os dados de acesso do seu provedor de e-mail.
          </p>
        </div>
        {savedSuccess && (
          <span className="flex items-center text-xs font-bold text-[#afdb21] bg-[#1a2b00] border border-[#3e5c14] px-4 py-2 rounded-lg">
            <FaCheck className="mr-2" /> Salvo com sucesso!
          </span>
        )}
      </div>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <FaServer className="text-[#afdb21] text-sm" /> Configurações IMAP
            (Recebimento)
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Credenciais para leitura e sincronização da caixa de entrada.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Host IMAP
              </label>
              <input
                type="text"
                value={imapHost}
                onChange={(e) => setImapHost(e.target.value)}
                placeholder="mail.seudominio.com.br"
                className="w-full bg-[#0a0a0a] border border-[#222] text-sm text-white px-4 py-2.5 rounded-lg outline-none focus:border-[#afdb21]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Porta IMAP
              </label>
              <input
                type="text"
                value={imapPort}
                onChange={(e) => setImapPort(e.target.value)}
                placeholder="993"
                className="w-full bg-[#0a0a0a] border border-[#222] text-sm text-white px-4 py-2.5 rounded-lg outline-none focus:border-[#afdb21]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Usuário (E-mail)
              </label>
              <input
                type="text"
                value={imapUser}
                onChange={(e) => setImapUser(e.target.value)}
                placeholder="contato@seudominio.com.br"
                className="w-full bg-[#0a0a0a] border border-[#222] text-sm text-white px-4 py-2.5 rounded-lg outline-none focus:border-[#afdb21]"
              />
            </div>
            <div className="col-span-2 relative">
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Senha IMAP
              </label>
              <input
                type={showImapPass ? "text" : "password"}
                value={imapPass}
                onChange={(e) => setImapPass(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0a0a0a] border border-[#222] text-sm text-white pl-4 pr-10 py-2.5 rounded-lg outline-none focus:border-[#afdb21]"
              />
              <button
                type="button"
                onClick={() => setShowImapPass(!showImapPass)}
                className="absolute right-3 top-7 text-gray-500 hover:text-gray-300"
              >
                {showImapPass ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-[#1f1f1f]"></div>

        <div>
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <FaPaperPlane className="text-[#afdb21] text-sm" /> Configurações
            SMTP (Envio)
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Credenciais para envio de mensagens e respostas.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Host SMTP
              </label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="mail.seudominio.com.br"
                className="w-full bg-[#0a0a0a] border border-[#222] text-sm text-white px-4 py-2.5 rounded-lg outline-none focus:border-[#afdb21]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Porta SMTP
              </label>
              <input
                type="text"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="465"
                className="w-full bg-[#0a0a0a] border border-[#222] text-sm text-white px-4 py-2.5 rounded-lg outline-none focus:border-[#afdb21]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Usuário (E-mail)
              </label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="contato@seudominio.com.br"
                className="w-full bg-[#0a0a0a] border border-[#222] text-sm text-white px-4 py-2.5 rounded-lg outline-none focus:border-[#afdb21]"
              />
            </div>
            <div className="col-span-2 relative">
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Senha SMTP
              </label>
              <input
                type={showSmtpPass ? "text" : "password"}
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0a0a0a] border border-[#222] text-sm text-white pl-4 pr-10 py-2.5 rounded-lg outline-none focus:border-[#afdb21]"
              />
              <button
                type="button"
                onClick={() => setShowSmtpPass(!showSmtpPass)}
                className="absolute right-3 top-7 text-gray-500 hover:text-gray-300"
              >
                {showSmtpPass ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6 pt-6 border-t border-[#1f1f1f]">
        <p className="text-[10px] text-gray-500 max-w-50">
          <FaKey className="inline mr-1" /> Os dados são salvos diretamente no
          banco de dados, protegidos por RLS.
        </p>
        <button
          onClick={handleSaveEmailSettings}
          disabled={isSaving}
          className="px-6 py-2.5 text-sm font-bold text-black bg-[#afdb21] hover:bg-[#a8e000] rounded-xl transition cursor-pointer shadow-lg shadow-[#afdb21]/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Testando e Salvando..." : "Salvar Credenciais"}
        </button>
      </div>
    </>
  );
}

export default {
  id: "credentials",
  label: "Servidor IMAP/SMTP",
  icon: FaServer,
  component: CredentialsSettingContent,
};
