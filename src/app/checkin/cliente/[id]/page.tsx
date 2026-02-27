'use client'
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

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
    phone: '',
    city: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // 1. Validação da Data
    if(!day || !month || !year) {
        alert(t.checkin_alert_dob);
        setIsSubmitting(false);
        return;
    }

    // 2. Validação dos Termos (Obrigatório)
    if (!acceptedTerms) {
        alert(t.checkin_alert_terms);
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
        alert(err.error || t.checkin_alert_error);
      }
      
    } catch (error) {
      alert(t.checkin_alert_conn);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-green-500 flex flex-col items-center justify-center p-6 text-center text-white font-sans">
      <div className="bg-white/20 p-4 rounded-full mb-4">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      </div>
      <h1 className="text-3xl font-bold mb-2">{t.checkin_thanks_title}</h1>
      <p className="text-lg">{t.checkin_thanks_subtitle}</p>
      <p className="mt-8 text-sm opacity-80">{t.checkin_thanks_msg}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans flex items-center justify-center relative">
      <div className="absolute top-4 right-4 flex gap-2">
        <button 
          onClick={() => setLanguage('pt')}
          className={`text-2xl hover:scale-110 transition-transform ${language === 'pt' ? 'opacity-100' : 'opacity-50'}`}
          title="Português"
        >
          🇵🇹
        </button>
        <button 
          onClick={() => setLanguage('en')}
          className={`text-2xl hover:scale-110 transition-transform ${language === 'en' ? 'opacity-100' : 'opacity-50'}`}
          title="English"
        >
          🇬🇧
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden mt-12 md:mt-0">
        
        {/* Header da Página */}
        <div className="bg-gray-900 p-6 text-white text-center">
          <h1 className="text-xl font-bold uppercase tracking-widest">The Park</h1>
          <p className="text-gray-400 text-xs mt-1">{t.checkin_client_title}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">{t.checkin_first_name_placeholder}</label>
              <input 
                required 
                type="text" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium text-gray-800"
                placeholder={t.checkin_first_name_placeholder}
                value={formData.firstName} 
                onChange={e => setFormData({...formData, firstName: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">{t.checkin_last_name_placeholder}</label>
              <input 
                required 
                type="text" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium text-gray-800"
                placeholder={t.checkin_last_name_placeholder}
                value={formData.lastName} 
                onChange={e => setFormData({...formData, lastName: e.target.value})} 
              />
            </div>
          </div>

          {/* DATA DE NASCIMENTO (3 CAMPOS) */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">{t.checkin_dob}</label>
            <div className="flex gap-2">
                <input 
                    required
                    type="tel" 
                    maxLength={2}
                    placeholder={t.checkin_day}
                    className="w-20 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-center font-medium text-gray-800"
                    value={day}
                    onChange={e => setDay(e.target.value.replace(/\D/g, ''))}
                />
                <select 
                    required
                    className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-medium text-gray-800"
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                >
                    <option value="" disabled>{t.checkin_month}</option>
                    <option value="01">{t.month_01}</option>
                    <option value="02">{t.month_02}</option>
                    <option value="03">{t.month_03}</option>
                    <option value="04">{t.month_04}</option>
                    <option value="05">{t.month_05}</option>
                    <option value="06">{t.month_06}</option>
                    <option value="07">{t.month_07}</option>
                    <option value="08">{t.month_08}</option>
                    <option value="09">{t.month_09}</option>
                    <option value="10">{t.month_10}</option>
                    <option value="11">{t.month_11}</option>
                    <option value="12">{t.month_12}</option>
                </select>
                <input 
                    required
                    type="tel" 
                    maxLength={4}
                    placeholder={t.checkin_year}
                    className="w-24 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-center font-medium text-gray-800"
                    value={year}
                    onChange={e => setYear(e.target.value.replace(/\D/g, ''))}
                />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">{t.checkin_city_label}</label>
            <input 
              required 
              type="text" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium text-gray-800"
              placeholder={t.checkin_city_placeholder}
              value={formData.city} 
              onChange={e => setFormData({...formData, city: e.target.value})} 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Email *</label>
            <input 
              required 
              type="email" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium text-gray-800"
              placeholder={t.checkin_email_placeholder}
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Telemóvel / Phone *</label>
            <input 
              required 
              type="tel" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium text-gray-800"
              placeholder={t.checkin_phone_placeholder}
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
            <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer select-none leading-relaxed">
                {t.checkin_terms_prefix} <a href="https://theparkplayground.com/en-pt/general-terms-and-conditions" target="_blank" rel="noopener noreferrer" className="text-teal-600 font-bold underline hover:text-teal-800">{t.checkin_terms_link}</a>{t.checkin_terms_suffix}
            </label>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl mt-4 hover:bg-black transition-all active:scale-95 disabled:opacity-50 shadow-lg"
          >
            {isSubmitting ? t.checkin_saving : t.checkin_confirm}
          </button>
        </form>
      </div>
    </div>
  );
}