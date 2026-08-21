import React, { useState } from 'react';

const CLOUD_RUN_API_URL = 'https://pdfconverter-931850146140.southamerica-east1.run.app/api/gerar-documentos';

export default function Impugnar() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [formData, setFormData] = useState({
    empresa: 'chevromais',
    disputeNumber: '',
    disputeDate: '',
    cityUF: '',
    buyer: '',
    objections: {
      delivery: false,
      sample: false,
      ence: false,
      manufacturing: false,
      abrafati: false,
      abipti: false,
      restriction: false,
      service: false,
    },
    details: {
      delivery: { deliveryStipulate: '', deliveryUnit: 'Dias' },
      sample: { sampleObject: '', sampleClause: '' },
      service: { serviceType: '', serviceObject: '' },
      restriction: { restrictionClause: '' },
      ence: {
        enceSpecs: { traction: false, resistance: false },
        enceGrades: { A: false, B: false, C: false, D: false, E: false },
      },
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleObjectionChange = (key) => {
    setFormData((prev) => ({
      ...prev,
      objections: {
        ...prev.objections,
        [key]: !prev.objections[key],
      },
    }));
  };

  const handleDetailChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        [section]: {
          ...prev.details[section],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const selectedObjectionsCount = Object.values(formData.objections).filter(Boolean).length;
    if (selectedObjectionsCount === 0) {
      alert('Selecione ao menos uma opção de impugnação.');
      setLoading(false);
      return;
    }

    setProgress({ current: 0, total: selectedObjectionsCount });

    try {
      const response = await fetch(CLOUD_RUN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorDetails = result.debug_logs ? `\n\nLogs:\n${result.debug_logs.join('\n')}` : '';
        throw new Error((result.error || 'Erro ao gerar documentos no servidor.') + errorDetails);
      }

      if (result.files && result.files.length > 0) {
        result.files.forEach((file, index) => {
          setTimeout(() => {
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${file.pdfBase64}`;
            link.download = file.pdfFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setProgress((prev) => ({ ...prev, current: index + 1 }));
          }, index * 400);
        });
      }

      alert('Documentos gerados e baixados com sucesso!');
    } catch (error) {
      console.error('Erro no processamento:', error);
      alert(`Falha na geração dos documentos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl bg-white shadow-md rounded-lg my-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Gerador de Impugnações</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número da Licitação/Disputa</label>
            <input
              type="text"
              value={formData.disputeNumber}
              onChange={(e) => handleInputChange('disputeNumber', e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Pregão 001/2026"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              value={formData.disputeDate}
              onChange={(e) => handleInputChange('disputeDate', e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade / UF</label>
            <input
              type="text"
              value={formData.cityUF}
              onChange={(e) => handleInputChange('cityUF', e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Curitiba / PR"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Órgão Comprador</label>
            <input
              type="text"
              value={formData.buyer}
              onChange={(e) => handleInputChange('buyer', e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Prefeitura Municipal"
              required
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Opções de Impugnação</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.keys(formData.objections).map((key) => (
              <label key={key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.objections[key]}
                  onChange={() => handleObjectionChange(key)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-sm text-gray-800 capitalize">{key}</span>
              </label>
            ))}
          </div>
        </div>

        {loading && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="font-semibold text-blue-800">
              Processando documentos na nuvem... ({progress.current} / {progress.total})
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition duration-200 disabled:bg-gray-400"
        >
          {loading ? 'Gerando PDFs com LibreOffice...' : 'Gerar Documento(s)'}
        </button>
      </form>
    </div>
  );
}