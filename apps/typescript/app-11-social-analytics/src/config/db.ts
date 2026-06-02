import { Pool } from "pg";
import { appConfig } from "./appConfig";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: appConfig.databaseUrl });
  }
  return pool;
}

export async function waitForDb(): Promise<void> {
  const p = getPool();
  for (let i = 0; i < 30; i++) {
    try {
      await p.query("SELECT 1");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Database did not become ready within timeout");
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS widgets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB DEFAULT '{}',
  value VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS dashboards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  layout JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS share_tokens (
  id SERIAL PRIMARY KEY,
  dashboard_id INTEGER NOT NULL REFERENCES dashboards(id),
  token VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL,
  widget_id INTEGER,
  event_type VARCHAR(50),
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS analytics_events_default PARTITION OF analytics_events DEFAULT;
`;

const SEED_SQL = `
INSERT INTO users (username, password, display_name) VALUES
  ('alice', 'alice123', 'Alice Analyst'),
  ('bob', 'bob123', 'Bob Brand'),
  ('carol', 'carol123', 'Carol Campaign')
ON CONFLICT (username) DO NOTHING;

INSERT INTO widgets (user_id, title, type, value) VALUES
  (1, 'Follower Growth', 'metric', '18.4%'),
  (1, 'Engagement Rate', 'metric', '7.9%'),
  (2, 'Campaign Reach', 'metric', '1.2M'),
  (2, 'Click-through Rate', 'metric', '3.2%'),
  (3, 'Impressions', 'metric', '892K'),
  (3, 'Conversion Rate', 'metric', '2.1%');

INSERT INTO dashboards (user_id, name, layout) VALUES
  (1, 'Q1 Campaign Report', '[{"widget":1},{"widget":2}]'),
  (1, 'Influencer Tracker', '[{"widget":1}]'),
  (2, 'Brand Lift Study', '[{"widget":3},{"widget":4}]'),
  (2, 'Weekly Snapshot', '[{"widget":3}]'),
  (3, 'Competitor Analysis', '[{"widget":5}]'),
  (3, 'Content Calendar', '[{"widget":5},{"widget":6}]');

INSERT INTO analytics_events (widget_id, event_type, payload, created_at) VALUES
  (1, 'like', '{"count":45}', '2026-01-15 10:00:00'),
  (1, 'comment', '{"count":12,"text":"Great engagement this week!","sentiment":"positive"}', '2026-01-15 10:30:00'),
  (1, 'share', '{"count":8}', '2026-01-16 14:00:00'),
  (2, 'like', '{"count":120}', '2026-02-01 09:00:00'),
  (2, 'comment', '{"count":34,"text":"Loving the new campaign visuals","sentiment":"positive"}', '2026-02-01 09:15:00'),
  (3, 'impression', '{"count":5000}', '2026-02-10 11:00:00'),
  (3, 'like', '{"count":230}', '2026-02-11 08:00:00'),
  (4, 'like', '{"count":67}', '2026-03-05 16:00:00'),
  (4, 'comment', '{"count":8,"text":"Need to optimize this funnel","sentiment":"neutral"}', '2026-03-05 16:30:00'),
  (5, 'impression', '{"count":12000}', '2026-04-01 12:00:00'),
  (5, 'like', '{"count":450}', '2026-04-02 10:00:00'),
  (5, 'comment', '{"count":23,"text":"competitor is dropping the ball here","sentiment":"negative"}', '2026-04-02 10:30:00'),
  (6, 'like', '{"count":89}', '2026-04-15 15:00:00'),
  (6, 'share', '{"count":15}', '2026-04-16 09:00:00'),
  (1, 'comment', '{"count":5,"text":"keep up the great work team!","sentiment":"positive"}', '2026-05-01 08:00:00'),
  (2, 'impression', '{"count":8000}', '2026-05-10 10:00:00'),
  (3, 'comment', '{"count":18,"text":"the new ad format is really working","sentiment":"positive"}', '2026-05-12 14:00:00'),
  (4, 'share', '{"count":22}', '2026-05-20 11:00:00'),
  (5, 'like', '{"count":310}', '2026-06-01 09:00:00'),
  (6, 'impression', '{"count":15000}', '2026-06-05 13:00:00');
`;

export async function runMigrations(): Promise<void> {
  const p = getPool();
  for (const stmt of SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await p.query(stmt);
  }
  for (const stmt of SEED_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await p.query(stmt);
  }
}
