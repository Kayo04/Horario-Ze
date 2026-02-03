import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Reservation from '@/models/Reservation';

export async function GET() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) throw new Error('MONGODB_URI not defined');

        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(MONGODB_URI);
        }

        // Agregação para contar fontes de marketing
        const stats = await Reservation.aggregate([
            {
                $match: {
                    marketingSource: { $exists: true, $ne: "" }
                }
            },
            {
                $group: {
                    _id: "$marketingSource",
                    count: { $sum: 1 },
                    // Coletar notas se for "Outro"
                    notes: {
                        $push: {
                            $cond: [
                                { $eq: ["$marketingSource", "Outro"] },
                                "$marketingNotes",
                                "$$REMOVE"
                            ]
                        }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error("Erro estatisticas marketing:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
