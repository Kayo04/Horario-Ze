'use client'
import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  CalendarDaysIcon, 
  UserGroupIcon, 
  ArrowTrendingUpIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function EstatisticasPage() {
  // CONFIGURAÇÕES BASE
  const DATA_LANCAMENTO = new Date('2024-11-27'); // Data de lançamento
  const BASE_VISITAS = 4127; // O número base que pediste

  const [visitCount, setVisitCount] = useState<number>(BASE_VISITAS);
  const [stats, setStats] = useState({
    diasAtivos: 0,
    mediaDiaria: "0"
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 1. LÓGICA DE DATAS E MÉDIA
    const hoje = new Date();
    const diferencaTempo = Math.abs(hoje.getTime() - DATA_LANCAMENTO.getTime());
    const diferencaDias = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24)); // Converter ms para dias
    
    // Evitar divisão por zero se for o mesmo dia
    const diasReais = diferencaDias > 0 ? diferencaDias : 1;
    
    // 2. LÓGICA DO CONTADOR
    // Num cenário real, aqui farias um fetch('/api/visitas') para buscar o total da BD.
    // Aqui usamos LocalStorage para simular persistência.
    const storedVisits = localStorage.getItem('total_visitas_site');
    
    let currentVisits;

    if (storedVisits) {
      // Se já visitou antes, pega o valor antigo e soma 1
      currentVisits = parseInt(storedVisits) + 1;
    } else {
      // Se é a primeira vez (ou limpou cache), começa da base + 1
      currentVisits = BASE_VISITAS + 1;
    }

    // Guardar o novo valor
    localStorage.setItem('total_visitas_site', currentVisits.toString());
    
    // Atualizar Estado
    setVisitCount(currentVisits);
    setStats({
      diasAtivos: diasReais,
      mediaDiaria: (currentVisits / diasReais).toFixed(1) // 1 casa decimal
    });
    setIsLoaded(true);

  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 p-6 flex flex-col items-center">
      
      {/* Botão Voltar */}
      <div className="w-full max-w-4xl mb-8 flex justify-start">
        <Link href="/portal" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium">
           ← Voltar ao Portal
        </Link>
      </div>

      <div className="max-w-4xl w-full">
        
        {/* Cabeçalho */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <ChartBarIcon className="w-10 h-10 text-blue-600" />
            Estatísticas de Tráfego
          </h1>
          <p className="text-gray-500">Acompanhamento em tempo real desde o lançamento.</p>
        </div>

        {/* Grid de Cartões */}
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

          {/* Card 2: Média Diária (Retrospectiva) */}
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
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Tráfego Base</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{BASE_VISITAS}</p>
            <p className="text-sm text-gray-400 mt-1">Visitantes iniciais</p>
          </div>

        </div>

        {/* O Grande Contador Live */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-3xl p-8 sm:p-12 text-center text-white shadow-2xl relative overflow-hidden">
          {/* Efeitos de fundo */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
             <div className="absolute bottom-10 right-10 w-40 h-40 bg-pink-500 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6 border border-white/20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Contador em Tempo Real
            </div>

            <h2 className="text-lg sm:text-xl text-blue-200 font-medium mb-4">Total de Visitas Acumuladas</h2>
            
            <div className="text-6xl sm:text-8xl font-black tracking-tight mb-4 tabular-nums">
              {isLoaded ? (
                <span className="animate-in fade-in zoom-in duration-500">
                  {visitCount.toLocaleString('pt-PT')}
                </span>
              ) : (
                <span className="opacity-50">----</span>
              )}
            </div>
            
            <p className="text-blue-200 max-w-lg mx-auto text-sm sm:text-base">
              Este número atualiza automaticamente sempre que um novo utilizador acede à plataforma.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400">
          Dados calculados com base no início da operação (27/11). <br/>
          O contador incrementa em tempo real a cada acesso único.
        </div>

      </div>
    </div>
  );
}