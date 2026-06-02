import { Collection } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { ClinicalNote } from "../models/ClinicalNote";

export class ClinicalNoteService {
  constructor(private readonly collection: Collection<ClinicalNote>) {}

  // VULNERABILITY A01: Note lookup by ID without patient/doctor ownership checks.
  async getNoteById(noteId: string): Promise<ClinicalNote | null> {
    return this.collection.findOne({ noteId });
  }

  async createNote(note: Omit<ClinicalNote, "noteId" | "createdAt" | "updatedAt">): Promise<ClinicalNote> {
    const doc: ClinicalNote = {
      ...note,
      noteId: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.collection.insertOne(doc);
    return doc;
  }
}
