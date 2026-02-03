import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Reservation from '@/models/Reservation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) throw new Error('MONGODB_URI not defined');

        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(MONGODB_URI);
        }

        // 1. Buscar todas as reservas que tenham clientes
        // Trazemos apenas os campos necessários para ser mais leve
        const reservations = await Reservation.find({
            "clients.0": { $exists: true }
        }).select('customerName clients');

        // 2. Processar dados em memória (mais flexível que agregação complexa)
        const referralMap = new Map<string, Set<string>>();

        reservations.forEach((res: any) => {
            // Normalizar nome do organizador (Booker)
            const bookerName = res.customerName?.trim();
            if (!bookerName) return;

            if (!referralMap.has(bookerName)) {
                referralMap.set(bookerName, new Set());
            }

            // Adicionar emails únicos dos convidados
            if (res.clients && Array.isArray(res.clients)) {
                res.clients.forEach((client: any) => {
                    if (client.email) {
                        // Opcional: ignorar se o email for igual ao do booker (se tivéssemos o email do booker)
                        referralMap.get(bookerName)?.add(client.email.toLowerCase().trim());
                    }
                });
            }
        });

        // 3. Converter para array e ordenar
        const leaderboard = Array.from(referralMap.entries()).map(([name, emails]) => ({
            name,
            totalBrought: emails.size
        }));

        // Ordenar do maior para o menor
        leaderboard.sort((a, b) => b.totalBrought - a.totalBrought);

        // Retornar top 50
        return NextResponse.json(leaderboard.slice(0, 50));

    } catch (error: any) {
        console.error("Erro API Referrals:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
