    // Ficheiro: app/api/visitas/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const NAMESPACE = "thepark_pt_portal_secret"; 
  const KEY = "visitas_total_v3";

  try {
    // É o teu servidor (Next.js) a falar com o contador.
    // Os AdBlockers não conseguem ver isto a acontecer.
    const response = await fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${KEY}/up`, {
      cache: 'no-store', // Nunca guardar em memória
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ count: data.count });
    } else {
      return NextResponse.json({ count: 0, error: "Erro na API externa" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ count: 0, error: "Erro servidor" }, { status: 500 });
  }
}