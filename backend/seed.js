require('dotenv').config();
const { writeDB } = require('./utils/db');
const { findOverlaps } = require('./utils/roomGeometry');

const BUILDINGS = [
  { id: 'A', name: 'Palazzina A', subtitle: 'Sede centrale', color: '#FF7E67', floors: 4, rooms: 120, x: 0, z: 0, w: 12, d: 6, icon: 'main' },
  { id: 'B', name: 'Palazzina B', subtitle: 'Scientifica', color: '#58A4B0', floors: 3, rooms: 80, x: -18, z: 0, w: 8, d: 6, icon: 'wing' },
  { id: 'C', name: 'Palazzina C', subtitle: 'Linguistica', color: '#FC642D', floors: 3, rooms: 60, x: 18, z: 0, w: 8, d: 6, icon: 'wing' },
  { id: 'D', name: 'Palazzina D', subtitle: 'Artistica', color: '#9C89B8', floors: 2, rooms: 40, x: 0, z: -16, w: 10, d: 5, icon: 'wing' },
  { id: 'GYM1', name: 'Palestra 1', subtitle: 'Coperta', color: '#E8A87C', floors: 1, rooms: 4, x: -18, z: 14, w: 7, d: 5, icon: 'gym' },
  { id: 'GYM2', name: 'Palestra 2', subtitle: 'Coperta', color: '#E8A87C', floors: 1, rooms: 3, x: 18, z: 14, w: 7, d: 5, icon: 'gym' },
  { id: 'FIELD', name: 'Campo da calcio', subtitle: 'Esterno', color: '#88B04B', floors: 1, rooms: 1, x: 0, z: 18, w: 16, d: 10, icon: 'field' },
];

const ROOMS = [];
const SUBJECTS = ['Italiano','Matematica','Inglese','Storia','Geografia','Scienze','Fisica','Chimica','Filosofia','Arte','Musica','Diritto','Economia','Informatica','Latino','Greco','Religione'];
const ROOM_TYPES = ['class','class','class','class','lab','lab','office'];

function buildFloorGrid(bldData, cols, rows) {
  const cellW = (bldData.w - 1.2) / cols;
  const cellD = (bldData.d - 1.0) / rows;
  const corridorW = 0.6;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let xOffset = (c - (cols - 1) / 2) * cellW;
      if (c >= cols / 2) xOffset += corridorW;
      else xOffset -= corridorW / 2;
      const x = bldData.x + xOffset;
      const z = bldData.z - bldData.d / 2 + (r + 0.5) * cellD;
      cells.push({ x, z, w: cellW - 0.2, d: cellD - 0.2 });
    }
  }
  return cells;
}

function generateRooms() {
  const buildingRooms = { A: 120, B: 80, C: 60, D: 40 };

  const FIXED_SPECIALS_BY_FLOOR = {
    'A::1': [
      { id: 'LIB', name: 'Biblioteca', type: 'special', subject: 'Studio' },
      { id: 'AUD', name: 'Auditorium', type: 'special', subject: 'Eventi' },
      { id: 'MENSA', name: 'Mensa', type: 'special', subject: 'Pranzo' }
    ],
    'B::1': [
      { id: 'LAB-INFO', name: 'Lab. Informatica', type: 'lab', subject: 'Informatica' }
    ],
    'B::2': [
      { id: 'LAB-SCI', name: 'Lab. Scienze', type: 'lab', subject: 'Scienze' }
    ]
  };

  Object.entries(buildingRooms).forEach(([bld, count]) => {
    const bldData = BUILDINGS.find(b => b.id === bld);
    if (!bldData) return;
    const floors = bldData.floors;
    const roomsPerFloor = Math.ceil(count / floors);

    for (let floor = 1; floor <= floors; floor++) {
      const floorKey = `${bld}::${floor}`;
      const fixedSpecials = FIXED_SPECIALS_BY_FLOOR[floorKey] || [];
      const cellsNeeded = roomsPerFloor + 2 + fixedSpecials.length;
      const cols = 4;
      const rows = Math.ceil(cellsNeeded / cols);
      const cells = buildFloorGrid(bldData, cols, rows);

      let cellIndex = 0;
      const nextCell = () => cells[cellIndex++];

      fixedSpecials.forEach(special => {
        const cell = nextCell();
        ROOMS.push({
          id: special.id, name: special.name, building: bld, floor,
          type: special.type, subject: special.subject,
          x: cell.x, z: cell.z, w: cell.w, d: cell.d,
          color: special.type === 'lab' ? 0x7FA37F : 0x9C89B8
        });
      });

      const scCell = nextCell();
      ROOMS.push({
        id: `${bld}-${floor}SC`, name: `Scale ${bld}`, building: bld, floor,
        type: 'special', subject: 'Collegamento Verticale',
        x: scCell.x, z: scCell.z, w: scCell.w, d: scCell.d,
        color: 0x95A5A6
      });
      const wcCell = nextCell();
      ROOMS.push({
        id: `${bld}-${floor}WC`, name: `Servizi ${bld}`, building: bld, floor,
        type: 'special', subject: 'Servizi Igienici',
        x: wcCell.x, z: wcCell.z, w: wcCell.w, d: wcCell.d,
        color: 0xE8B4B8
      });

      let placed = 0;
      while (placed < roomsPerFloor && cellIndex < cells.length) {
        const cell = nextCell();
        const id = `${bld}-${floor}${String(placed + 1).padStart(2, '0')}`;
        const type = ROOM_TYPES[Math.floor(Math.random() * ROOM_TYPES.length)];
        const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
        ROOMS.push({
          id, name: `Aula ${id}`, building: bld, floor,
          type, subject,
          x: cell.x, z: cell.z, w: cell.w, d: cell.d,
          color: type === 'class' ? 0x93B5C6 : type === 'lab' ? 0x7FA37F : 0xC9A868
        });
        placed++;
      }
    }
  });
}
generateRooms();

const TEACHERS = [];
const DEPARTMENTS = ['Lettere','Scientifico','Lingue','Arte','Motoria','Tecnologico'];
const TITLES = ['Prof.','Prof.ssa'];
const FIRST_NAMES = ['Marco','Laura','Giuseppe','Anna','Antonio','Maria','Francesco','Giulia','Alessandro','Chiara','Luca','Sara','Andrea','Elena','Roberto','Valentina','Giovanni','Simona','Paolo','Federica','Stefano','Martina','Davide','Alessia','Matteo','Silvia','Riccardo','Ilaria','Fabio','Barbara'];
const LAST_NAMES = ['Rossi','Bianchi','Verdi','Neri','Russo','Ferrari','Esposito','Romano','Gallo','Conti','Ricci','Marino','Greco','Bruno','Galli','Costa','Giordano','Mancini','Rizzo','Lombardi','Moretti','Amato','Barbieri','Villa','Santoro','Mariani','Ferrara','Romano','Caruso','Fabbri'];

function generateTeachers() {
  for (let i = 0; i < 150; i++) {
    const title = TITLES[i % 2];
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const dept = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
    const subjects = {
      'Lettere': ['Italiano','Storia','Geografia','Latino','Greco','Filosofia'],
      'Scientifico': ['Matematica','Fisica','Scienze','Chimica'],
      'Lingue': ['Inglese','Francese','Spagnolo','Tedesco'],
      'Arte': ['Arte','Musica','Storia dell\'arte'],
      'Motoria': ['Motoria'],
      'Tecnologico': ['Informatica','Diritto','Economia','Religione']
    };
    const subject = subjects[dept][Math.floor(Math.random() * subjects[dept].length)];
    const bld = BUILDINGS[Math.floor(Math.random() * 4)].id;
    const floor = Math.floor(Math.random() * 3) + 1;
    TEACHERS.push({
      id: `T${i+1}`,
      name: `${title} ${first} ${last}`,
      firstName: first,
      lastName: last,
      department: dept,
      subject,
      building: bld,
      floor,
      office: `${bld}-${floor}${String(Math.floor(Math.random()*15)+1).padStart(2,'0')}`
    });
  }
}
generateTeachers();

// ---- Verifica di sicurezza ----
const overlaps = findOverlaps(ROOMS);
if (overlaps.length > 0) {
  console.error(`Trovate ${overlaps.length} sovrapposizioni tra stanze:`);
  overlaps.forEach(([a, b]) => console.error(`  - ${a.id} si sovrappone a ${b.id} (edificio ${a.building}, piano ${a.floor})`));
  process.exit(1);
}

// ---- Seed ----
const initialData = {
  buildings: BUILDINGS,
  rooms: ROOMS,
  teachers: TEACHERS,
  campusElements: [],
  schedule: {},
  settings: { chatbotEnabled: true }
};

writeDB(initialData);
console.log(`Seed completato: ${BUILDINGS.length} edifici, ${ROOMS.length} stanze, ${TEACHERS.length} docenti.`);