import React, { useState, useEffect } from "react";
import {
  FaSignature,
  FaCheck,
  FaArrowLeft,
  FaKey,
  FaServer,
  FaEye,
  FaEyeSlash,
  FaPaperPlane,
} from "react-icons/fa6";
import { supabase } from "@/lib/supabase";

export default function Settings({ onBack }) {
  const [activeTab, setActiveTab] = useState("signature");
  const [signature, setSignature] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Estados para IMAP/SMTP
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

  useEffect(() => {
    const savedSignature = localStorage.getItem("webmail_signature") || "";
    setSignature(savedSignature);
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

  const handleSaveSignature = () => {
    localStorage.setItem("webmail_signature", signature);
    triggerSuccess();
  };

  const handleSaveEmailSettings = async () => {
    setIsSaving(true);
    try {
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
      triggerSuccess();
    } catch (err) {
      console.error("Erro ao salvar credenciais:", err);
      alert("Erro ao salvar credenciais.");
    } finally {
      setIsSaving(false);
    }
  };

  const triggerSuccess = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] text-gray-300 font-sans p-8">
      <div className="max-w-4xl w-full mx-auto bg-[#141414] border border-[#1f1f1f] rounded-2xl p-8 flex flex-col shadow-2xl">
        {/* Topbar */}
        <div className="flex items-center justify-between pb-6 border-b border-[#1f1f1f] mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2.5 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-gray-300 rounded-xl transition cursor-pointer"
              title="Voltar ao Webmail"
            >
              <FaArrowLeft />
            </button>
            <h1 className="text-2xl font-bold text-white tracking-wide">
              Configurações do Webmail
            </h1>
          </div>
          {savedSuccess && (
            <span className="flex items-center text-xs font-bold text-[#afdb21] bg-[#1a2b00] border border-[#3e5c14] px-4 py-2 rounded-lg">
              <FaCheck className="mr-2" /> Salvo com sucesso!
            </span>
          )}
        </div>

        {/* Layout */}
        <div className="flex flex-1 gap-8">
          {/* Menu Lateral */}
          <div className="w-56 border-r border-[#1f1f1f] pr-6 flex flex-col space-y-2">
            <button
              onClick={() => setActiveTab("signature")}
              className={`flex items-center space-x-3 px-4 py-3 font-semibold text-sm rounded-xl transition-all ${
                activeTab === "signature"
                  ? "bg-[#1e1e1e] text-[#afdb21] border-l-4 border-[#afdb21]"
                  : "text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200 border-l-4 border-transparent"
              }`}
            >
              <FaSignature />
              <span>Assinatura</span>
            </button>

            <button
              onClick={() => setActiveTab("credentials")}
              className={`flex items-center space-x-3 px-4 py-3 font-semibold text-sm rounded-xl transition-all ${
                activeTab === "credentials"
                  ? "bg-[#1e1e1e] text-[#afdb21] border-l-4 border-[#afdb21]"
                  : "text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200 border-l-4 border-transparent"
              }`}
            >
              <FaServer />
              <span>Servidor IMAP/SMTP</span>
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar pr-2">
            {activeTab === "signature" && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-white mb-2">
                    Assinatura de E-mail
                  </h2>
                  <p className="text-xs text-gray-400 mb-6">
                    Esta assinatura será inserida automaticamente ao final de
                    todos os e-mails que você responder ou enviar.
                  </p>

                  <textarea
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder={`Atenciosamente,\nSeu Nome\nSua Empresa | (41) 99999-9999`}
                    className="w-full h-48 bg-[#0a0a0a] border border-[#222] text-sm text-gray-200 p-4 rounded-xl outline-none focus:border-[#afdb21] resize-none transition-all"
                  />
                </div>

                <div className="flex justify-end pt-6 border-t border-[#1f1f1f]">
                  <button
                    onClick={handleSaveSignature}
                    className="px-6 py-2.5 text-sm font-bold text-black bg-[#afdb21] hover:bg-[#a8e000] rounded-xl transition cursor-pointer shadow-lg shadow-[#afdb21]/10"
                  >
                    Salvar Assinatura
                  </button>
                </div>
              </>
            )}

            {activeTab === "credentials" && (
              <>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                      <FaServer className="text-[#afdb21] text-sm" />{" "}
                      Configurações IMAP (Recebimento)
                    </h2>
                    <p className="text-xs text-gray-400 mb-4">
                      Credenciais para leitura e sincronização da caixa de
                      entrada.
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
                      <FaPaperPlane className="text-[#afdb21] text-sm" />{" "}
                      Configurações SMTP (Envio)
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
                    <FaKey className="inline mr-1" /> Os dados são salvos
                    diretamente no banco de dados, protegidos por RLS.
                  </p>
                  <button
                    onClick={handleSaveEmailSettings}
                    disabled={isSaving}
                    className="px-6 py-2.5 text-sm font-bold text-black bg-[#afdb21] hover:bg-[#a8e000] rounded-xl transition cursor-pointer shadow-lg shadow-[#afdb21]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Salvando..." : "Salvar Credenciais"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
