CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('PATIENT', 'DOCTOR', 'ADMIN')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES users(id),
  doctor_id INTEGER REFERENCES users(id),
  date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL DEFAULT '09:00-09:30',
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
  doctor_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescription_log (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER REFERENCES appointments(id),
  patient_id INTEGER REFERENCES users(id),
  doctor_id INTEGER REFERENCES users(id),
  medicine VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
