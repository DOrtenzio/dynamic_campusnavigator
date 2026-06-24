require('dotenv').config();
const { writeDB } = require('./utils/db');

const BUILDINGS = [
  { id: 'A', name: 'Palazzina A', subtitle: 'Sede centrale', color: '#FF7E67', floors: 4, rooms: 120, x: 0, z: 0, w: 12, d: 6, icon: 'main' },
  { id: 'B', name: 'Palazzina B', subtitle: 'Scientifica', color: '#58A4B0', floors: 3, rooms: 80, x: -18, z: 0, w: 8, d: 6, icon: 'wing' },
  { id: 'C', name: 'Palazzina C', subtitle: 'Linguistica', color: '#FC642D', floors: 3, rooms: 60, x: 18, z: 0, w: 8, d: 6, icon: 'wing' },
  { id: 'D', name: 'Palazzina D', subtitle: 'Artistica', color: '#9C89B8', floors: 2, rooms: 40, x: 0, z: -16, w: 10, d: 5, icon: 'wing' },
  { id: 'GYM1', name: 'Palestra 1', subtitle: 'Coperta', color: '#E8A87C', floors: 1, rooms: 4, x: -18, z: 14, w: 7, d: 5, icon: 'gym' },
  { id: 'GYM2', name: 'Palestra 2', subtitle: 'Coperta', color: '#E8A87C', floors: 1, rooms: 3, x: 18, z: 14, w: 7, d: 5, icon: 'gym' },
  { id: 'FIELD', name: 'Campo da calcio', subtitle: 'Esterno', color: '#88B04B', floors: 0, rooms: 1, x: 0, z: 18, w: 16, d: 10, icon: 'field' },
];

const ROOMS = [];
const SUBJECTS = ['Italiano','Matematica','Inglese','Storia','Geografia','Scienze','Fisica','Chimica','Filosofia','Arte','Musica','Diritto','Economia','Informatica','Latino','Greco','Religione'];
const ROOM_TYPES = ['class','class','class','class','lab','lab','office'];

function generateRooms() {
  const buildingRooms = { A: 120, B: 80, C: 60, D: 40 };
  Object.entries(buildingRooms).forEach(([bld, count]) => {
    const bldData = BUILDINGS.find(b => b.id === bld);
    if (!bldData) return;
    const floors = bldData.floors;
    const roomsPerFloor = Math.ceil(count / floors);
    const cols = 4;
    const rows = 2;
    const cellW = (bldData.w - 1.2) / cols;
    const cellD = (bldData.d - 1.0) / rows;
    const corridorW = 0.6;

    for (let floor = 1; floor <= floors; floor++) {
      let placed = 0;
      for (let r = 0; r < rows && placed < roomsPerFloor; r++) {
        for (let c = 0; c < cols && placed < roomsPerFloor; c++) {
          const id = `${bld}-${floor}${String(placed+1).padStart(2,'0')}`;
          const type = ROOM_TYPES[Math.floor(Math.random() * ROOM_TYPES.length)];
          const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
          let xOffset = (c - (cols-1)/2) * cellW;
          if (c >= cols/2) xOffset += corridorW;
          else xOffset -= corridorW / 2;
          const x = bldData.x + xOffset;
          const z = bldData.z - bldData.d/2 + (r + 0.5) * cellD;
          ROOMS.push({
            id, name: `Aula ${id}`, building: bld, floor,
            type, subject,
            x, z,
            w: cellW - 0.2, d: cellD - 0.2,
            color: type === 'class' ? 0x93B5C6 : type === 'lab' ? 0x7FA37F : 0xC9A868
          });
          placed++;
        }
      }
      // Stairs e toilet
      ROOMS.push({
        id: `${bld}-${floor}SC`, name: `Scale ${bld}`, building: bld, floor,
        type: 'special', subject: 'Collegamento Verticale',
        x: bldData.x - bldData.w/2 + 0.8,
        z: bldData.z - bldData.d/2 + 0.8,
        w: 0.6, d: 0.6,
        color: 0x95A5A6
      });
      ROOMS.push({
        id: `${bld}-${floor}WC`, name: `Servizi ${bld}`, building: bld, floor,
        type: 'special', subject: 'Servizi Igienici',
        x: bldData.x + bldData.w/2 - 0.8,
        z: bldData.z - bldData.d/2 + 0.8,
        w: 0.6, d: 0.6,
        color: 0xE8B4B8
      });
    }
  });

  // Speciali fissi
  ROOMS.push({ id: 'LIB', name: 'Biblioteca', building: 'A', floor: 0, type: 'special', subject: 'Studio', x: -3, z: 2, w: 3, d: 2, color: 0x9C89B8 });
  ROOMS.push({ id: 'AUD', name: 'Auditorium', building: 'A', floor: 0, type: 'special', subject: 'Eventi', x: 3, z: 2, w: 4, d: 2, color: 0xFC642D });
  ROOMS.push({ id: 'MENSA', name: 'Mensa', building: 'A', floor: 0, type: 'special', subject: 'Pranzo', x: -8, z: 2, w: 4, d: 2, color: 0x58A4B0 });
  ROOMS.push({ id: 'LAB-INFO', name: 'Lab. Informatica', building: 'B', floor: 1, type: 'lab', subject: 'Informatica', x: -20, z: -1, w: 2, d: 2, color: 0x7FA37F });
  ROOMS.push({ id: 'LAB-SCI', name: 'Lab. Scienze', building: 'B', floor: 2, type: 'lab', subject: 'Scienze', x: -17, z: -1, w: 2, d: 2, color: 0x7FA37F });
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

// ---- Seed ----
const initialData = {
  buildings: BUILDINGS,
  rooms: ROOMS,
  teachers: TEACHERS,
  schedule: {}
};

writeDB(initialData);
console.log('✅ Database popolato con i dati del frontend.');
console.log(`🏢 Edifici: ${BUILDINGS.length}`);
console.log(`🏠 Aule: ${ROOMS.length}`);
console.log(`👨‍🏫 Professori: ${TEACHERS.length}`);