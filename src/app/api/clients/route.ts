import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Reservation from '@/models/Reservation';

// 🔥 ESTAS DUAS LINHAS OBRIGAM A ATUALIZAR SEMPRE (SEM CACHE)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) throw new Error('MONGODB_URI not defined');

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Buscar todas as reservas que tenham clientes
    const allReservations = await Reservation.find({
      "clients.0": { $exists: true }
    }).sort({ createdAt: -1 });

    const clientsMap = new Map<string, any>();

    allReservations.forEach((res: any) => {
      // Tenta apanhar a data de vários sítios
      let finalDate = "Data N/A";
      if (res.date) finalDate = res.date;
      else if (res.datetime) finalDate = res.datetime.split('T')[0];

      if (res.clients && Array.isArray(res.clients)) {
        res.clients.forEach((client: any) => {
          if (!client.email) return;

          const emailKey = client.email.trim().toLowerCase();

          if (clientsMap.has(emailKey)) {
            // Se já existe, atualizamos a contagem e verificamos se esta visita é mais recente
            const existing = clientsMap.get(emailKey);
            existing.totalVisits += 1;

            // Atualizar a última visita se esta for mais recente
            if (new Date(finalDate) > new Date(existing.visitDate)) {
              existing.visitDate = finalDate;
              existing.eventType = res.eventType || "Geral"; // Atualiza o tipo da última visita
            }

          } else {
            // Se é novo, adicionamos ao mapa
            clientsMap.set(emailKey, {
              _id: client._id || Math.random().toString(),
              firstName: client.firstName,
              lastName: client.lastName,
              email: client.email,
              phone: client.phone,
              dob: client.dob,
              checkInTime: client.checkInTime,
              visitDate: finalDate,
              eventType: res.eventType || "Geral",
              totalVisits: 1 // Primeira visita
            });
          }
        });
      }
    });

    // Converter Map para Array
    const uniqueClients = Array.from(clientsMap.values());

    return NextResponse.json(uniqueClients);

  } catch (error: any) {
    console.error("Erro API Clientes:", error);
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
}