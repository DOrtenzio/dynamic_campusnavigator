const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/campus.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;

const COLUMNS = {
  buildings: ['id', 'name', 'subtitle', 'color', 'floors', 'rooms', 'x', 'z', 'w', 'd', 'icon'],
  rooms: ['id', 'name', 'building', 'floor', 'type', 'subject', 'x', 'z', 'w', 'd', 'color'],
  teachers: ['id', 'name', 'firstName', 'lastName', 'department', 'subject', 'building', 'floor', 'office'],
  campus_elements: ['id', 'type', 'x', 'z', 'w', 'd', 'rotation']
};

function getDb() {
  if (db) return db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  return db;
}

function splitColumns(table, obj) {
  const known = COLUMNS[table];
  const cols = {};
  const extra = {};
  for (const [key, value] of Object.entries(obj)) {
    if (known.includes(key)) cols[key] = value;
    else if (key !== 'extra') extra[key] = value;
  }
  if (obj.extra && typeof obj.extra === 'object') {
    Object.assign(extra, obj.extra);
  }
  return { cols, extra };
}

function rowToObject(table, row) {
  if (!row) return row;
  const { extra, ...rest } = row;
  const obj = { ...rest };
  if (extra) {
    try {
      const parsedExtra = JSON.parse(extra);
      Object.assign(obj, parsedExtra);
    } catch {
      console.error("error");
    }
  }
  return obj;
}

function upsertRow(table, obj) {
  const database = getDb();
  const { cols, extra } = splitColumns(table, obj);
  const known = COLUMNS[table];
  const colNames = known.filter(c => c in cols);
  const extraJson = Object.keys(extra).length ? JSON.stringify(extra) : null;

  const allCols = [...colNames, 'extra'];
  const placeholders = allCols.map(() => '?').join(', ');
  const updateAssignments = allCols.map(c => `${c} = excluded.${c}`).join(', ');

  const stmt = database.prepare(`
    INSERT INTO ${table} (${allCols.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET ${updateAssignments}
  `);
  const values = colNames.map(c => cols[c]).concat([extraJson]);
  stmt.run(...values);
}

function replaceTable(table, rows) {
  const database = getDb();
  const tx = database.transaction((items) => {
    database.prepare(`DELETE FROM ${table}`).run();
    for (const item of items) {
      upsertRow(table, item);
    }
  });
  tx(rows || []);
}

function readBuildings() {
  const database = getDb();
  return database.prepare('SELECT * FROM buildings').all().map(r => rowToObject('buildings', r));
}

function readRooms() {
  const database = getDb();
  return database.prepare('SELECT * FROM rooms').all().map(r => rowToObject('rooms', r));
}

function readTeachers() {
  const database = getDb();
  return database.prepare('SELECT * FROM teachers').all().map(r => rowToObject('teachers', r));
}

function readCampusElements() {
  const database = getDb();
  return database.prepare('SELECT * FROM campus_elements').all().map(r => rowToObject('campus_elements', r));
}

function readSchedule() {
  const database = getDb();
  const slots = database.prepare('SELECT * FROM schedule_slots').all();
  const schedule = {};
  for (const slot of slots) {
    if (!schedule[slot.class_id]) schedule[slot.class_id] = {};
    if (!schedule[slot.class_id][slot.day]) schedule[slot.class_id][slot.day] = {};
    let data = {};
    try { data = JSON.parse(slot.data); } catch { data = slot.data; }
    schedule[slot.class_id][slot.day][slot.hour] = data;
  }
  return schedule;
}

function writeScheduleAll(schedule) {
  const database = getDb();
  const tx = database.transaction((sched) => {
    database.prepare('DELETE FROM schedule_slots').run();
    const insert = database.prepare(
      'INSERT INTO schedule_slots (class_id, day, hour, data) VALUES (?, ?, ?, ?)'
    );
    for (const [classId, days] of Object.entries(sched || {})) {
      for (const [day, hours] of Object.entries(days || {})) {
        for (const [hour, data] of Object.entries(hours || {})) {
          insert.run(classId, day, hour, JSON.stringify(data));
        }
      }
    }
  });
  tx(schedule);
}

function writeScheduleForClass(classId, classSchedule) {
  const database = getDb();
  const tx = database.transaction((cId, days) => {
    database.prepare('DELETE FROM schedule_slots WHERE class_id = ?').run(cId);
    const insert = database.prepare(
      'INSERT INTO schedule_slots (class_id, day, hour, data) VALUES (?, ?, ?, ?)'
    );
    for (const [day, hours] of Object.entries(days || {})) {
      for (const [hour, data] of Object.entries(hours || {})) {
        insert.run(cId, day, hour, JSON.stringify(data));
      }
    }
  });
  tx(classId, classSchedule);
}

function setScheduleSlot(classId, day, hour, data) {
  const database = getDb();
  database.prepare(`
    INSERT INTO schedule_slots (class_id, day, hour, data)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(class_id, day, hour) DO UPDATE SET data = excluded.data
  `).run(classId, day, hour, JSON.stringify(data));
}

function deleteScheduleSlot(classId, day, hour) {
  const database = getDb();
  database.prepare('DELETE FROM schedule_slots WHERE class_id = ? AND day = ? AND hour = ?')
    .run(classId, day, hour);
}

function readSettings() {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM settings').all();
  const settings = {};
  for (const row of rows) {
    try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
  }
  return settings;
}

function writeSettings(settings) {
  const database = getDb();
  const tx = database.transaction((s) => {
    const upsert = database.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    for (const [key, value] of Object.entries(s || {})) {
      upsert.run(key, JSON.stringify(value));
    }
  });
  tx(settings);
}

function readDB() {
  return {
    buildings: readBuildings(),
    rooms: readRooms(),
    teachers: readTeachers(),
    campusElements: readCampusElements(),
    schedule: readSchedule(),
    settings: readSettings()
  };
}

function writeDB(data) {
  const database = getDb();
  const tx = database.transaction((d) => {
    if (d.buildings) replaceTable('buildings', d.buildings);
    if (d.rooms) replaceTable('rooms', d.rooms);
    if (d.teachers) replaceTable('teachers', d.teachers);
    if (d.campusElements) replaceTable('campus_elements', d.campusElements);
    if (d.schedule) writeScheduleAll(d.schedule);
    if (d.settings) writeSettings(d.settings);
  });
  tx(data);
}

module.exports = {
  getDb,
  readDB,
  writeDB,
  upsertRow,
  replaceTable,
  readBuildings,
  readRooms,
  readTeachers,
  readCampusElements,
  readSchedule,
  readSettings,
  writeSettings,
  writeScheduleForClass,
  setScheduleSlot,
  deleteScheduleSlot
};