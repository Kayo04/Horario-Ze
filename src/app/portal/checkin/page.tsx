'use client'
import React, { useState, useEffect } from 'react';
import QRCode from "react-qr-code";
import Link from 'next/link';
import { 
  QrCodeIcon, 
  CheckBadgeIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Reservation as IReservation, EventType } from '@/types/reservation';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

interface CheckInReservation {
  _id: string; 
  eventType: EventType;
  datetime?: string;
  adults?: number;
  children?: number;
  customerName?: string;
  marketingSource?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  people?: number;
  // Lista de quem já fez check-in
  clients?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }[];
  marketingNotes?: string; // NOVO CAMPO: Notas adicionais
}

export default function CheckInDashboard() {
  const [reservations, setReservations] = useState<CheckInReservation[]>([]);
  const [selectedRes, setSelectedRes] = useState<CheckInReservation | null>(null);
  const [marketingSource, setMarketingSource] = useState("");
  const [notes, setNotes] = useState(""); // NOVO STATE
  const [showQR, setShowQR] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  // DATA SELECIONADA
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; 
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    fetchReservationsByDate(selectedDate);
  }, [selectedDate]);

  const fetchReservationsByDate = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/date?date=${dateStr}`); 
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (error) {
      console.error("Erro ao buscar reservas", error);
    } finally {
      setLoading(false);
    }
  };

  const changeDay = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleSourceSubmit = async () => {
    if (!selectedRes || !marketingSource) return;

    try {
       const res = await fetch('/api/checkin/save-source', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           id: selectedRes._id, 
           source: marketingSource,
           notes: notes // Envia as notas também
         })
       });
       
       if (res.ok) {
           selectedRes.marketingSource = marketingSource;
           selectedRes.marketingNotes = notes; // Atualiza localmente
           setShowQR(true);
       } else {
           alert(t.checkin_staff_err_save);
       }
    } catch (err) {
      alert(t.checkin_staff_err_conn);
    }
  };

  const openModal = (res: CheckInReservation) => {
    setSelectedRes(res);
    // Se já tiver marketing preenchido, mostra logo o QR Code
    if (res.marketingSource) {
      setMarketingSource(res.marketingSource);
      setNotes(res.marketingNotes || "");
      setShowQR(true);
    } else {
      setMarketingSource("");
      setNotes("");
      setShowQR(false);
    }
  };

  const closeModal = () => {
    setShowQR(false);
    setSelectedRes(null);
    setMarketingSource("");
    setNotes("");
  };

  // HELPER FUNCTIONS
  const getDisplayTime = (res: CheckInReservation) => {
    if (res.startTime) return res.startTime; 
    if (res.datetime && res.datetime.includes('T')) {
        return res.datetime.split('T')[1].substring(0, 5); 
    }
    return "--:--";
  };

  const getTotalPeople = (res: CheckInReservation) => {
      const p = res.people || 0;
      const a = res.adults || 0;
      const c = res.children || 0;
      return Math.max(p, a + c);
  };

  const getDisplayName = (name?: string) => {
      if (!name) return t.checkin_staff_no_name;
      if (/^\d+x/.test(name) || name.includes('Mask of') || name.includes('Mission') || name.includes('Don\'t Scream')) {
          return t.checkin_staff_details;
      }
      return name;
  };

  const isGameDescription = (name?: string) => {
      if (!name) return false;
      return /^\d+x/.test(name) || name.includes('Mask of') || name.includes('Mission');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      
      {/* HEADER */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="mb-6 flex justify-between items-center">
            <Link href="/portal" className="inline-flex items-center text-sm text-park-600 hover:text-park-800 font-medium transition-colors">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              {t.checkin_staff_back}
            </Link>

            <div className="flex items-center gap-4">
              {/* LANGUAGE TOGGLE */}
              <div className="flex gap-2">
                <LanguageSwitcher />
              </div>

              <Link href="/portal/statistics" className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-200 transition-colors">
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  {t.checkin_staff_stats}
              </Link>
            </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CheckBadgeIcon className="w-8 h-8 text-park-600" />
              {t.checkin_staff_title}
            </h1>

            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <button onClick={() => changeDay(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <div className="relative flex items-center">
                    <CalendarDaysIcon className="w-5 h-5 text-gray-400 absolute left-3 pointer-events-none" />
                    <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-transparent font-bold text-gray-700 outline-none cursor-pointer"
                    />
                </div>
                <button onClick={() => changeDay(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>

      {/* LISTA DE RESERVAS */}
      <div className="grid gap-4 max-w-5xl mx-auto">
        {loading ? (
            <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-park-200 border-t-park-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">{t.checkin_staff_loading}</p>
            </div>
        ) : reservations.length === 0 ? (
          <div className="text-center p-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <UserGroupIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            {t.checkin_staff_no_res} <span className="font-bold text-gray-700">{selectedDate}</span>.
          </div>
        ) : (
            reservations.map((res) => (
            <div key={res._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 transition-all hover:shadow-md">
                <div className="flex items-center gap-6 w-full">
                <div className="bg-park-50 p-3 rounded-full text-park-700 font-bold text-xl min-w-[85px] text-center border border-park-100">
                    {getDisplayTime(res)}
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800">
                        {getDisplayName(res.customerName)}
                    </h3>
                    {isGameDescription(res.customerName) && (
                        <p className="text-xs text-gray-500 mb-1 italic">{res.customerName}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide
                        ${res.eventType === 'birthday' ? 'bg-green-100 text-green-700' : 
                        res.eventType === 'teambuilding' ? 'bg-purple-100 text-purple-700' : 
                        'bg-gray-100 text-gray-700'}`}>
                        {res.eventType === 'birthday' ? t.event_birthday : 
                         res.eventType === 'teambuilding' ? t.event_teambuilding :
                         res.eventType === 'vrlocal' ? t.event_vrlocal :
                         res.eventType === 'experiencia' ? t.event_experience : 
                         (res.eventType || t.checkin_staff_event)}
                    </span>
                    <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                        <UserGroupIcon className="w-4 h-4"/> 
                        {/* Mostra quantos já fizeram checkin */}
                        {res.clients?.length || 0} / {getTotalPeople(res)} {t.checkin_staff_registered}
                    </span>
                    {res.marketingSource && (
                        <span className="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                        <CheckBadgeIcon className="w-3 h-3"/> {res.marketingSource}
                        </span>
                    )}
                    </div>
                </div>
                </div>
                
                {/* BOTÃO ÚNICO - ESCURO E SÓLIDO */}
                <button 
                onClick={() => openModal(res)}
                className="bg-gray-900 hover:bg-black text-white px-6 py-4 rounded-xl font-bold flex items-center gap-3 shadow-lg transform active:scale-95 transition-all min-w-[140px] justify-center"
                >
                    <QrCodeIcon className="w-6 h-6" />
                    <span>{res.marketingSource ? t.checkin_staff_view_qr : t.checkin_staff_checkin}</span>
                </button>
            </div>
            ))
        )}
      </div>

      {/* MODAL */}
      {selectedRes && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>

            <div className="mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">{getDisplayName(selectedRes.customerName)}</h2>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">{selectedDate}</span> 
                às {getDisplayTime(selectedRes)}
              </p>
            </div>

            {!showQR ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {t.checkin_staff_where}
                  </label>
                  
                  {/* INPUT DE TEXTO LIVRE */}
                  {/* SELETOR DE ORIGEM */}
                  <select 
                    value={marketingSource}
                    onChange={(e) => setMarketingSource(e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-park-500 bg-gray-50 text-gray-900 mb-4"
                  >
                    <option value="" disabled>{t.checkin_staff_select_opt}</option>
                    <option value="Google">Google</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Linkedin">Linkedin</option>
                    <option value="Tik Tok">Tik Tok</option>
                    <option value="Chat Gpt">Chat Gpt</option>
                    <option value="Evento">Evento</option>
                    <option value="Festa de Aniversário">Festa de Aniversário</option>
                    <option value="Já visitei o The Park">{t.checkin_staff_visited_before}</option>
                    <option value="Amigos ou Família">{t.checkin_staff_friends_family}</option>
                    <option value="Vizinhos">{t.checkin_staff_neighbors}</option>
                    <option value="Walk - The Park">Walk - The Park</option>
                    <option value="Odisseias">Odisseias</option>
                    <option value="Tripadvisor">Tripadvisor</option>
                    <option value="Outro">{t.checkin_staff_other}</option>
                  </select>

                  {/* SELECIONOU 'OUTRO' OU QUER DAR NOTAS */}
                  {marketingSource === 'Outro' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                         {t.checkin_staff_other_details}
                      </label>
                      <textarea
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t.checkin_staff_other_ex}
                        className="w-full p-4 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-park-500 bg-white text-gray-900 placeholder:text-gray-400 min-h-[100px]"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleSourceSubmit}
                  disabled={!marketingSource.trim()}
                  className="w-full py-4 bg-park-600 text-white rounded-xl font-bold hover:bg-park-700 disabled:opacity-50 transition-all shadow-lg shadow-park-200"
                >
                  {t.checkin_staff_confirm_qr}
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-300">
                        <QRCode 
                            value={`${siteUrl}/checkin/cliente/${selectedRes._id}`} 
                            size={200}
                        />
                    </div>
                    <div>
                        <p className="font-bold text-lg text-gray-900">{t.checkin_staff_show_client}</p>
                        <p className="text-sm text-gray-500">{t.checkin_staff_insurance}</p>
                    </div>
                </div>

                {/* 🔥 LISTA DE INSCRITOS DENTRO DO MODAL */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3 flex justify-between items-center">
                        {t.checkin_staff_enrolled} 
                        <span className="bg-park-100 text-park-800 text-xs px-2 py-1 rounded-full">{selectedRes.clients?.length || 0} / {getTotalPeople(selectedRes)}</span>
                    </h3>
                    
                    {!selectedRes.clients || selectedRes.clients.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-2">{t.checkin_staff_no_enrolled}</p>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {selectedRes.clients.map((client, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-gray-200 shadow-sm">
                                    <span className="font-medium text-gray-700">{client.firstName} {client.lastName}</span>
                                    <CheckBadgeIcon className="w-5 h-5 text-green-500" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button 
                  onClick={closeModal}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold"
                >
                  {t.checkin_staff_done}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}