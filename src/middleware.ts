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
  
  // 🔥 ALTERAÇÃO AQUI: Definimos que as rotas de checkin são públicas
  // Isto permite que o cliente aceda ao formulário no telemóvel sem login
  const isPublicPath = pathname.startsWith('/checkin') || pathname.startsWith('/api/checkin')

  // --- REGRAS DE REDIRECIONAMENTO ---

  // REGRA A: Proteger páginas privadas
  // Se NÃO é a página de login, E NÃO é uma rota pública (checkin), E NÃO tem token
  if (!isLoginPage && !isPublicPath && !token) {
    // Redireciona-o para a página de login (/)
    const url = new URL('/', req.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // REGRA B: Impedir loop de login
  // Se está na página de Login (/) E o utilizador JÁ está logado
  if (isLoginPage && token) {
    // Redireciona-o para o portal
    return NextResponse.redirect(new URL('/portal', req.url))
  }
  
  // REGRA C: Proteger páginas de Admin
  // Se ele tenta aceder a /funcionarios E NÃO é um admin
  if (pathname.startsWith('/funcionarios') && token?.role !== 'admin') {
      // Redireciona-o para o portal com um aviso
      return NextResponse.redirect(new URL('/portal?error=NaoAutorizado', req.url))
  }

  // Se nenhuma regra for ativada, deixa o utilizador passar
  return NextResponse.next()
}

// Configuração:
export const config = { 
  matcher: [
    /*
     * Correr o middleware em TODAS as rotas, exceto:
     * - /api/auth/... (para o login funcionar)
     * - /_next/static (ficheiros estáticos)
     * - /_next/image (imagens)
     * - favicon.ico (o ícone)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ] 
}