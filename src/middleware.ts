// middleware.ts
import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

export async function middleware(req: NextRequest) {
  // 1. Obter o token do utilizador (se existir)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  
  // 2. Ver o caminho que o utilizador está a tentar aceder
  const { pathname } = req.nextUrl

  // 3. DEFINIÇÕES DE PÁGINAS
  const isLoginPage = pathname === '/'
  
  // Rotas públicas (Check-in do cliente)
  const isPublicPath = pathname.startsWith('/checkin') || pathname.startsWith('/api/checkin')

  // --- REGRAS DE REDIRECIONAMENTO ---

  // REGRA A: Proteger páginas privadas
  // Se NÃO é a página de login, E NÃO é uma rota pública, E NÃO tem token -> Login
  if (!isLoginPage && !isPublicPath && !token) {
    const url = new URL('/', req.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // REGRA B: Impedir loop de login
  // Se está na página de Login E o utilizador JÁ está logado -> Portal
  if (isLoginPage && token) {
    return NextResponse.redirect(new URL('/portal', req.url))
  }
  
  // REGRA C: Proteger páginas de Admin
  // 🔥 ALTERAÇÃO AQUI: Adicionei "|| pathname.startsWith('/portal/clientes')"
  // Agora protege tanto os Funcionários como a Base de Dados de Clientes
  if ( (pathname.startsWith('/funcionarios') || pathname.startsWith('/portal/clientes')) && token?.role !== 'admin') {
      // Redireciona-o para o portal com um aviso
      return NextResponse.redirect(new URL('/portal?error=NaoAutorizado', req.url))
  }

  // Se nenhuma regra for ativada, deixa o utilizador passar
  return NextResponse.next()
}

// Configuração:
export const config = { 
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ] 
}