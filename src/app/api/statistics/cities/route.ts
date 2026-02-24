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

        // Buscar reservas que tenham clientes (independentemente de marketingSource) e com o filtro de data
        const query = {
            clients: { $exists: true, $not: { $size: 0 } },
            ...dateFilter
        };

        const reservations = await Reservation.find(query);

        // Processar e contar
        const statsMap: Record<string, number> = {};

        reservations.forEach((res: any) => {
            if (!res.clients) return;

            res.clients.forEach((client: any) => {
                let city = client.city || "Não Informado";
                city = city.trim();

                if (city.toLowerCase() === "nao informado" || city === "") {
                    city = "Não Informado";
                } else {
                    // Capitalizar a primeira letra das palavras principais
                    city = city.toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, (letter: string) => letter.toUpperCase());
                }

                if (statsMap[city]) statsMap[city]++;
                else statsMap[city] = 1;
            });
        });

        const sortedStats = Object.entries(statsMap)
            // Ocultar a linha "Não Informado"
            .filter(([name]) => name !== "Não Informado")
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        return NextResponse.json(sortedStats);
    } catch (error: any) {
        console.error("Erro estatisticas de cidades:", error);
        return NextResponse.json({ error: 'Erro ao gerar estatísticas de cidades: ' + error.message }, { status: 500 });
    }
}
