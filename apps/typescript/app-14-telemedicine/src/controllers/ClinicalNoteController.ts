import { Request, Response } from "express";
import { ClinicalNoteService } from "../services/ClinicalNoteService";

export class ClinicalNoteController {
  constructor(private readonly clinicalNoteService: ClinicalNoteService) {}

  getNote = async (req: Request, res: Response) => {
    const note = await this.clinicalNoteService.getNoteById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: "Clinical note not found." });
    }
    return res.json(note);
  };

  createNote = async (req: Request, res: Response) => {
    const { appointmentId, patientId, doctorId, symptoms, diagnosis, prescribedMedicines, doctorComments } = req.body;
    if (!appointmentId || !patientId || !doctorId) {
      return res.status(400).json({ message: "appointmentId, patientId, doctorId required." });
    }
    const note = await this.clinicalNoteService.createNote({
      appointmentId: Number(appointmentId),
      patientId: Number(patientId),
      doctorId: Number(doctorId),
      symptoms: String(symptoms ?? ""),
      diagnosis: String(diagnosis ?? ""),
      prescribedMedicines: Array.isArray(prescribedMedicines) ? prescribedMedicines : [],
      doctorComments: String(doctorComments ?? "")
    });
    return res.status(201).json(note);
  };
}
