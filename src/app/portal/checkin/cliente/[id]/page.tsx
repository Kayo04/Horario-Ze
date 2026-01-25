'use client'
import React, { useState } from 'react';
import { useParams } from 'next/navigation';

export default function PaginaWaiverCliente() {
  const params = useParams();
  // Garante que o ID existe, senão usa string vazia
  const reservationId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : '';

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/checkin/save-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, reservationId })
      });
      
      if(res.ok) {
        setDone(true);
      } else {
        alert("Erro ao guardar. Tente novamente.");
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
        <div className="bg-teal-600 p-6 text-white text-center">
          <h1 className="text-xl font-bold uppercase tracking-widest">The Park</h1>
          <p className="text-teal-100 text-xs mt-1">Registo de Participante</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data de Nascimento *</label>
            <input 
              required 
              type="date" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all" 
              value={formData.dob} 
              onChange={e => setFormData({...formData, dob: e.target.value})} 
            />
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

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl mt-4 hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-teal-200"
          >
            {isSubmitting ? 'A guardar...' : 'Confirmar Registo'}
          </button>
        </form>
        
        <div className="bg-gray-50 p-4 text-center text-[10px] text-gray-400 border-t border-gray-100">
          Ao clicar em confirmar, aceita os termos e condições do The Park.
        </div>
      </div>
    </div>
  );
}