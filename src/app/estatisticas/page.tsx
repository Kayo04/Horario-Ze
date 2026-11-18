'use client'
import React, { useState, useEffect, useRef } from 'react';
import { 
  ChartBarIcon, 
  CalendarDaysIcon, 
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';

export default function EstatisticasPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const locale = language === 'pt' ? 'pt-PT' : 'en-GB';
  // --- CONFIGURAÇÕES ---
  // CORRIGIDO: Data atualizada para 2025
  const DATA_LANCAMENTO = new Date('2025-11-27'); 
  const BASE_VISITAS = 4127; 

  const NAMESPACE = "thepark_portal_live"; 
  const KEY = "visitas_reais_v2";

  const [visitCount, setVisitCount] = useState<number>(0);
  const [stats, setStats] = useState({
    diasAtivos: 0,
    mediaDiaria: "0"
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");
  
  const hasCounted = useRef(false);

  useEffect(() => {
    // 1. CÁLCULO DE DATAS
    const hoje = new Date();
    // Math.abs garante que funciona mesmo que a data do servidor tenha ligeiro desvio
    const diferencaTempo = Math.abs(hoje.getTime() - DATA_LANCAMENTO.getTime());
    // Converter ms para dias
    const diferencaDias = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));
    
    // Garantir mínimo de 1 dia para evitar divisão por 0
    const diasReais = diferencaDias > 0 ? diferencaDias : 1;

    const atualizarDados = (total: number) => {
        setVisitCount(total);
        setStats({
          diasAtivos: diasReais,
          mediaDiaria: (total / diasReais).toFixed(1)
        });
        setIsLoaded(true);
    };

    // 2. CONTADOR GLOBAL
    const fetchGlobalCount = async () => {
      if (hasCounted.current) return;
      hasCounted.current = true;

      try {
        // Tenta usar o teu túnel primeiro (se já o criaste)
        // Se ainda não criaste o ficheiro route.ts, podes mudar aqui para a URL direta temporariamente
        const response = await fetch('/api/visitas', {
            cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          // Total = Base Fixa + Contador da Nuvem
          // Se vier 0 (erro), assume pelo menos 1
          const countNuvem = data.count || 1; 
          const totalReal = BASE_VISITAS + countNuvem;
          
          atualizarDados(totalReal);
        } else {
            // Se o túnel falhar, usa a base e calcula a média com a base
            console.warn("API Tunnel falhou, a usar base.");
            setDebugInfo('offline');
            atualizarDados(BASE_VISITAS);
        }
      } catch (error) {
        console.error("Erro de conexão:", error);
        setDebugInfo('blocked');
        atualizarDados(BASE_VISITAS);
      }
    };

    fetchGlobalCount();

  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 p-4 sm:p-6 flex flex-col items-center">
      
      <div className="w-full max-w-4xl mb-8 flex items-center justify-between gap-4">
        <Link href="/portal" className="inline-flex items-center gap-2 text-gray-600 hover:text-park-600 transition-colors font-medium">
           <ArrowLeftIcon className="w-4 h-4" />
           {t.back_to_portal}
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="max-w-4xl w-full">
        
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <ChartBarIcon className="w-10 h-10 text-park-600" />
            {t.est_title}
          </h1>
          <p className="text-gray-500">{t.est_subtitle}</p>
          {debugInfo && <p className="text-xs text-amber-500 mt-2">{t.est_note}: {debugInfo === 'offline' ? t.est_offline : t.est_blocked}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Card 1: Data Lançamento */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center hover:shadow-md transition-shadow">
            <div className="p-3 bg-park-50 rounded-full mb-4">
              <CalendarDaysIcon className="w-8 h-8 text-park-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t.est_online_since}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{DATA_LANCAMENTO.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</p>
            <p className="text-sm text-gray-400 mt-1">{t.est_active_days.replace('{n}', String(stats.diasAtivos))}</p>
          </div>

          {/* Card 2: Média Diária */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center hover:shadow-md transition-shadow">
            <div className="p-3 bg-green-50 rounded-full mb-4">
              <ArrowTrendingUpIcon className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t.est_daily_avg}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">
               {isLoaded ? stats.mediaDiaria : '...'}
            </p>
            <p className="text-sm text-gray-400 mt-1">{t.est_visits_per_day}</p>
          </div>

          {/* Card 3: Base Inicial */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center hover:shadow-md transition-shadow">
            <div className="p-3 bg-purple-50 rounded-full mb-4">
              <GlobeAltIcon className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t.est_base_history}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{BASE_VISITAS}</p>
            <p className="text-sm text-gray-400 mt-1">{t.est_before_counter}</p>
          </div>

        </div>

        <div className="bg-gradient-to-br from-park-900 to-park-950 rounded-3xl p-6 sm:p-12 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
             <div className="absolute bottom-10 right-10 w-40 h-40 bg-pink-500 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6 border border-white/20">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              {t.est_live_counter}
            </div>

            <h2 className="text-lg sm:text-xl text-park-200 font-medium mb-4">{t.est_total_visits}</h2>
            
            <div className="text-5xl sm:text-8xl font-black tracking-tight mb-4 tabular-nums">
              {isLoaded ? (
                <span className="animate-in fade-in zoom-in duration-500">
                  {visitCount.toLocaleString(locale)}
                </span>
              ) : (
                <span className="opacity-50 animate-pulse">....</span>
              )}
            </div>
            
            <p className="text-park-200 max-w-lg mx-auto text-sm sm:text-base">
              {t.est_synced}
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400">
          {t.est_footer}
        </div>

        {/* 🔥 MARKETING STATS SECTION */}
        <MarketingStats />

      </div>
    </div>
  );
}

// COMPONENTE EXTRA PARA MARKETING
function MarketingStats() {
  const { language } = useLanguage();
  const t = translations[language];
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/statistics/marketing')
      .then(res => res.json())
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="mt-12 text-center text-gray-400">{t.est_loading_marketing}</div>;
  if (!data || data.length === 0) return null; // Não mostra nada se não houver dados

  return (
    <div className="mt-12 bg-white rounded-3xl p-5 sm:p-8 shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <GlobeAltIcon className="w-6 h-6 text-park-600" />
        {t.est_customer_origin}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LADO ESQUERDO: LISTA */}
        <div className="space-y-4">
          {data.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center bg-park-100 text-park-700 font-bold rounded-full text-sm">
                  {idx + 1}
                </span>
                <span className="font-semibold text-gray-800">{item._id}</span>
              </div>
              <span className="text-xl font-black text-park-600">{item.count}</span>
            </div>
          ))}
        </div>

        {/* LADO DIREITO: NOTAS DE "OUTRO" */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 max-h-[400px] overflow-y-auto">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
             {t.est_notes_title}
          </h3>
          
          {data.flatMap(d => d.notes || []).length === 0 ? (
            <p className="text-sm text-gray-400 italic">{t.est_no_notes}</p>
          ) : (
            <ul className="space-y-3">
              {data.flatMap((d: any) => d.notes || []).map((note: string, idx: number) => (
                <li key={idx} className="text-sm text-gray-600 border-l-2 border-park-300 pl-3 italic">
                  "{note}"
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}   
