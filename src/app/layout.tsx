// app/layout.tsx
import './globals.css'
import Providers from '@/app/providers' // <-- IMPORTAR

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt">
      <body>
        <Providers> {/* <-- ENVOLVER */}
          {children}
        </Providers>
      </body>
    </html>
  )
}