export interface ClinicalNote {
  noteId: string;
  appointmentId: number;
  patientId: number;
  doctorId: number;
  symptoms: string;
  diagnosis: string;
  prescribedMedicines: string[];
  doctorComments: string;
  createdAt: Date;
  updatedAt: Date;
}
