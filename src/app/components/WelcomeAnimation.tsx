'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

type Period = 'morning' | 'afternoon' | 'night'

const getPeriod = (hour: number): Period => {
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 20) return 'afternoon'
  return 'night'
}

const THEMES: Record<Period, { bg: string; text: string; sub: string }> = {
  morning: {
    bg: 'linear-gradient(180deg, #fde68a 0%, #fdba74 45%, #f9a8d4 100%)',
    text: '#7c2d12',
    sub: '#9a3412',
  },
  afternoon: {
    bg: 'linear-gradient(180deg, #38bdf8 0%, #7dd3fc 50%, #e0f2fe 100%)',
    text: '#0c4a6e',
    sub: '#075985',
  },
  night: {
    bg: 'linear-gradient(180deg, #020617 0%, #1e1b4b 55%, #312e81 100%)',
    text: '#e0e7ff',
    sub: '#a5b4fc',
  },
}

// Duração total da animação antes de sair (ms)
const TOTAL_DURATION = 3400

export default function WelcomeAnimation({ name, onFinish }: { name: string; onFinish: () => void }) {
  const { language } = useLanguage()
  const t = translations[language]
  const [leaving, setLeaving] = useState(false)

  const period = useMemo(() => getPeriod(new Date().getHours()), [])
  const theme = THEMES[period]
  const firstName = name.trim().split(' ')[0] || name

  const greeting =
    period === 'morning' ? t.welcome_morning :
    period === 'afternoon' ? t.welcome_afternoon :
    t.welcome_night

  // Estrelas com posições fixas para a noite
  const stars = useMemo(
    () => Array.from({ length: 40 }, () => ({
      top: Math.random() * 70,
      left: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 2,
    })),
    []
  )

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), TOTAL_DURATION - 500)
    const finishTimer = setTimeout(onFinish, TOTAL_DURATION)
    return () => {
      clearTimeout(leaveTimer)
      clearTimeout(finishTimer)
    }
  }, [onFinish])

  return (
    <div
      className={`welcome-root fixed inset-0 z-[100] overflow-hidden flex items-center justify-center ${leaving ? 'welcome-leave' : ''}`}
      style={{ background: theme.bg }}
    >
      <style>{`
        .welcome-root { animation: welcomeIn 0.5s ease-out both; }
        .welcome-leave { animation: welcomeOut 0.5s ease-in both; }
        @keyframes welcomeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes welcomeOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(1.05); } }

        .welcome-sun {
          animation: sunRise 1.4s cubic-bezier(.2,.8,.2,1) both, sunGlow 3s ease-in-out 1.4s infinite;
        }
        @keyframes sunRise { from { transform: translateY(120px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes sunGlow { 0%,100% { filter: drop-shadow(0 0 30px rgba(255,200,80,.7)); } 50% { filter: drop-shadow(0 0 60px rgba(255,200,80,.95)); } }
        .welcome-rays { animation: spin 18s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .welcome-moon { animation: moonIn 1.4s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes moonIn { from { transform: translateY(-60px) rotate(-30deg); opacity: 0; } to { transform: translateY(0) rotate(0); opacity: 1; } }
        .welcome-star { animation: twinkle 2s ease-in-out infinite; }
        @keyframes twinkle { 0%,100% { opacity: .2; } 50% { opacity: 1; } }

        .welcome-cloud { animation: drift 12s linear infinite; }
        @keyframes drift { from { transform: translateX(-30vw); } to { transform: translateX(110vw); } }

        .welcome-greeting { animation: riseIn .7s cubic-bezier(.2,.8,.2,1) .6s both; }
        .welcome-letter { display: inline-block; animation: letterIn .5s cubic-bezier(.2,.8,.2,1.4) both; }
        @keyframes riseIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes letterIn { from { opacity: 0; transform: translateY(30px) scale(.6); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .welcome-sub { animation: riseIn .6s ease-out 1.9s both; }
        .welcome-bar { animation: fillBar ${TOTAL_DURATION - 900}ms linear .4s both; }
        @keyframes fillBar { from { width: 0%; } to { width: 100%; } }
        /* --- Tamanhos responsivos: acompanham largura E altura do ecrã --- */
        .welcome-root {
          padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
                   max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
        }
        .welcome-orb {
          width: clamp(56px, min(24vw, 16vh), 128px);
          height: clamp(56px, min(24vw, 16vh), 128px);
          margin-bottom: clamp(28px, 7vh, 64px);
        }
        .welcome-moon > div:first-child { box-shadow: 0 0 60px rgba(199,210,254,.6); }
        .welcome-greeting-size { font-size: clamp(1.125rem, min(5.5vw, 4.5vh), 2rem); line-height: 1.2; }
        .welcome-name {
          margin-top: .25em;
          font-size: clamp(2rem, min(13vw, 11vh), 5rem);
          line-height: 1.05;
          max-width: 100%;
          overflow-wrap: anywhere;
        }
        .welcome-sub-size { margin-top: clamp(12px, 3vh, 24px); font-size: clamp(.8125rem, 3.5vw, 1rem); }
        .welcome-bar-track { margin-top: clamp(10px, 2vh, 16px); height: 4px; width: clamp(120px, 40vw, 200px); }
        .welcome-cloud { width: clamp(100px, 30vw, 224px); }

        /* Telemóvel deitado / ecrãs muito baixos: tudo mais compacto */
        @media (max-height: 480px) {
          .welcome-orb { margin-bottom: 20px; }
          .welcome-sub-size { margin-top: 8px; }
        }

        /* Quem prefere menos movimento: sem saltos nem rotações */
        @media (prefers-reduced-motion: reduce) {
          .welcome-root *, .welcome-root { animation-duration: .01ms !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; }
          .welcome-bar { animation: none !important; width: 100%; }
        }
      `}</style>

      {/* Céu: estrelas à noite, nuvens durante o dia */}
      {period === 'night' ? (
        stars.map((s, i) => (
          <span
            key={i}
            className="welcome-star absolute rounded-full bg-white"
            style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
          />
        ))
      ) : (
        <>
          <div className="welcome-cloud absolute top-[12%] h-12 bg-white/70 rounded-full blur-sm" style={{ animationDelay: '-3s' }} />
          <div className="welcome-cloud absolute top-[78%] h-14 bg-white/50 rounded-full blur-sm" style={{ animationDuration: '16s', animationDelay: '-9s' }} />
        </>
      )}

      {/* Sol/Lua + texto numa só coluna, para nunca se sobreporem em ecrãs pequenos */}
      <div className="welcome-stack relative flex flex-col items-center text-center w-full max-w-3xl">
        <div className="welcome-orb relative">
          {period === 'night' ? (
            <div className="welcome-moon relative w-full h-full overflow-hidden rounded-full">
              <div className="absolute inset-0 rounded-full bg-park-50" />
              <div className="absolute w-full h-full rounded-full" style={{ top: '-10%', left: '23%', background: '#1e1b4b' }} />
            </div>
          ) : (
            <div className="welcome-sun relative w-full h-full">
              <svg className="welcome-rays absolute" style={{ inset: '-36%' }} viewBox="0 0 100 100">
                {Array.from({ length: 12 }).map((_, i) => (
                  <line
                    key={i}
                    x1="50" y1="6" x2="50" y2="16"
                    stroke={period === 'morning' ? '#f97316' : '#facc15'}
                    strokeWidth="3" strokeLinecap="round"
                    transform={`rotate(${i * 30} 50 50)`}
                  />
                ))}
              </svg>
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: period === 'morning' ? 'radial-gradient(circle, #fef08a, #fb923c)' : 'radial-gradient(circle, #fef9c3, #facc15)' }}
              />
            </div>
          )}
        </div>

        <p className="welcome-greeting welcome-greeting-size font-medium" style={{ color: theme.sub }}>
          {greeting},
        </p>
        <h1 className="welcome-name font-extrabold tracking-tight" style={{ color: theme.text }}>
          {firstName.split('').map((ch, i) => (
            <span key={i} className="welcome-letter" style={{ animationDelay: `${1 + i * 0.07}s` }}>
              {ch}
            </span>
          ))}
          <span className="welcome-letter" style={{ animationDelay: `${1 + firstName.length * 0.07}s` }}>!</span>
        </h1>
        <p className="welcome-sub welcome-sub-size" style={{ color: theme.sub }}>
          {t.welcome_subtitle}
        </p>
        <div className="welcome-sub welcome-bar-track rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.35)' }}>
          <div className="welcome-bar h-full rounded-full" style={{ background: theme.text }} />
        </div>
      </div>
    </div>
  )
}
