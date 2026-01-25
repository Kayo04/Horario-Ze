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

    // Procura apenas reservas que tenham pelo menos 1 cliente na lista
    const reservations = await Reservation.find({ 
      "clients.0": { $exists: true } 
    }).sort({ datetime: -1 });

    // "Achata" os dados: Tira os clientes de dentro das reservas para uma lista plana
    const allClients: any[] = [];

    reservations.forEach((res: any) => {
      if (res.clients && Array.isArray(res.clients)) {
        res.clients.forEach((client: any) => {
          allClients.push({
            _id: client._id || Math.random().toString(), // Garante um ID
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone,
            dob: client.dob,
            checkInTime: client.checkInTime,
            // Guardamos também de que evento vieram para saberes
            visitDate: res.date || res.datetime?.split('T')[0],
            eventType: res.eventType
          });
        });
      }
    });

    return NextResponse.json(allClients);
  } catch (error: any) {
    console.error("Erro ao buscar clientes:", error);
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
}