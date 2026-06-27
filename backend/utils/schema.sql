CREATE TABLE IF NOT EXISTS buildings (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  subtitle  TEXT,
  color     TEXT,
  floors    INTEGER NOT NULL DEFAULT 1,
  rooms     INTEGER NOT NULL DEFAULT 0,
  x         REAL NOT NULL DEFAULT 0,
  z         REAL NOT NULL DEFAULT 0,
  w         REAL NOT NULL DEFAULT 1,
  d         REAL NOT NULL DEFAULT 1,
  icon      TEXT,
  extra     TEXT
);

CREATE TABLE IF NOT EXISTS rooms (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  building  TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor     INTEGER NOT NULL DEFAULT 1,
  type      TEXT NOT NULL DEFAULT 'class',
  subject   TEXT,
  x         REAL NOT NULL DEFAULT 0,
  z         REAL NOT NULL DEFAULT 0,
  w         REAL NOT NULL DEFAULT 2,
  d         REAL NOT NULL DEFAULT 2,
  color     INTEGER,
  extra     TEXT
);

CREATE INDEX IF NOT EXISTS idx_rooms_building ON rooms(building);
CREATE INDEX IF NOT EXISTS idx_rooms_building_floor ON rooms(building, floor);

CREATE TABLE IF NOT EXISTS teachers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  firstName   TEXT,
  lastName    TEXT,
  department  TEXT,
  subject     TEXT,
  building    TEXT REFERENCES buildings(id) ON DELETE SET NULL,
  floor       INTEGER,
  office      TEXT,
  extra       TEXT
);

CREATE INDEX IF NOT EXISTS idx_teachers_building ON teachers(building);
CREATE INDEX IF NOT EXISTS idx_teachers_lastname ON teachers(lastName);

CREATE TABLE IF NOT EXISTS campus_elements (
  id        TEXT PRIMARY KEY,
  type      TEXT NOT NULL,
  x         REAL NOT NULL DEFAULT 0,
  z         REAL NOT NULL DEFAULT 0,
  w         REAL,
  d         REAL,
  rotation  REAL,
  extra     TEXT
);

CREATE TABLE IF NOT EXISTS schedule_slots (
  class_id  TEXT NOT NULL,
  day       TEXT NOT NULL,
  hour      TEXT NOT NULL,
  data      TEXT NOT NULL, 
  PRIMARY KEY (class_id, day, hour)
);

CREATE INDEX IF NOT EXISTS idx_schedule_class ON schedule_slots(class_id);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL 
);