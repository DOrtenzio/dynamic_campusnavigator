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
    // Define grid: 4 columns (2 per side of corridor), 2 rows (front/back) -> 8 cells per floor
    const cols = 4;
    const rows = 2;
    const cellW = (bldData.w - 1.2) / cols; // reserve 0.6m for corridor
    const cellD = (bldData.d - 1.0) / rows;
    const corridorW = 0.6;
    const corridorX = bldData.x; // center

    for (let floor = 1; floor <= floors; floor++) {
      let placed = 0;
      for (let r = 0; r < rows && placed < roomsPerFloor; r++) {
        for (let c = 0; c < cols && placed < roomsPerFloor; c++) {
          const id = `${bld}-${floor}${String(placed+1).padStart(2,'0')}`;
          const type = ROOM_TYPES[Math.floor(Math.random() * ROOM_TYPES.length)];
          const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
          // Position: shift columns to create corridor in middle
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
      // Add stairs and restrooms
      const cellWsmall = (bldData.w - 1.2) / 6;
      // Stairs (left side)
      ROOMS.push({
        id: `${bld}-${floor}SC`, name: `Scale ${bld}`, building: bld, floor,
        type: 'special', subject: 'Collegamento Verticale',
        x: bldData.x - bldData.w/2 + 0.8,
        z: bldData.z - bldData.d/2 + 0.8,
        w: 0.6, d: 0.6,
        color: 0x95A5A6
      });
      // Toilet (right side)
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

  // Special rooms (fixed positions)
  ROOMS.push({ id: 'LIB', name: 'Biblioteca', building: 'A', floor: 0, type: 'special', subject: 'Studio', x: -3, z: 2, w: 3, d: 2, color: 0x9C89B8 });
  ROOMS.push({ id: 'AUD', name: 'Auditorium', building: 'A', floor: 0, type: 'special', subject: 'Eventi', x: 3, z: 2, w: 4, d: 2, color: 0xFC642D });
  ROOMS.push({ id: 'MENSA', name: 'Mensa', building: 'A', floor: 0, type: 'special', subject: 'Pranzo', x: -8, z: 2, w: 4, d: 2, color: 0x58A4B0 });
  ROOMS.push({ id: 'LAB-INFO', name: 'Lab. Informatica', building: 'B', floor: 1, type: 'lab', subject: 'Informatica', x: -20, z: -1, w: 2, d: 2, color: 0x7FA37F });
  ROOMS.push({ id: 'LAB-SCI', name: 'Lab. Scienze', building: 'B', floor: 2, type: 'lab', subject: 'Scienze', x: -17, z: -1, w: 2, d: 2, color: 0x7FA37F });
}
generateRooms();

// Teachers Configuration (150 teachers)
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

// Classes Configuration (60 classes)
const CLASSES = [];
const SECTIONS = ['A','B','C','D','E','F','G','H','I','L','M','N'];
function generateClasses() {
  for (let year = 1; year <= 5; year++) {
    for (let s = 0; s < 12; s++) {
      const building = BUILDINGS[Math.floor(Math.random() * 4)].id;
      CLASSES.push({
        id: `${year}${SECTIONS[s]}`,
        year,
        section: SECTIONS[s],
        name: `${year}° ${SECTIONS[s]}`,
        building,
        students: 20 + Math.floor(Math.random() * 6),
        classroom: `${building}-${year}0${s+1}`
      });
    }
  }
}
generateClasses();

const DAY_NAMES = ['LUN','MAR','MER','GIO','VEN'];

// SVG Icons
const ICONS = {
  class: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="21" x2="9" y2="9"/><line x1="15" y1="21" x2="15" y2="15"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
  lab: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.7 18.3l3.5-3.5M21 21l-3.5-3.5M10.5 7.5L5.3 12.7c-.4.4-.4 1 0 1.4l4.6 4.6c.4.4 1 .4 1.4 0l5.2-5.2m-6-6L14.7 3.3c.4-.4 1-.4 1.4 0l4.6 4.6c.4.4.4 1 0 1.4L15.5 14.5m-5-7l5 5"/></svg>`,
  office: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  special: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  entrance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>`,
  teacher: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  classGroup: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  main: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  wing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>`,
  gym: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="8" x2="22" y2="12"/><line x1="16" y1="6" x2="20" y2="10"/><line x1="12" y1="2" x2="22" y2="12"/><line x1="2" y1="22" x2="3" y2="21"/><line x1="3" y1="13" x2="13" y2="3"/><circle cx="8" cy="16" r="5"/></svg>`,
  field: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="10"/><line x1="2" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="4"/></svg>`
};