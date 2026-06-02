export interface Appointment {
  id: number;
  patientId: number;
  doctorId: number;
  date: string;
  timeSlot: string;
  status: string;
  doctorNotes: string;
}
