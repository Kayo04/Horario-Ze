'use client'
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChartBarIcon, ArrowLeftIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

type StatItem = {
  name: string;
  count: number;
};

// Cores vibrantes para o gráfico
const COLORS = [
  '#8B5CF6', // Roxo (TikTok/Base)
  '#EC4899', // Rosa (Instagram)
  '#10B981', // Verde (Google)
  '#F59E0B', // Laranja
  '#3B82F6', // Azul
  '#EF4444', // Vermelho
  '#6366F1', // Indigo
  '#9CA3AF'  // Cinza (Outros)
];

export default function StatisticsPage() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [cityStats, setCityStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('all'); // 'today', '7d', '30d', '90d', '1y', 'all'

  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    fetchStats();
  }, [range]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fazemos o fetch para as duas APIs em paralelo
      const [resStats, resCities] = await Promise.all([
          fetch(`/api/statistics?range=${range}`),
          fetch(`/api/statistics/cities?range=${range}`)
      ]);

      if (resStats.ok) {
        const dataStats = await resStats.json();
        setStats(dataStats);
      }
      
      if (resCities.ok) {
        const dataCities = await resCities.json();
        setCityStats(dataCities);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalMarketing = stats.reduce((acc, curr) => acc + curr.count, 0);
  const totalCities = cityStats.reduce((acc, curr) => acc + curr.count, 0);

  // --- Função para gerar o CSS do Gráfico Circular (Conic Gradient) ---
  const getPieChartStyle = () => {
    if (totalMarketing === 0) return { background: '#E5E7EB' }; // Cinza se vazio

    let currentAngle = 0;
    const gradientParts = stats.map((item, index) => {
      const color = COLORS[index % COLORS.length];
      const percentage = (item.count / totalMarketing) * 100;
      const start = currentAngle;
      const end = currentAngle + percentage;
      currentAngle = end;
      return `${color} ${start}% ${end}%`;
    });

    return { 
        background: `conic-gradient(${gradientParts.join(', ')})`,
        borderRadius: '50%'
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center gap-4 mb-6">
          <Link href="/portal/checkin" className="inline-flex items-center text-sm text-park-600 hover:text-park-800 font-medium transition-colors">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {t.stats_back_checkin}
          </Link>
          
          <div className="flex gap-2">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-park-100 text-park-600 rounded-2xl shadow-sm">
              <ChartBarIcon className="w-8 h-8" />
            </div>
                <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{t.stats_title}</h1>
              <p className="text-gray-500">{t.stats_subtitle}</p>
            </div>
          </div>

            {/* SELETOR DE TEMPO */}
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 grid grid-cols-3 md:inline-flex w-full md:w-auto">
              {[
                  { id: 'today', label: t.stats_filter_today },
                  { id: '7d', label: t.stats_filter_7days },
                  { id: '30d', label: t.stats_filter_30days },
                  { id: '90d', label: t.stats_filter_3months },
                  { id: '1y', label: t.stats_filter_year },
                  { id: 'all', label: t.stats_filter_all }
              ].map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => setRange(opt.id)}
                        className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap
                            ${range === opt.id 
                                ? 'bg-park-600 text-white shadow-md' 
                                : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>

        {/* CONTEÚDO */}
        {loading ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-4 border-park-200 border-t-park-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">{t.loading_data}</p>
            </div>
        ) : (
            <div className="space-y-6">
              
              {/* SESSÃO DE MARKETING */}
              {/* SESSÃO DE MARKETING */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. GRÁFICO CIRCULAR & LEGENDA */}
                <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 w-full text-left">{t.stats_marketing_dist}</h3>
                    
                    {stats.length === 0 ? (
                        <div className="text-center py-10 w-full text-gray-500">{t.stats_no_marketing_data}</div>
                    ) : (
                        <div className="flex flex-col md:flex-row items-center gap-8 w-full">
                            {/* O Gráfico */}
                            <div className="relative w-64 h-64 shadow-inner" style={getPieChartStyle()}>
                                {/* Centro branco para fazer o efeito "Donut" */}
                                <div className="absolute inset-0 m-auto w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold text-gray-800">{totalMarketing}</span>
                                    <span className="text-xs text-gray-500 uppercase font-bold">{t.stats_total}</span>
                                </div>
                            </div>

                            {/* Legenda */}
                            <div className="flex-1 space-y-3 w-full">
                                {stats.map((item, index) => (
                                    <div key={item.name} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                            ></div>
                                            <span className="font-medium text-gray-700">{item.name}</span>
                                        </div>
                                        <span className="text-gray-500">{((item.count / totalMarketing) * 100).toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RANKING BARRAS P/ MARKETING */}
              <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-8">{t.stats_top_marketing}</h3>
                
                <div className="flex flex-col gap-6">
                  {stats.length === 0 ? (
                         <div className="text-center py-10 text-gray-500">{t.stats_no_marketing_data}</div>
                    ) : (
                        <div className="space-y-5">
                            {stats.map((item, index) => {
                                const percentage = ((item.count / totalMarketing) * 100).toFixed(1);
                                const color = COLORS[index % COLORS.length];
                                
                                return (
                                    <div key={item.name}>
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="font-bold text-gray-800 text-md flex items-center gap-2">
                                                <span className="text-gray-400 text-sm">#{index + 1}</span> 
                                                {item.name}
                                            </span>
                                            <span className="text-gray-600 font-medium">
                                                {item.count} <span className="text-xs text-gray-400">({percentage}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                            <div 
                                                className="h-3 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${percentage}%`, backgroundColor: color }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
              </div>
              </div>

              {/* SESSÃO DE CIDADES */}
              <div className="col-span-1 lg:col-span-2 mt-2">
              <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                  <MapPinIcon className="w-6 h-6 text-park-600" />
                  <h3 className="text-lg font-bold text-gray-800">{t.stats_top_cities}</h3>
                </div>
                
                <div className="flex flex-col gap-6">
                  {cityStats.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">{t.stats_no_cities_data}</div>
                    ) : (
                        <div className="space-y-5 max-h-[500px] overflow-y-auto pr-4">
                            {cityStats.map((item, idx) => {
                                // Usa a mesma paleta de cores ou tons mais neutros se quiser
                                const percentage = ((item.count / totalCities) * 100).toFixed(1);
                                const color = COLORS[idx % COLORS.length]; 
                                
                                return (
                                    <div key={item.name}>
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="font-bold text-gray-800 text-md flex items-center gap-2">
                                                <span className="text-gray-400 text-sm">#{idx + 1}</span> 
                                                {item.name}
                                            </span>
                                            <span className="text-gray-600 font-medium">
                                                {item.count} {t.stats_people} <span className="text-xs text-gray-400">({percentage}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                            <div 
                                                className="h-3 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${percentage}%`, backgroundColor: color }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
              </div>
            </div>
            
            </div>
        )}
      </div>
    </div>
  );
}