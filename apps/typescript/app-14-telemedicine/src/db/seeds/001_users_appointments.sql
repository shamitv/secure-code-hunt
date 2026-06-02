INSERT INTO users (username, password_hash, role) VALUES
  ('john_patient', 'PLACEHOLDER_john', 'PATIENT'),
  ('jane_patient', 'PLACEHOLDER_jane', 'PATIENT'),
  ('dr_house', 'PLACEHOLDER_house', 'DOCTOR'),
  ('admin', 'PLACEHOLDER_admin', 'ADMIN')
ON CONFLICT (username) DO NOTHING;

INSERT INTO appointments (patient_id, doctor_id, date, time_slot, status, doctor_notes) VALUES
  (1, 3, '2026-06-01', '09:00-09:30', 'SCHEDULED', 'Patient john exhibits mild seasonal allergy symptoms. Prescribed Claritin.'),
  (2, 3, '2026-06-02', '10:00-10:30', 'SCHEDULED', 'Patient jane reports chronic back pain. Referred to physical therapy.');
