'use client'
import { useLanguage } from '@/context/LanguageContext'

// Botão para trocar a língua, com o texto "PT | EN" (substitui as bandeiras).
// variant="light" para fundos brancos/claros, variant="dark" para fundos teal (ex. cabeçalho do portal).
export default function LanguageSwitcher({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { language, setLanguage } = useLanguage()
  const escuro = variant === 'dark'

  const opcoes = [
    { code: 'pt' as const, label: 'PT', title: 'Português' },
    { code: 'en' as const, label: 'EN', title: 'English' },
  ]

  return (
    <div
      role="group"
      aria-label="Língua / Language"
      className={`inline-flex shrink-0 rounded-full p-1 text-sm font-bold ${
        escuro ? 'bg-white/15 border border-white/30' : 'bg-park-50 border border-park-200'
      }`}
    >
      {opcoes.map(o => {
        const ativo = language === o.code
        return (
          <button
            key={o.code}
            type="button"
            onClick={() => setLanguage(o.code)}
            title={o.title}
            aria-pressed={ativo}
            className={`min-w-[2.75rem] px-3 py-1.5 rounded-full transition-colors ${
              ativo
                ? escuro
                  ? 'bg-white text-park-700 shadow-sm'
                  : 'bg-park-600 text-white shadow-sm'
                : escuro
                  ? 'text-white/80 hover:text-white'
                  : 'text-park-700 hover:bg-park-100'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
