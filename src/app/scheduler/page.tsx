// app/scheduler/page.tsx
'use client' // Assumindo que o teu SchedulerPrototype.tsx é interativo (precisa de 'use client')

import Link from 'next/link'
import SchedulerPrototype from '@/app/components/SchedulerPrototype' // 1. Importa o teu componente

export default function SchedulerPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Cabeçalho com título e botão de voltar */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Gerir Horários
          </h1>
          <Link
            href="/portal" // Link para voltar ao dashboard principal
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Voltar ao Portal
          </Link>
        </div>

        {/* O teu componente é renderizado aqui dentro da página */}
        <div className="rounded-lg shadow-md">
          {/* 2. O teu componente SchedulerPrototype vai aparecer aqui */}
          <SchedulerPrototype />
        </div>

      </div>
    </div>
  )
}