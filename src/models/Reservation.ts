import mongoose, { Schema, Document } from 'mongoose';

// Definimos uma interface flexível que aceita o formato antigo e o novo
interface IReservationDocument extends Document {
  eventType: string;
  // Campos do formato antigo (que estão na BD)
  date?: string; 
  startTime?: string;
  endTime?: string;
  people?: number;
  
  // Campos do formato novo/types
  datetime?: string;
  adults?: number;
  children?: number;
  
  customerName?: string;
  marketingSource?: string;

  // 🔥 NOVO CAMPO: Lista de clientes que fizeram check-in
  clients?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dob: string;
    checkInTime: Date;
  }[];
}

const ReservationSchema = new Schema<IReservationDocument>({
  eventType: { type: String, required: true },
  
  // Permitir que estes campos existam
  date: { type: String },      // ex: "2026-01-25"
  startTime: { type: String }, // ex: "17:00"
  endTime: { type: String },
  people: { type: Number },

  // Campos novos
  datetime: { type: String },
  adults: { type: Number },
  children: { type: Number },
  
  customerName: { type: String },
  marketingSource: { type: String },

  // 🔥 NOVO CAMPO NO SCHEMA
  clients: [{
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    dob: String,
    checkInTime: { type: Date, default: Date.now } // Guarda a hora do registo automaticamente
  }],
}, {
  timestamps: true,
  strict: false // IMPORTANTE: Isto permite ler campos que não definimos rigorosamente
});

// Virtual para garantir que o frontend recebe sempre 'datetime', mesmo que venha do formato antigo
ReservationSchema.virtual('computedDatetime').get(function() {
  if (this.datetime) return this.datetime;
  if (this.date && this.startTime) return `${this.date}T${this.startTime}`;
  return null;
});

// Virtual para garantir que o frontend recebe 'people' total
ReservationSchema.virtual('totalPax').get(function() {
  if (this.people) return this.people;
  return (this.adults || 0) + (this.children || 0);
});

// Configurar para incluir virtuais quando converte para JSON
ReservationSchema.set('toJSON', { virtuals: true });
ReservationSchema.set('toObject', { virtuals: true });

// 🔥 ESTA É A PARTE IMPORTANTE:
// Se o modelo já existir na memória (cache), apagamo-lo para forçar o Mongoose a usar o novo Schema
if (mongoose.models.Reservation) {
  delete mongoose.models.Reservation;
}

export default mongoose.model<IReservationDocument>('Reservation', ReservationSchema);