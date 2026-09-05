import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import { SiShopee } from "react-icons/si";
import {
  FaInbox,
  FaPaperPlane,
  FaTrash,
  FaReply,
  FaShare,
  FaMagnifyingGlass,
  FaRotateRight,
  FaHandshake,
  FaStar,
  FaRegStar,
  FaGear,
  FaSignature,
  FaCheck,
  FaTriangleExclamation,
  FaBagShopping,
  FaBroom,
  FaPlus,
  FaServer,
  FaEye,
  FaEyeSlash,
  FaKey,
} from "react-icons/fa6";

const formatEmailDate = (dateString) => {
  if (!dateString) return { time: "", dateStr: "" };
  const date = new Date(dateString);
  const now = new Date();
  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  let dateStr = "";
  if (date >= startOfWeek) {
    const diffDays = Math.floor(
      (new Date(now).setHours(0, 0, 0, 0) -
        new Date(date).setHours(0, 0, 0, 0)) /
        (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) dateStr = "Hoje";
    else if (diffDays === 1) dateStr = "Ontem";
    else {
      const days = [
        "Domingo",
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
      ];
      dateStr = days[date.getDay()];
    }
  } else {
    dateStr = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return { time, dateStr };
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const isShopeeCategory = (e) => {
  const sender = (e.sender_email || "").toLowerCase();
  const subject = (e.subject || "").toLowerCase();
  return sender.includes("shopee") && subject.includes("hora de enviar");
};

const isMLCategory = (e) => {
  const sender = (e.sender_email || "").toLowerCase();
  const subject = (e.subject || "").toLowerCase();
  return (
    (sender.includes("mercadolivre") || sender.includes("mercadopago")) &&
    (subject.includes("você vendeu") || subject.includes("voce vendeu"))
  );
};

const isEcommerceCategory = (e) => {
  const sender = (e.sender_email || "").toLowerCase();
  const subject = (e.subject || "").toLowerCase();
  return (
    sender.includes("bagy") ||
    (subject.includes("pedido #") && subject.includes("aprovado"))
  );
};

export default function Webmail() {
  const [currentRoute, setCurrentRoute] = useState(() => {
    if (typeof window !== "undefined") {
      return window.location.pathname.includes("/configuracoes")
        ? "settings"
        : "emails";
    }
    return "emails";
  });

  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("inbox");

  const [selectedSetting, setSelectedSetting] = useState("signature");
  const [signatureText, setSignatureText] = useState("");
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

  const [confirmDeleteModal, setConfirmDeleteModal] = useState({
    open: false,
    emailId: null,
    messageId: null,
  });
  const [confirmEmptyTrashModal, setConfirmEmptyTrashModal] = useState(false);

  // Estados do Editor de Mensagens
  const [composeMode, setComposeMode] = useState(null); // 'new' | 'reply' | 'forward' | null
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeText, setComposeText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const navigateTo = (path, routeType) => {
    if (typeof window !== "undefined") {
      if (window.location.pathname !== path) {
        window.history.pushState({}, "", path);
      }
      setCurrentRoute(routeType);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.includes("/configuracoes")) {
        setCurrentRoute("settings");
      } else {
        setCurrentRoute("emails");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const savedSignature = localStorage.getItem("webmail_signature") || "";
    setSignatureText(savedSignature);
    if (currentRoute === "settings") {
      fetchEmailSettings();
    }
  }, [currentRoute]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const unreadCount = emails.filter(
      (e) => !e.is_read && !e.is_deleted,
    ).length;
    document.title = unreadCount > 0 ? `(${unreadCount}) Webmail` : "Webmail";
  }, [emails]);

  useEffect(() => {
    fetchEmails();

    const channel = supabase
      .channel("public:emails")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "emails" },
        (payload) => {
          const newEmail = payload.new;
          setEmails((prev) => [newEmail, ...prev]);

          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(newEmail.sender_name || newEmail.sender_email, {
              body: newEmail.subject,
              icon: "/favicon.ico",
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "emails" },
        () => {
          fetchEmails(false);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "emails" },
        (payload) => {
          setEmails((prev) => prev.filter((e) => e.id !== payload.old.id));
        },
      )
      .subscribe();

    const interval = setInterval(() => {
      handleSync(true);
    }, 30000);

    const handleFocus = () => {
      handleSync(true);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
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

  const fetchEmails = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data } = await supabase
      .from("emails")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(300);

    if (data) setEmails(data);
    if (showLoading) setLoading(false);
  };

  // Monta os headers da requisição incluindo o token da sessão atual,
  // para que as rotas de API consigam agir como o usuário autenticado.
  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    };
  };

  const handleSync = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/sync-emails", { method: "POST", headers });
      await fetchEmails(false);
    } catch (err) {
      console.error("Erro ao sincronizar e-mails:", err);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  const handleSaveSignature = () => {
    localStorage.setItem("webmail_signature", signatureText);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
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

  const filteredEmails = emails.filter((email) => {
    if (activeTab === "trash") return email.is_deleted === true;
    if (email.is_deleted) return false;

    if (activeTab === "starred" && !email.is_starred) return false;
    if (activeTab === "sent" && !email.is_sent) return false;
    if (activeTab === "shopee" && !isShopeeCategory(email)) return false;
    if (activeTab === "ml" && !isMLCategory(email)) return false;
    if (activeTab === "ecommerce" && !isEcommerceCategory(email)) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        email.subject?.toLowerCase().includes(term) ||
        email.sender_email?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const getUnreadCount = (category) => {
    return emails.filter((e) => {
      if (e.is_read || e.is_deleted) return false;
      if (category === "inbox") return true;
      if (category === "shopee") return isShopeeCategory(e);
      if (category === "ml") return isMLCategory(e);
      if (category === "ecommerce") return isEcommerceCategory(e);
      return false;
    }).length;
  };

  const markAsRead = async (email) => {
    setSelectedEmail(email);
    setComposeMode(null);
    if (!email.is_read) {
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, is_read: true } : e)),
      );
      await supabase
        .from("emails")
        .update({ is_read: true })
        .eq("id", email.id);
    }
  };

  const toggleStar = async (email) => {
    if (!email) return;
    const newValue = !email.is_starred;
    const updated = { ...email, is_starred: newValue };
    setSelectedEmail(updated);
    setEmails((prev) => prev.map((el) => (el.id === email.id ? updated : el)));
    await supabase
      .from("emails")
      .update({ is_starred: newValue, is_read: email.is_read })
      .eq("id", email.id);
  };

  const initiateDelete = (emailId, messageId) => {
    if (activeTab === "trash") {
      setConfirmDeleteModal({ open: true, emailId, messageId });
    } else {
      softDelete(emailId);
    }
  };

  const softDelete = async (emailId) => {
    const currentIndex = filteredEmails.findIndex((e) => e.id === emailId);
    const newFiltered = filteredEmails.filter((e) => e.id !== emailId);

    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, is_deleted: true } : e)),
    );

    if (selectedEmail?.id === emailId) {
      if (newFiltered.length > 0) {
        const nextIndex = Math.min(currentIndex, newFiltered.length - 1);
        setSelectedEmail(newFiltered[nextIndex]);
      } else {
        setSelectedEmail(null);
      }
    }

    await supabase
      .from("emails")
      .update({ is_deleted: true })
      .eq("id", emailId);
  };

  const hardDeletePermanent = async () => {
    const { emailId, messageId } = confirmDeleteModal;
    setConfirmDeleteModal({ open: false, emailId: null, messageId: null });

    if (!emailId) return;

    const currentIndex = filteredEmails.findIndex((e) => e.id === emailId);
    const newFiltered = filteredEmails.filter((e) => e.id !== emailId);

    setEmails((prev) => prev.filter((e) => e.id !== emailId));

    if (selectedEmail?.id === emailId) {
      if (newFiltered.length > 0) {
        const nextIndex = Math.min(currentIndex, newFiltered.length - 1);
        setSelectedEmail(newFiltered[nextIndex]);
      } else {
        setSelectedEmail(null);
      }
    }

    try {
      const headers = await getAuthHeaders();
      await fetch("/api/delete-email", {
        method: "POST",
        headers,
        body: JSON.stringify({ id: emailId, messageId }),
      });
    } catch (error) {
      console.error("Falha ao deletar:", error);
      fetchEmails(false);
    }
  };

  const emptyTrash = async () => {
    setConfirmEmptyTrashModal(false);
    const trashEmails = emails.filter((e) => e.is_deleted);
    if (trashEmails.length === 0) return;

    if (selectedEmail?.is_deleted) {
      setSelectedEmail(null);
    }

    setEmails((prev) => prev.filter((e) => !e.is_deleted));

    await supabase.from("emails").delete().eq("is_deleted", true);

    const headers = await getAuthHeaders();
    await fetch("/api/empty-trash", {
      method: "POST",
      headers,
      body: JSON.stringify({
        messageIds: trashEmails.map((e) => e.message_id).filter(Boolean),
      }),
    });
  };

  // Inicializa criação, resposta ou encaminhamento anexando a assinatura
  const startCompose = (mode, targetEmail = null) => {
    setComposeMode(mode);
    const sig = localStorage.getItem("webmail_signature") || "";
    const formattedSig = sig ? `\n\n--\n${sig}` : "";

    if (mode === "new") {
      setSelectedEmail(null);
      setComposeTo("");
      setComposeSubject("");
      setComposeText(formattedSig);
    } else if (mode === "reply") {
      setComposeTo(targetEmail?.sender_email || "");
      const sub = targetEmail?.subject || "";
      setComposeSubject(
        sub.toLowerCase().startsWith("re:") ? sub : `Re: ${sub}`,
      );
      setComposeText(formattedSig);
    } else if (mode === "forward") {
      setComposeTo("");
      const sub = targetEmail?.subject || "";
      setComposeSubject(
        sub.toLowerCase().startsWith("fwd:") ? sub : `Fwd: ${sub}`,
      );
      setComposeText(formattedSig);
    }
  };

  const handleSend = async () => {
    if (!composeTo) return alert("Informe o destinatário.");
    if (!composeSubject) return alert("Informe o assunto do e-mail.");

    setIsSending(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers,
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          text: composeText,
          originalMessageId: selectedEmail?.message_id || null,
        }),
      });

      if (res.ok) {
        setComposeMode(null);
        setComposeText("");
        setComposeTo("");
        setComposeSubject("");
        await fetchEmails(false);
      } else {
        alert("Erro ao enviar o e-mail.");
      }
    } catch (error) {
      console.error("Erro no envio:", error);
      alert("Falha no envio do e-mail.");
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-gray-400">
        <FaRotateRight className="animate-spin text-[#afdb21] text-3xl mr-3" />
        <span className="text-lg font-light tracking-wide">
          Carregando Webmail...
        </span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.03); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #afdb21; border-radius: 99px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8e000; }
      `}</style>

      {confirmDeleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-[#222] rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-xl mb-4">
              <FaTriangleExclamation />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Excluir E-mail Definitivamente?
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Esta ação excluirá permanentemente o e-mail do servidor IMAP e não
              poderá ser desfeita.
            </p>
            <div className="flex w-full gap-3">
              <button
                onClick={() =>
                  setConfirmDeleteModal({
                    open: false,
                    emailId: null,
                    messageId: null,
                  })
                }
                className="flex-1 py-2.5 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-gray-300 text-sm rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={hardDeletePermanent}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmEmptyTrashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-[#222] rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-xl mb-4">
              <FaBroom />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Esvaziar toda a Lixeira?
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Todos os e-mails na lixeira serão apagados **permanentemente** do
              servidor. Essa operação não pode ser desfeita.
            </p>
            <div className="flex w-full gap-3">
              <button
                onClick={() => setConfirmEmptyTrashModal(false)}
                className="flex-1 py-2.5 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-gray-300 text-sm rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={emptyTrash}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition cursor-pointer"
              >
                Sim, Esvaziar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-56px)] w-full bg-[#0a0a0a] text-gray-300 font-sans border border-[#1f1f1f] shadow-2xl rounded-xl overflow-hidden">
        <aside className="w-15 bg-[#111111] border-r border-[#1f1f1f] flex flex-col items-center py-6 justify-between shrink-0 z-20">
          <div className="flex flex-col items-center w-full">
            {[
              { id: "inbox", icon: FaInbox, tooltip: "Caixa de Entrada" },
              { id: "starred", icon: FaStar, tooltip: "Com Estrela" },
              {
                id: "shopee",
                icon: SiShopee,
                tooltip: "Shopee (Hora de enviar)",
              },
              {
                id: "ml",
                icon: FaHandshake,
                tooltip: "Mercado Livre (Você vendeu)",
              },
              {
                id: "ecommerce",
                icon: FaBagShopping,
                tooltip: "E-commerce (Bagy / Pedidos)",
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive =
                currentRoute === "emails" && activeTab === tab.id;
              const count = getUnreadCount(tab.id);

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    navigateTo("/webmail", "emails");
                    setActiveTab(tab.id);
                  }}
                  title={tab.tooltip}
                  className={`relative w-full aspect-square transition-all cursor-pointer flex justify-center items-center ${isActive ? "bg-[#afdb21] text-black" : "text-gray-500 hover:bg-[#afdb21] hover:text-black"}`}
                >
                  <Icon className="text-xl" />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#afdb21] text-black text-[10px] font-extrabold px-1.5 min-w-4.5 h-4.5 flex items-center justify-center rounded-full border-2 border-[#111111]">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}

            {[
              { id: "sent", icon: FaPaperPlane, tooltip: "Enviados" },
              { id: "trash", icon: FaTrash, tooltip: "Lixeira" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive =
                currentRoute === "emails" && activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    navigateTo("/webmail", "emails");
                    setActiveTab(tab.id);
                  }}
                  title={tab.tooltip}
                  className={`w-full aspect-square flex items-center justify-center p-3 transition-all cursor-pointer ${isActive ? "bg-[#afdb21] text-black" : "text-gray-500 hover:bg-[#afdb21] hover:text-[#1a1a1a]"}`}
                >
                  <Icon className="text-xl" />
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center space-y-3">
            <button
              onClick={() => navigateTo("/webmail/configuracoes", "settings")}
              className={`p-3 transition-colors cursor-pointer ${currentRoute === "settings" ? "text-[#afdb21] " : "text-gray-500 hover:text-[#afdb21]"}`}
              title="Configurações"
            >
              <FaGear className="text-xl" />
            </button>

            <button
              onClick={() => handleSync(false)}
              className={`p-3 text-gray-500 hover:text-[#afdb21] transition-colors cursor-pointer ${isSyncing ? "animate-spin" : ""}`}
              title="Sincronizar Manualmente"
            >
              <FaRotateRight className="text-xl" />
            </button>
          </div>
        </aside>

        <section className="w-95 bg-[#141414] border-r border-[#1f1f1f] flex flex-col shrink-0">
          {currentRoute === "settings" ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-[#1f1f1f]">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Painel de Opções
                </h2>
              </div>
              <div className="p-3 space-y-1">
                <button
                  onClick={() => setSelectedSetting("signature")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${selectedSetting === "signature" ? "bg-[#1e1e1e] text-[#afdb21] border-l-4 border-[#afdb21]" : "text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200 border-l-4 border-transparent"}`}
                >
                  <FaSignature className="text-lg" />
                  <span>Assinatura de E-mail</span>
                </button>
                <button
                  onClick={() => setSelectedSetting("credentials")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    selectedSetting === "credentials"
                      ? "bg-[#1e1e1e] text-[#afdb21] border-l-4 border-[#afdb21]"
                      : "text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200 border-l-4 border-transparent"
                  }`}
                >
                  <FaServer className="text-lg" />
                  <span>Servidor IMAP/SMTP</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-[#1f1f1f] bg-[#141414] flex flex-col gap-2.5">
                <button
                  onClick={() => startCompose("new")}
                  className="w-full py-2.5 px-4 bg-[#afdb21] hover:bg-[#a8e000] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-[#afdb21]/10"
                >
                  <FaPlus className="text-sm" />
                  <span>Novo E-mail</span>
                </button>

                <div className="relative">
                  <FaMagnifyingGlass className="absolute left-3.5 top-3 text-gray-500 text-sm" />
                  <input
                    type="text"
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1e1e1e] border-none text-sm text-gray-200 pl-10 pr-4 py-2 rounded-lg outline-none focus:ring-1 focus:ring-[#afdb21]/60 transition-all"
                  />
                </div>

                {activeTab === "trash" && filteredEmails.length > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-[#181818] border border-[#262626] rounded-xl transition-all">
                    <span className="text-[11px] text-gray-400 font-medium tracking-wide">
                      {filteredEmails.length}{" "}
                      {filteredEmails.length === 1
                        ? "item na lixeira"
                        : "itens na lixeira"}
                    </span>
                    <button
                      onClick={() => setConfirmEmptyTrashModal(true)}
                      className="flex items-center space-x-1.5 px-2.5 py-1 text-gray-300 hover:text-white border border-[#afdb21] hover:bg-[#afdb21]/10 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
                    >
                      <FaBroom className="text-[10px] text-[#afdb21]" />
                      <span>Esvaziar lixeira</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredEmails.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    Nenhum e-mail encontrado nesta categoria.
                  </div>
                ) : (
                  filteredEmails.map((email) => {
                    const isSelected = selectedEmail?.id === email.id;
                    const { time, dateStr } = formatEmailDate(
                      email.received_at,
                    );

                    return (
                      <div
                        key={email.id}
                        onClick={() => markAsRead(email)}
                        className={`flex items-center p-4 border-b border-[#1a1a1a] cursor-pointer transition-colors duration-150 ${isSelected ? "bg-[#1e1e1e] border-l-4 border-l-[#afdb21]" : "hover:bg-[#1a1a1a] border-l-4 border-l-transparent"}`}
                      >
                        <div className="mr-3 shrink-0">
                          <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xs font-bold text-gray-300">
                            {getInitials(
                              email.sender_name || email.sender_email,
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            {email.is_starred && (
                              <FaStar
                                className="text-[#afdb21] text-xs shrink-0"
                                title="Favorito"
                              />
                            )}
                            <span
                              className={`truncate text-[13px] ${!email.is_read ? "text-white font-bold" : "text-gray-300"}`}
                            >
                              {email.sender_name ||
                                email.sender_email.split("@")[0]}
                            </span>
                          </div>

                          <p
                            className={`text-[12px] truncate ${!email.is_read ? "text-gray-200 font-semibold" : "text-gray-500"}`}
                          >
                            {email.subject}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="block text-[11px] text-gray-400 font-medium">
                            {time}
                          </span>
                          <span className="block text-[10px] text-gray-500">
                            {dateStr}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>

        <main className="flex-1 flex flex-col overflow-hidden">
          {currentRoute === "settings" ? (
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col justify-between">
              {selectedSetting === "signature" && (
                <>
                  <div>
                    <div className="flex justify-between items-center pb-6 border-b border-[#1f1f1f] mb-6">
                      <div>
                        <h1 className="text-xl font-bold text-white">
                          Assinatura de E-mail
                        </h1>
                        <p className="text-xs text-gray-400 mt-1">
                          Defina o texto padrão que será anexado automaticamente
                          ao responder ou enviar e-mails.
                        </p>
                      </div>
                      {savedSuccess && (
                        <span className="flex items-center text-xs font-bold text-[#afdb21] bg-[#1a2b00] border border-[#3e5c14] px-4 py-2 rounded-lg">
                          <FaCheck className="mr-2" /> Salvo com sucesso!
                        </span>
                      )}
                    </div>

                    <textarea
                      value={signatureText}
                      onChange={(e) => setSignatureText(e.target.value)}
                      placeholder={`Atenciosamente,\nSeu Nome\nEmpresa | (41) 99999-9999`}
                      className="w-full h-64 bg-[#0a0a0a] border border-[#222] text-sm text-gray-200 p-4 rounded-xl outline-none focus:border-[#afdb21] resize-none transition-all"
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
              {selectedSetting === "credentials" && (
                <>
                  <div className="flex justify-between items-center pb-6 border-b border-[#1f1f1f] mb-6">
                    <div>
                      <h1 className="text-xl font-bold text-white">
                        Servidor IMAP/SMTP
                      </h1>
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
                      {isSaving
                        ? "Testando e Salvando..."
                        : "Salvar Credenciais"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : composeMode ? (
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#111111]">
              <div className="max-w-4xl mx-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl flex flex-col">
                <div className="px-6 py-4 border-b border-[#2a2a2a] flex justify-between items-center bg-[#141414] rounded-t-xl">
                  <span className="text-sm font-bold text-gray-200">
                    {composeMode === "new"
                      ? "Novo E-mail"
                      : composeMode === "reply"
                        ? "Responder Mensagem"
                        : "Encaminhar Mensagem"}
                  </span>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  <input
                    type="email"
                    placeholder="Para:"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    className="bg-[#111] border border-[#333] text-sm text-white px-4 py-2.5 rounded-lg outline-none focus:border-[#afdb21]"
                  />
                  <input
                    type="text"
                    placeholder="Assunto:"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="bg-[#111] border border-[#333] text-sm text-white px-4 py-2.5 rounded-lg outline-none focus:border-[#afdb21]"
                  />
                  <textarea
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    placeholder="Escreva sua mensagem..."
                    className="w-full h-80 bg-[#111] border border-[#333] text-sm text-gray-200 p-4 rounded-lg outline-none focus:border-[#afdb21] resize-none font-sans"
                  />
                  <div className="flex justify-end gap-3 mt-2">
                    <button
                      onClick={() => setComposeMode(null)}
                      className="px-5 py-2 text-sm text-gray-400 hover:text-white transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={isSending}
                      className="px-6 py-2.5 text-sm font-bold text-black bg-[#afdb21] hover:bg-[#a8e000] rounded-lg transition cursor-pointer shadow-md shadow-[#afdb21]/10 flex items-center space-x-2"
                    >
                      {isSending ? (
                        <FaRotateRight className="animate-spin text-black" />
                      ) : (
                        <FaPaperPlane />
                      )}
                      <span>{isSending ? "Enviando..." : "Enviar E-mail"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedEmail ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <header className="px-8 py-5 border-b border-[#1f1f1f] bg-[#141414] flex justify-between items-start shrink-0">
                <div className="flex items-start max-w-2xl">
                  <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center text-base font-bold text-gray-200 mr-4 shrink-0">
                    {getInitials(
                      selectedEmail.sender_name || selectedEmail.sender_email,
                    )}
                  </div>

                  <div>
                    <h1 className="text-lg font-bold text-gray-100 mb-1 leading-snug">
                      {selectedEmail.subject}
                    </h1>
                    <div className="flex flex-col text-[13px] text-gray-400">
                      <span>
                        <strong className="text-gray-200">
                          {selectedEmail.sender_name}
                        </strong>{" "}
                        &lt;
                        <span className="text-[#afdb21] font-mono">
                          {selectedEmail.sender_email}
                        </span>
                        &gt;
                      </span>
                      <span className="text-gray-500 mt-0.5">
                        {new Date(selectedEmail.received_at).toLocaleString(
                          "pt-BR",
                          { dateStyle: "full", timeStyle: "short" },
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0 ml-4">
                  <button
                    onClick={() => toggleStar(selectedEmail)}
                    title={
                      selectedEmail.is_starred
                        ? "Remover Favorito"
                        : "Favoritar"
                    }
                    className="p-2.5 text-gray-400 hover:text-[#afdb21] hover:bg-[#1e1e1e] rounded-lg transition-colors cursor-pointer"
                  >
                    {selectedEmail.is_starred ? (
                      <FaStar className="text-[#afdb21] text-lg" />
                    ) : (
                      <FaRegStar className="text-lg" />
                    )}
                  </button>

                  <button
                    onClick={() => startCompose("reply", selectedEmail)}
                    title="Responder"
                    className="p-2.5 text-gray-400 hover:text-white hover:bg-[#1e1e1e] rounded-lg transition-colors cursor-pointer"
                  >
                    <FaReply className="text-lg" />
                  </button>

                  <button
                    onClick={() => startCompose("forward", selectedEmail)}
                    title="Encaminhar"
                    className="p-2.5 text-gray-400 hover:text-white hover:bg-[#1e1e1e] rounded-lg transition-colors cursor-pointer"
                  >
                    <FaShare className="text-lg" />
                  </button>

                  <div className="w-px h-6 bg-[#262626] mx-1" />

                  <button
                    onClick={() =>
                      initiateDelete(selectedEmail.id, selectedEmail.message_id)
                    }
                    title="Excluir"
                    className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-[#1e1e1e] rounded-lg transition-colors cursor-pointer"
                  >
                    <FaTrash className="text-lg" />
                  </button>
                </div>
              </header>

              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#111111]">
                <div className="max-w-4xl mx-auto min-h-137.5 bg-white rounded-lg overflow-hidden shadow-xl border border-[#222]">
                  <iframe
                    title="Conteúdo do E-mail"
                    srcDoc={
                      selectedEmail.body_html
                        ? `<base target="_blank" />${selectedEmail.body_html}`
                        : `<base target="_blank" /><div style="font-family: sans-serif; padding: 24px; color: #333; line-height: 1.6;">${selectedEmail.body_text || ""}</div>`
                    }
                    className="w-full h-175 border-none"
                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
              <FaInbox className="text-6xl mb-3 opacity-30" />
              <p className="text-base font-light text-gray-500">
                Selecione uma mensagem para ler
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
