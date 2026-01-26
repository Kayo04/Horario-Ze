'use client'
import React, { useState } from 'react';
import { useParams } from 'next/navigation';

export default function PaginaWaiverCliente() {
  const params = useParams();
  const reservationId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : '';

  // Estados para a Data de Nascimento
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Estado para os Termos e Condições
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // 1. Validação da Data
    if(!day || !month || !year) {
        alert("Por favor preencha a data de nascimento completa.");
        setIsSubmitting(false);
        return;
    }

    // 2. Validação dos Termos (Obrigatório)
    if (!acceptedTerms) {
        alert("Tem de aceitar os Termos e Condições para continuar.");
        setIsSubmitting(false);
        return;
    }

    // Criar a data no formato padrão YYYY-MM-DD
    const finalDob = `${year}-${month}-${day.padStart(2, '0')}`;

    try {
      const res = await fetch('/api/checkin/save-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            ...formData, 
            dob: finalDob, 
            reservationId 
        })
      });
      
      if(res.ok) {
        setDone(true);
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao guardar. Tente novamente.");
      }
      
    } catch (error) {
      alert("Erro de conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-green-500 flex flex-col items-center justify-center p-6 text-center text-white font-sans">
      <div className="bg-white/20 p-4 rounded-full mb-4">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      </div>
      <h1 className="text-3xl font-bold mb-2">Obrigado!</h1>
      <p className="text-lg">O seu registo ficou concluído.</p>
      <p className="mt-8 text-sm opacity-80">Pode fechar esta janela e divertir-se!</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header da Página */}
        <div className="bg-gray-900 p-6 text-white text-center">
          <h1 className="text-xl font-bold uppercase tracking-widest">The Park</h1>
          <p className="text-gray-400 text-xs mt-1">Registo de Participante</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nome *</label>
              <input 
                required 
                type="text" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all" 
                placeholder="Primeiro Nome"
                value={formData.firstName} 
                onChange={e => setFormData({...formData, firstName: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Apelido *</label>
              <input 
                required 
                type="text" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all" 
                placeholder="Último Nome"
                value={formData.lastName} 
                onChange={e => setFormData({...formData, lastName: e.target.value})} 
              />
            </div>
          </div>

          {/* DATA DE NASCIMENTO (3 CAMPOS) */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data de Nascimento *</label>
            <div className="flex gap-2">
                <input 
                    required
                    type="tel" 
                    maxLength={2}
                    placeholder="Dia"
                    className="w-20 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-center"
                    value={day}
                    onChange={e => setDay(e.target.value.replace(/\D/g, ''))}
                />
                <select 
                    required
                    className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                >
                    <option value="" disabled>Mês</option>
                    <option value="01">Janeiro</option>
                    <option value="02">Fevereiro</option>
                    <option value="03">Março</option>
                    <option value="04">Abril</option>
                    <option value="05">Maio</option>
                    <option value="06">Junho</option>
                    <option value="07">Julho</option>
                    <option value="08">Agosto</option>
                    <option value="09">Setembro</option>
                    <option value="10">Outubro</option>
                    <option value="11">Novembro</option>
                    <option value="12">Dezembro</option>
                </select>
                <input 
                    required
                    type="tel" 
                    maxLength={4}
                    placeholder="Ano"
                    className="w-24 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-center"
                    value={year}
                    onChange={e => setYear(e.target.value.replace(/\D/g, ''))}
                />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email *</label>
            <input 
              required 
              type="email" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all" 
              placeholder="exemplo@email.com"
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Telemóvel *</label>
            <input 
              required 
              type="tel" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all" 
              placeholder="912 345 678"
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
            />
          </div>

          {/* CHECKBOX TERMOS E CONDIÇÕES */}
          <div className="flex items-start gap-3 pt-2">
            <input 
                id="terms"
                type="checkbox" 
                required
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-5 h-5 mt-0.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
            />
            <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer select-none">
                Li e aceito os <span className="text-teal-600 font-bold underline">Termos e Condições</span> e a Política de Privacidade do The Park. *
            </label>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl mt-4 hover:bg-black transition-all active:scale-95 disabled:opacity-50 shadow-lg"
          >
            {isSubmitting ? 'A guardar...' : 'Confirmar Registo'}
          </button>
        </form>
      </div>
    </div>
  );
}