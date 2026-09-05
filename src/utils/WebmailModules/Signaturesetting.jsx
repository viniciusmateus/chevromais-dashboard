import React, { useState, useEffect } from "react";
import { FaSignature, FaCheck } from "react-icons/fa6";

// Cada módulo de configuração é 100% autossuficiente: tem seu próprio
// state, seu próprio fetch/save, e só expõe um componente pronto pra
// ser renderizado. O Webmail.jsx não sabe (nem precisa saber) nada
// sobre assinatura — ele só chama <Component />.
function SignatureSettingContent() {
  const [signatureText, setSignatureText] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const savedSignature = localStorage.getItem("webmail_signature") || "";
    setSignatureText(savedSignature);
  }, []);

  const handleSaveSignature = () => {
    localStorage.setItem("webmail_signature", signatureText);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <>
      <div>
        <div className="flex justify-between items-center pb-6 border-b border-[#1f1f1f] mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">
              Assinatura de E-mail
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Defina o texto padrão que será anexado automaticamente ao
              responder ou enviar e-mails.
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
  );
}

// Descritor que o registry (index.jsx) consome.
export default {
  id: "signature",
  label: "Assinatura de E-mail",
  icon: FaSignature,
  component: SignatureSettingContent,
};
