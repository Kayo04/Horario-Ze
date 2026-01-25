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

export default function EstatisticasPage() {
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
            setDebugInfo("Modo Offline / Base");
            atualizarDados(BASE_VISITAS);
        }
      } catch (error) {
        console.error("Erro de conexão:", error);
        setDebugInfo("Bloqueado ou Sem Rede");
        atualizarDados(BASE_VISITAS);
      }
    };

    fetchGlobalCount();

  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 p-6 flex flex-col items-center">
      
      <div className="w-full max-w-4xl mb-8 flex justify-start">
        <Link href="/portal" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium">
           <ArrowLeftIcon className="w-4 h-4" />
           Voltar ao Portal
        </Link>
      </div>

      <div className="max-w-4xl w-full">
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <ChartBarIcon className="w-10 h-10 text-blue-600" />
            Estatísticas Globais
          </h1>
          <p className="text-gray-500">Monitorização de tráfego em tempo real.</p>
          {debugInfo && <p className="text-xs text-amber-500 mt-2">Nota: {debugInfo}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Card 1: Data Lançamento */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center hover:shadow-md transition-shadow">
            <div className="p-3 bg-blue-50 rounded-full mb-4">
              <CalendarDaysIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Online Desde</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">27 Nov</p>
            <p className="text-sm text-gray-400 mt-1">{stats.diasAtivos} dias ativos</p>
          </div>

          {/* Card 2: Média Diária */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center hover:shadow-md transition-shadow">
            <div className="p-3 bg-green-50 rounded-full mb-4">
              <ArrowTrendingUpIcon className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Média Diária</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">
               {isLoaded ? stats.mediaDiaria : '...'}
            </p>
            <p className="text-sm text-gray-400 mt-1">visitas por dia</p>
          </div>

          {/* Card 3: Base Inicial */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center hover:shadow-md transition-shadow">
            <div className="p-3 bg-purple-50 rounded-full mb-4">
              <GlobeAltIcon className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Histórico Base</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{BASE_VISITAS}</p>
            <p className="text-sm text-gray-400 mt-1">Antes do contador</p>
          </div>

        </div>

        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-3xl p-8 sm:p-12 text-center text-white shadow-2xl relative overflow-hidden">
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
              Live Counter! 
            </div>

            <h2 className="text-lg sm:text-xl text-blue-200 font-medium mb-4">Total Global de Visitas</h2>
            
            <div className="text-6xl sm:text-8xl font-black tracking-tight mb-4 tabular-nums">
              {isLoaded ? (
                <span className="animate-in fade-in zoom-in duration-500">
                  {visitCount.toLocaleString('pt-PT')}
                </span>
              ) : (
                <span className="opacity-50 animate-pulse">....</span>
              )}
            </div>
            
            <p className="text-blue-200 max-w-lg mx-auto text-sm sm:text-base">
              Contagem sincronizada em todos os dispositivos.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400">
          Powered by Global Counter API • Base calculada a partir de 27/11/2025
        </div>

      </div>
    </div>
  );
}   
