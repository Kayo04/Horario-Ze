// app/layout.tsx
import './globals.css'
import Providers from '@/app/providers' // <-- IMPORTAR
import { Analytics } from "@vercel/analytics/next"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt">
      <body>
        <Analytics/>
        <Providers> {/* <-- ENVOLVER */}
          {children}
        </Providers>
      </body>
    </html>
  )
}