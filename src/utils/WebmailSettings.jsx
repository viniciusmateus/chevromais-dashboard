import React, { useState, useEffect } from 'react';
import { FaSignature, FaCheck, FaArrowLeft } from 'react-icons/fa6';

export default function Settings({ onBack }) {
  const [signature, setSignature] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    // Carrega assinatura do localStorage
    const savedSignature = localStorage.getItem('webmail_signature') || '';
    setSignature(savedSignature);
  }, []);

  const handleSave = () => {
    localStorage.setItem('webmail_signature', signature);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] text-gray-300 font-sans p-8">
      <div className="max-w-4xl w-full mx-auto bg-[#141414] border border-[#1f1f1f] rounded-2xl p-8 flex flex-col shadow-2xl">
        
        {/* Topbar do Painel */}
        <div className="flex items-center justify-between pb-6 border-b border-[#1f1f1f] mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2.5 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-gray-300 rounded-xl transition cursor-pointer"
              title="Voltar ao Webmail"
            >
              <FaArrowLeft />
            </button>
            <h1 className="text-2xl font-bold text-white tracking-wide">Configurações do Webmail</h1>
          </div>
          {savedSuccess && (
            <span className="flex items-center text-xs font-bold text-[#c6ff00] bg-[#1a2b00] border border-[#3e5c14] px-4 py-2 rounded-lg">
              <FaCheck className="mr-2" /> Assinatura salva!
            </span>
          )}
        </div>

        {/* Layout do Painel (Menu Lateral + Conteúdo) */}
        <div className="flex flex-1 gap-8">
          
          {/* Menu Lateral interno de Configurações */}
          <div className="w-56 border-r border-[#1f1f1f] pr-6 flex flex-col space-y-2">
            <button className="flex items-center space-x-3 px-4 py-3 bg-[#1e1e1e] text-[#c6ff00] font-semibold text-sm rounded-xl border-l-4 border-[#c6ff00]">
              <FaSignature />
              <span>Assinatura</span>
            </button>
          </div>

          {/* Área de Conteúdo da Configuração */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Assinatura de E-mail</h2>
              <p className="text-xs text-gray-400 mb-6">
                Esta assinatura será inserida automaticamente ao final de todos os e-mails que você responder ou enviar.
              </p>

              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder={`Atenciosamente,\nSeu Nome\nSua Empresa | (41) 99999-9999`}
                className="w-full h-48 bg-[#0a0a0a] border border-[#222] text-sm text-gray-200 p-4 rounded-xl outline-none focus:border-[#c6ff00] resize-none transition-all"
              />
            </div>

            <div className="flex justify-end pt-6 border-t border-[#1f1f1f]">
              <button
                onClick={handleSave}
                className="px-6 py-2.5 text-sm font-bold text-black bg-[#c6ff00] hover:bg-[#a8e000] rounded-xl transition cursor-pointer shadow-lg shadow-[#c6ff00]/10"
              >
                Salvar Assinatura
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}