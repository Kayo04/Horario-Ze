import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Reservation from '@/models/Reservation';

export async function GET(req: Request) {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) throw new Error('MONGODB_URI not defined');

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Ler o parâmetro 'range' do URL (ex: ?range=30d)
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'all';

    // Construir o filtro de data
    let dateFilter: any = {};
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"

    if (range === 'today') {
        // Começa pela data de hoje
        dateFilter = { 
            $or: [
                { datetime: { $regex: `^${todayStr}` } },
                { date: todayStr }
            ]
        };
    } else if (range !== 'all') {
        let days = 0;
        if (range === '7d') days = 7;
        if (range === '30d') days = 30;
        if (range === '90d') days = 90;
        if (range === '1y') days = 365;

        // Calcular a data limite no passado
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - days);
        const pastDateStr = pastDate.toISOString().split('T')[0];

        // Comparação de Strings ISO funciona bem para datas (>= data passada)
        dateFilter = {
            $or: [
                { datetime: { $gte: pastDateStr } },
                { date: { $gte: pastDateStr } }
            ]
        };
    }

    // Buscar reservas com Marketing Source E com o filtro de data
    const query = {
        marketingSource: { $exists: true, $ne: "" },
        ...dateFilter
    };

    const reservations = await Reservation.find(query);

    // Processar e contar
    const statsMap: Record<string, number> = {};

    reservations.forEach((res: any) => {
      let source = res.marketingSource || "";
      source = source.toLowerCase().trim();

      // Normalizar nomes
      if (source.includes('tiktok')) source = 'TikTok';
      else if (source.includes('insta')) source = 'Instagram';
      else if (source.includes('google')) source = 'Google';
      else if (source.includes('face')) source = 'Facebook';
      else if (source.includes('amigo') || source.includes('fam')) source = 'Amigos/Família';
      else if (source.includes('rua') || source.includes('passou')) source = 'Passou na Rua';
      else {
          // Capitalizar a primeira letra para ficar bonito
          source = source.charAt(0).toUpperCase() + source.slice(1);
      }

      if (statsMap[source]) statsMap[source]++;
      else statsMap[source] = 1;
    });

    const sortedStats = Object.entries(statsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(sortedStats);
  } catch (error: any) {
    console.error("Erro estatisticas:", error);
    return NextResponse.json({ error: 'Erro ao gerar estatísticas: ' + error.message }, { status: 500 });
  }
}