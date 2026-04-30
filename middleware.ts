import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Obtenemos la cookie que definimos en el loginAction
  const userId = request.cookies.get('session_user_id')?.value;

  const { pathname } = request.nextUrl;

  // Definimos las rutas que son públicas
  // Para tu app simplificada, solo /login es pública
  const isPublicRoute = pathname.startsWith('/login');

  // 1. Si el usuario NO está logueado y trata de entrar a una ruta privada
  if (!userId && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Si el usuario YA está logueado y trata de entrar al login
  if (userId && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// El matcher evita que el middleware se ejecute en archivos estáticos o APIs
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}