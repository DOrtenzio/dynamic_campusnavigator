// ---- STATO GLOBALE ----
const state = {
  startPlace: null,
  currentTab: 'home',
  selectedRoom: null,
  filters: {
    rooms: { building: 'all', query: '' },
    teachers: { department: 'all', query: '' },
    classes: { year: 'all', query: '' }
  },
  navigationActive: false
};

// ---- DATI (caricati dal backend) ----
let BUILDINGS = [];
let ROOMS = [];
let TEACHERS = [];
let CLASSES = [];

// ---- COSTANTI (definite qui, non più in data.js) ----
const DEPARTMENTS = ['Lettere','Scientifico','Lingue','Arte','Motoria','Tecnologico'];
const ROOM_TYPES = ['class','lab','office','special'];
const DAY_NAMES = ['LUN','MAR','MER','GIO','VEN'];
const HOURS = ['8:00–9:00','9:00–10:00','10:00–11:00','11:00–12:00','12:00–13:00','13:00–14:00'];
const SUBJECTS = ['Italiano','Matematica','Inglese','Storia','Geografia','Scienze','Fisica','Chimica','Filosofia','Arte','Musica','Diritto','Economia','Informatica','Latino','Greco','Religione'];

// ---- ICONS (definiti qui, non più in data.js) ----
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

// ---- API HELPER ----
const API_BASE = '/api';

globalThis.ENTRANCE_BUILDING_MAP ??= {
  main: 'A',
  back: 'B',
  gym: 'GYM1',
  field: 'FIELD',
  d: 'D'
};

function resolveEntranceBuildingId(entranceId) {
  if (!entranceId) return 'A';
  const key = String(entranceId).toLowerCase();
  if (ENTRANCE_BUILDING_MAP[key]) return ENTRANCE_BUILDING_MAP[key];
  const upper = String(entranceId).toUpperCase();
  if (BUILDINGS.find(b => b.id === upper)) return upper;
  return 'A';
}

function getEntranceLabel(entranceId) {
  const labels = {
    main: 'Ingresso principale',
    back: 'Ingresso secondario',
    gym: 'Ingresso palestre',
    field: 'Ingresso campo',
    d: 'Ingresso Palazzina D'
  };
  return labels[String(entranceId).toLowerCase()] || 'Ingresso';
}

async function apiGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`Errore API: ${res.status}`);
  return res.json();
}

// ---- CARICAMENTO DATI DAL BACKEND ----
let SCHEDULE = {};

async function loadDataFromBackend() {
  try {
    const [buildings, rooms, teachers, schedule] = await Promise.all([
      apiGet('/buildings'),
      apiGet('/rooms'),
      apiGet('/teachers'),
      apiGet('/schedule')
    ]);
    
    BUILDINGS = buildings;
    ROOMS = rooms;
    TEACHERS = teachers;
    SCHEDULE = schedule || {};
    
    // Genera CLASSES da ROOMS
    generateClassesFromRooms();
    
    console.log(`✅ Caricati: ${BUILDINGS.length} edifici, ${ROOMS.length} aule, ${TEACHERS.length} professori, ${CLASSES.length} classi`);
    return true;
  } catch (err) {
    console.error('❌ Errore caricamento dati dal backend:', err);
    showToast('Errore nel caricamento dei dati. Verifica che il backend sia in esecuzione.');
    // Carica dati di fallback (solo per sviluppo)
    loadFallbackData();
    return false;
  }
}

// ---- FALLBACK (solo per sviluppo, se il backend non è disponibile) ----
function loadFallbackData() {
  // Dati minimi per non far crashare l'app
  BUILDINGS = [
    { id: 'A', name: 'Palazzina A', subtitle: 'Sede centrale', color: '#FF7E67', floors: 4, rooms: 120, x: 0, z: 0, w: 12, d: 6, icon: 'main' },
    { id: 'B', name: 'Palazzina B', subtitle: 'Scientifica', color: '#58A4B0', floors: 3, rooms: 80, x: -18, z: 0, w: 8, d: 6, icon: 'wing' }
  ];
  ROOMS = [
    { id: 'A-101', name: 'Aula A-101', building: 'A', floor: 1, type: 'class', subject: 'Matematica', x: 0, z: 0, w: 2, d: 2, color: 0x93B5C6 },
    { id: 'B-201', name: 'Aula B-201', building: 'B', floor: 2, type: 'class', subject: 'Fisica', x: -18, z: 0, w: 2, d: 2, color: 0x93B5C6 }
  ];
  TEACHERS = [
    { id: 'T1', name: 'Prof. Mario Rossi', firstName: 'Mario', lastName: 'Rossi', department: 'Scientifico', subject: 'Matematica', building: 'A', floor: 1, office: 'A-101' }
  ];
  generateClassesFromRooms();
}

// ---- GENERA CLASSI DA ROOMS ----
function generateClassesFromRooms() {
  // Prendi tutte le aule che sono classi
  const classRooms = ROOMS.filter(r => r.type === 'class');
  CLASSES = classRooms.map(r => {
    // Cerca di estrarre anno e sezione dal nome o ID
    const match = r.id.match(/([A-Z])-(\d)(\d{2})/);
    if (match) {
      const building = match[1];
      const year = parseInt(match[2]);
      const sectionNum = parseInt(match[3]);
      const section = String.fromCharCode(64 + sectionNum); // 1->A, 2->B, ecc.
      return {
        id: `${year}${section}`,
        year: year,
        section: section,
        name: `${year}° ${section}`,
        building: building,
        students: 20 + Math.floor(Math.random() * 6),
        classroom: r.id
      };
    }
    return null;
  }).filter(c => c);
  
  // Se non ci sono classi, genera classi di esempio
  if (CLASSES.length === 0) {
    for (let year = 1; year <= 5; year++) {
      for (let s = 0; s < 3; s++) {
        const section = String.fromCharCode(65 + s); // A, B, C
        CLASSES.push({
          id: `${year}${section}`,
          year: year,
          section: section,
          name: `${year}° ${section}`,
          building: BUILDINGS[0]?.id || 'A',
          students: 20 + Math.floor(Math.random() * 6),
          classroom: `${BUILDINGS[0]?.id || 'A'}-${year}${s+1}`
        });
      }
    }
  }
}

// ---- UTILITY FUNCTIONS ----
function showScreen(id) {
  document.querySelectorAll('#appLayout .screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
  document.querySelectorAll('.side-item').forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
  const screens = { home: 'homeScreen', map: 'mapScreen', rooms: 'roomsScreen', teachers: 'teachersScreen', classes: 'classesScreen' };
  if (screens[tab]) showScreen(screens[tab]);
  if (tab === 'map') {
    if (!mapInitialized) {
      setTimeout(initMap, 80);
    } else {
      setTimeout(() => onMapResize(), 50);
      if (typeof createStartMarker === 'function') createStartMarker();
    }
  }
  if (tab === 'rooms') renderRoomsList();
  if (tab === 'teachers') renderTeachersList();
  if (tab === 'classes') renderClassesList();
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (toast) {
    document.getElementById('toastText').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  } else {
    alert(msg);
  }
}

// ============================================================
// ONBOARDING
// ============================================================

function renderEntranceList(filter = '') {
  const q = filter.toLowerCase().trim();
  const entrances = [
    { id: 'main', name: 'Ingresso principale', desc: 'Via Galilei, 1 — Palazzina A', icon: 'entrance' },
    { id: 'back', name: 'Ingresso secondario', desc: 'Lato giardino — Palazzina B', icon: 'entrance' },
    { id: 'gym', name: 'Ingresso palestre', desc: 'Via dello Sport — Palestra 1', icon: 'entrance' },
    { id: 'field', name: 'Ingresso campo', desc: 'Lato sud — Campo da calcio', icon: 'entrance' },
    { id: 'd', name: 'Ingresso Palazzina D', desc: 'Via delle Arti', icon: 'entrance' },
  ].filter(e => !q || e.name.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q));
  
  document.getElementById('entranceList').innerHTML = entrances.map(e => `
    <div class="list-item" data-type="entrance" data-id="${e.id}">
      <div class="list-icon" style="background:#D4A373">${ICONS.entrance}</div>
      <div class="list-info">
        <div class="list-name">${e.name}</div>
        <div class="list-meta">${e.desc}</div>
      </div>
      <div class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg></div>
    </div>
  `).join('');
  attachOnboardingListeners('entranceList');
}

function renderPlaceList(filter = '') {
  const q = filter.toLowerCase().trim();
  const filtered = ROOMS.filter(r => 
    !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || (r.subject || '').toLowerCase().includes(q)
  ).slice(0, 40);
  
  document.getElementById('placeList').innerHTML = filtered.map(r => {
    const bld = BUILDINGS.find(b => b.id === r.building);
    const color = bld?.color || '#D4A373';
    const icon = ICONS[r.type] || ICONS.class;
    return `
      <div class="list-item" data-type="room" data-id="${r.id}">
        <div class="list-icon" style="background:${color}">${icon}</div>
        <div class="list-info">
          <div class="list-name">${r.name}</div>
          <div class="list-meta">
            <span class="tag" style="background:${color}">${r.building}</span>
            Piano ${r.floor} · ${r.subject || 'Generico'}
          </div>
        </div>
        <div class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg></div>
      </div>
    `;
  }).join('');
  attachOnboardingListeners('placeList');
}

function renderOnbClassList(filter = '') {
  const q = filter.toLowerCase().trim();
  const filtered = CLASSES.filter(c => !q || c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  
  document.getElementById('classList').innerHTML = filtered.map(c => {
    const bld = BUILDINGS.find(b => b.id === c.building);
    const color = bld?.color || '#D4A373';
    return `
      <div class="list-item" data-type="class" data-id="${c.id}">
        <div class="list-icon" style="background:${color}">${ICONS.classGroup}</div>
        <div class="list-info">
          <div class="list-name">Classe ${c.name}</div>
          <div class="list-meta">
            <span class="tag" style="background:${color}">${c.building}</span>
            ${c.students || 0} studenti · Aula ${c.classroom}
          </div>
        </div>
        <div class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg></div>
      </div>
    `;
  }).join('');
  attachOnboardingListeners('classList');
}

function attachOnboardingListeners(listId) {
  document.querySelectorAll(`#${listId} .list-item`).forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.list-item').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.startPlace = { type: card.dataset.type, id: card.dataset.id };
      document.getElementById('confirmEntrance').disabled = false;
    });
  });
}

// ---- Onboarding Tabs ----
document.querySelectorAll('#onboarding .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#onboarding .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#onboarding .panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.panel).classList.add('active');
  });
});

document.getElementById('entranceSearch').addEventListener('input', e => renderEntranceList(e.target.value));
document.getElementById('placeSearch').addEventListener('input', e => renderPlaceList(e.target.value));
document.getElementById('classSearch').addEventListener('input', e => renderOnbClassList(e.target.value));

document.getElementById('confirmEntrance').addEventListener('click', finishOnboarding);
document.getElementById('skipEntrance').addEventListener('click', () => {
  state.startPlace = { type: 'entrance', id: 'main' };
  finishOnboarding();
});

function finishOnboarding() {
  document.getElementById('onboarding').classList.remove('active');
  document.getElementById('appLayout').style.display = 'flex';
  
  let startLabel = 'Ingresso Principale';
  if (state.startPlace.type === 'room') {
    const room = ROOMS.find(r => r.id === state.startPlace.id);
    startLabel = room ? room.name : `Aula ${state.startPlace.id}`;
  } else if (state.startPlace.type === 'class') {
    startLabel = `Classe ${state.startPlace.id}`;
  } else if (state.startPlace.type === 'entrance') {
    startLabel = getEntranceLabel(state.startPlace.id);
  }
  document.getElementById('startPlaceText').textContent = startLabel;
  
  switchTab('home');
  renderBuildingsGrid();
  renderPopular();
  updateGreetingDate();
  renderRoomFilters();
  renderTeacherFilters();
  renderClassFilters();
  
  if (mapInitialized && typeof createStartMarker === 'function') {
    createStartMarker();
  }
  showToast('Configurazione salvata');
}

function updateGreetingDate() {
  const dayss = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const months = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const d = new Date();
  document.getElementById('greetingDate').textContent = `${dayss[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

// ============================================================
// HOME CONTENT
// ============================================================

function renderBuildingsGrid() {
  document.getElementById('buildingsGrid').innerHTML = BUILDINGS.map(b => `
    <div class="clay-card bld-card" style="--bld-color:${b.color}" onclick="focusBuilding3D('${b.id}')">
      <div class="bld-icon" style="background:${b.color}">${ICONS[b.icon] || ICONS.main}</div>
      <div class="bld-name">${b.name}</div>
      <div class="bld-meta">
        <span>${b.subtitle || ''}</span> · 
        <span>${b.rooms || 0} aule</span>
      </div>
    </div>
  `).join('');
}

function focusBuilding3D(bldId) {
  switchTab('map');
  setTimeout(() => {
    if (typeof setIndoorBuilding === 'function') {
      setIndoorBuilding(bldId, 1);
    }
  }, 100);
}

function renderPopular() {
  const popularRooms = ROOMS.filter(r => ['LIB', 'MENSA', 'LAB-INFO', 'GYM1'].includes(r.id));
  const popular = popularRooms.map(r => {
    const bld = BUILDINGS.find(b => b.id === r.building);
    return {
      id: r.id,
      name: r.name,
      meta: `${bld?.name || r.building} · Piano ${r.floor}`,
      color: bld?.color || '#D4A373',
      icon: r.type || 'special'
    };
  });
  
  // Se non ci sono stanze popolari, mostra alcune di default
  if (popular.length === 0) {
    popular.push(
      { id: 'A-101', name: 'Aula A-101', meta: 'Palazzina A · Piano 1', color: '#FF7E67', icon: 'class' },
      { id: 'B-201', name: 'Aula B-201', meta: 'Palazzina B · Piano 2', color: '#58A4B0', icon: 'class' }
    );
  }
  
  document.getElementById('popularList').innerHTML = popular.map(p => `
    <div class="clay-card compact-item" onclick="openRoom('${p.id}')">
      <div class="compact-icon" style="background:${p.color}">${ICONS[p.icon] || ICONS.class}</div>
      <div class="compact-info">
        <div class="compact-name">${p.name}</div>
        <div class="compact-meta">${p.meta}</div>
      </div>
      <div class="compact-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5l7 7-7 7"/></svg></div>
    </div>
  `).join('');
}

// ============================================================
// AUTOCOMPLETE SEARCH
// ============================================================

function openSearch() {
  document.getElementById('searchModal').classList.add('open');
  setTimeout(() => document.getElementById('searchInput').focus(), 250);
  renderSearchResults('');
}

function closeSearch() {
  document.getElementById('searchModal').classList.remove('open');
  document.getElementById('searchInput').value = '';
}

document.getElementById('searchInput').addEventListener('input', e => renderSearchResults(e.target.value));

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') closeSearch();
});

function renderSearchResults(query) {
  const q = query.toLowerCase().trim();
  let html = '';
  
  if (!q) {
    html = `
      <div class="search-category">Ricerche Frequenti</div>
      ${ROOMS.slice(0, 3).map(r => {
        const bld = BUILDINGS.find(b => b.id === r.building);
        return `
          <div class="result-item" onclick="selectSearchResult('room','${r.id}')">
            <div class="result-icon" style="background:${bld?.color || '#D4A373'}">${ICONS[r.type] || ICONS.class}</div>
            <div class="result-info">
              <div class="result-name">${r.name}</div>
              <div class="result-meta">${bld?.name || r.building} · Piano ${r.floor}</div>
            </div>
          </div>
        `;
      }).join('')}
      <div style="text-align:center;padding:32px 20px;color:var(--text-medium);font-size:13px;line-height:1.4">
        Cerca <b> aule</b>, <b> professori</b> e <b> classi</b>.
      </div>
    `;
  } else {
    const rooms = ROOMS.filter(r => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || (r.subject || '').toLowerCase().includes(q)).slice(0, 6);
    const teachers = TEACHERS.filter(t => t.name.toLowerCase().includes(q) || (t.subject || '').toLowerCase().includes(q)).slice(0, 6);
    const classes = CLASSES.filter(c => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)).slice(0, 6);
    
    if (rooms.length) {
      html += `<div class="search-category">Aule e Laboratori (${rooms.length})</div>`;
      html += rooms.map(r => {
        const bld = BUILDINGS.find(b => b.id === r.building);
        return `<div class="result-item" onclick="selectSearchResult('room','${r.id}')">
          <div class="result-icon" style="background:${bld?.color || '#D4A373'}">${ICONS[r.type] || ICONS.class}</div>
          <div class="result-info">
            <div class="result-name">${r.name}</div>
            <div class="result-meta"><span class="tag" style="background:${bld?.color || '#D4A373'}">${r.building}</span> Piano ${r.floor} · ${r.subject || 'Generico'}</div>
          </div>
        </div>`;
      }).join('');
    }
    
    if (teachers.length) {
      html += `<div class="search-category">Professori (${teachers.length})</div>`;
      html += teachers.map(t => {
        const bld = BUILDINGS.find(b => b.id === t.building);
        return `<div class="result-item" onclick="selectSearchResult('teacher','${t.id}')">
          <div class="result-icon" style="background:var(--accent-terracotta)">${ICONS.teacher}</div>
          <div class="result-info">
            <div class="result-name">${t.name}</div>
            <div class="result-meta"><span class="tag" style="background:${bld?.color || '#D4A373'}">${t.office || t.building}</span> Materia: ${t.subject || 'Generico'}</div>
          </div>
        </div>`;
      }).join('');
    }
    
    if (classes.length) {
      html += `<div class="search-category">Classi (${classes.length})</div>`;
      html += classes.map(c => {
        const bld = BUILDINGS.find(b => b.id === c.building);
        return `<div class="result-item" onclick="selectSearchResult('class','${c.id}')">
          <div class="result-icon" style="background:${bld?.color || '#D4A373'}">${ICONS.classGroup}</div>
          <div class="result-info">
            <div class="result-name">Classe ${c.name}</div>
            <div class="result-meta"><span class="tag" style="background:${bld?.color || '#D4A373'}">${c.classroom}</span> Edificio ${c.building} · ${c.students || 0} alunni</div>
          </div>
        </div>`;
      }).join('');
    }
    
    if (!html) {
      html = `<div style="text-align:center;padding:40px 20px;color:var(--text-medium)"><div style="font-size:14px">Nessun risultato corrispondente a "${query}"</div></div>`;
    }
  }
  document.getElementById('searchResults').innerHTML = html;
}

function selectSearchResult(type, id) {
  closeSearch();
  setTimeout(() => {
    if (type === 'room') openRoom(id);
    else if (type === 'teacher') {
      const teacher = TEACHERS.find(t => t.id === id);
      if (teacher && teacher.office) {
        openRoom(teacher.office);
        showToast(`Ufficio del ${teacher.name}`);
      } else {
        showToast('Professore trovato ma senza ufficio');
      }
    } else if (type === 'class') {
      const cls = CLASSES.find(c => c.id === id);
      if (cls && cls.classroom) {
        openRoom(cls.classroom);
        showToast(`Aula della classe ${cls.name}`);
      } else {
        showToast('Classe trovata ma senza aula');
      }
    }
  }, 200);
}

// ============================================================
// ROOMS EXPLORE
// ============================================================

function renderRoomFilters() {
  const buildings = ['all', ...BUILDINGS.filter(b => b.floors > 0).map(b => b.id)];
  const bldHtml = buildings.map(b => {
    const label = b === 'all' ? 'Tutti gli edifici' : BUILDINGS.find(x => x.id === b)?.name || b;
    const count = b === 'all' ? ROOMS.length : ROOMS.filter(r => r.building === b).length;
    return `<button class="filter-chip ${state.filters.rooms.building === b ? 'active' : ''}" onclick="setRoomFilter('building','${b}')">${label} <span class="count">${count}</span></button>`;
  }).join('');
  document.getElementById('roomFilters').innerHTML = bldHtml;
}

function setRoomFilter(key, value) {
  state.filters.rooms[key] = value;
  renderRoomFilters();
  renderRoomsList();
}

document.getElementById('roomSearch').addEventListener('input', e => {
  state.filters.rooms.query = e.target.value;
  renderRoomsList();
});

function renderRoomsList() {
  const f = state.filters.rooms;
  let filtered = ROOMS.filter(r => {
    if (f.building !== 'all' && r.building !== f.building) return false;
    if (f.query) {
      const q = f.query.toLowerCase();
      if (!r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q) && !(r.subject || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });
  
  const grouped = {};
  filtered.forEach(r => { if (!grouped[r.building]) grouped[r.building] = []; grouped[r.building].push(r); });
  
  let html = `<div class="results-summary"><span>${filtered.length} aule trovate</span></div>`;
  Object.entries(grouped).forEach(([bldId, rooms]) => {
    const bld = BUILDINGS.find(b => b.id === bldId);
    const color = bld?.color || '#D4A373';
    html += `<div class="group-header">${bld?.name || bldId} <span class="group-count">${rooms.length}</span></div>`;
    html += rooms.slice(0, 20).map(r => `
      <div class="clay-card result-item" onclick="openRoom('${r.id}')">
        <div class="result-icon" style="background:${color}">${ICONS[r.type] || ICONS.class}</div>
        <div class="result-info">
          <div class="result-name">${r.name} <span class="tag" style="background:${color}">${r.id}</span></div>
          <div class="result-meta">Piano ${r.floor} · ${r.subject || 'Generico'}</div>
        </div>
        <div class="result-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5l7 7-7 7"/></svg></div>
      </div>
    `).join('');
    if (rooms.length > 20) {
      html += `<div style="text-align:center;padding:12px;color:var(--text-medium);font-size:12px">+ altre ${rooms.length - 20} aule</div>`;
    }
  });
  
  if (!filtered.length) {
    html = `<div style="text-align:center;padding:40px 20px;color:var(--text-medium)"><div style="font-size:13px">Nessuna aula corrisponde ai filtri</div></div>`;
  }
  document.getElementById('roomsList').innerHTML = html;
}

// ============================================================
// TEACHERS EXPLORE
// ============================================================

function renderTeacherFilters() {
  const depts = ['all', ...DEPARTMENTS];
  const html = depts.map(d => {
    const label = d === 'all' ? 'Tutti i dipartimenti' : d;
    const count = d === 'all' ? TEACHERS.length : TEACHERS.filter(t => t.department === d).length;
    return `<button class="filter-chip ${state.filters.teachers.department === d ? 'active' : ''}" onclick="setTeacherFilter('${d}')">${label} <span class="count">${count}</span></button>`;
  }).join('');
  document.getElementById('teacherFilters').innerHTML = html;
}

function setTeacherFilter(dept) {
  state.filters.teachers.department = dept;
  renderTeacherFilters();
  renderTeachersList();
}

document.getElementById('teacherSearch').addEventListener('input', e => {
  state.filters.teachers.query = e.target.value;
  renderTeachersList();
});

function renderTeachersList() {
  const f = state.filters.teachers;
  let filtered = TEACHERS.filter(t => {
    if (f.department !== 'all' && t.department !== f.department) return false;
    if (f.query) {
      const q = f.query.toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !(t.subject || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });
  
  filtered.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  
  const grouped = {};
  filtered.forEach(t => { const letter = (t.lastName || t.name)[0]; if (!grouped[letter]) grouped[letter] = []; grouped[letter].push(t); });
  
  let html = `<div class="results-summary"><span>${filtered.length} professori trovati</span></div>`;
  Object.entries(grouped).forEach(([letter, teachers]) => {
    html += `<div class="group-header">${letter} <span class="group-count">${teachers.length}</span></div>`;
    html += teachers.map(t => {
      const bld = BUILDINGS.find(b => b.id === t.building);
      const color = bld?.color || '#D4A373';
      return `
        <div class="clay-card result-item" onclick="openRoom('${t.office}')">
          <div class="result-icon" style="background:var(--accent-terracotta)">${ICONS.teacher}</div>
          <div class="result-info">
            <div class="result-name">${t.name}</div>
            <div class="result-meta"><span class="tag" style="background:${color}">${t.office || t.building}</span> Dipartimento: ${t.department} · ${t.subject || 'Generico'}</div>
          </div>
          <div class="result-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5l7 7-7 7"/></svg></div>
        </div>
      `;
    }).join('');
  });
  
  if (!filtered.length) {
    html = `<div style="text-align:center;padding:40px 20px;color:var(--text-medium)"><div style="font-size:13px">Nessun docente corrisponde alla ricerca</div></div>`;
  }
  document.getElementById('teachersList').innerHTML = html;
}

// ============================================================
// CLASSES EXPLORE
// ============================================================

function renderClassFilters() {
  const years = ['all', 1, 2, 3, 4, 5];
  const html = years.map(y => {
    const label = y === 'all' ? 'Tutti gli anni' : `${y}° Anno`;
    const count = y === 'all' ? CLASSES.length : CLASSES.filter(c => c.year === y).length;
    return `<button class="filter-chip ${state.filters.classes.year === y ? 'active' : ''}" onclick="setClassFilter(${y === 'all' ? "'all'" : y})">${label} <span class="count">${count}</span></button>`;
  }).join('');
  document.getElementById('classFilters').innerHTML = html;
}

function setClassFilter(year) {
  state.filters.classes.year = year;
  renderClassFilters();
  renderClassesList();
}

document.getElementById('classSearchMain').addEventListener('input', e => {
  state.filters.classes.query = e.target.value;
  renderClassesList();
});

function renderClassesList() {
  const f = state.filters.classes;
  let filtered = CLASSES.filter(c => {
    if (f.year !== 'all' && c.year !== f.year) return false;
    if (f.query) {
      const q = f.query.toLowerCase();
      if (!c.id.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  
  const grouped = {};
  filtered.forEach(c => { if (!grouped[c.year]) grouped[c.year] = []; grouped[c.year].push(c); });
  
  let html = `<div class="results-summary"><span>${filtered.length} classi trovate</span></div>`;
  Object.entries(grouped).sort((a,b) => a[0]-b[0]).forEach(([year, classes]) => {
    html += `<div class="group-header">${year}° anno <span class="group-count">${classes.length}</span></div>`;
    html += classes.map(c => {
      const bld = BUILDINGS.find(b => b.id === c.building);
      const color = bld?.color || '#D4A373';
      return `
        <div class="clay-card result-item" onclick="openRoom('${c.classroom}')">
          <div class="result-icon" style="background:${color}">${ICONS.classGroup}</div>
          <div class="result-info">
            <div class="result-name">Classe ${c.name}</div>
            <div class="result-meta"><span class="tag" style="background:${color}">${c.classroom}</span> ${c.students || 0} studenti · Edificio ${c.building}</div>
          </div>
          <div class="result-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5l7 7-7 7"/></svg></div>
        </div>
      `;
    }).join('');
  });
  
  if (!filtered.length) {
    html = `<div style="text-align:center;padding:40px 20px;color:var(--text-medium)"><div style="font-size:13px">Nessuna classe trovata</div></div>`;
  }
  document.getElementById('classesList').innerHTML = html;
}

// ============================================================
// DETAILS BOTTOM SHEET
// ============================================================

function openRoom(roomId) {
  const room = ROOMS.find(r => r.id === roomId);
  if (!room) { showToast('Aula non trovata'); return; }
  
  state.selectedRoom = room;
  const bld = BUILDINGS.find(b => b.id === room.building);
  const color = bld?.color || '#D4A373';
  
  document.getElementById('sheetTitle').textContent = room.name;
  document.getElementById('sheetBld').textContent = bld?.name || room.building;
  document.getElementById('sheetBld').style.background = color;
  document.getElementById('sheetFloor').textContent = 'Piano ' + room.floor;
  
  let descText = room.subject || 'Materia principale: ' + (room.subject || 'Generico');
  if (room.id.endsWith('SC')) descText = 'Vano scale antincendio / Ascensori di collegamento tra i piani.';
  else if (room.id.endsWith('WC')) descText = 'Servizi igienici di piano dell\'edificio.';
  document.getElementById('sheetSubject').textContent = descText;
  
  document.getElementById('sheetIcon').style.background = color;
  document.getElementById('sheetIcon').innerHTML = ICONS[room.type] || ICONS.class;
  
  document.getElementById('roomSheet').classList.add('open');
  if (state.currentTab !== 'map') switchTab('map');
  setTimeout(() => {
    if (typeof setIndoorBuilding === 'function') {
      setIndoorBuilding(room.building, room.floor);
    }
  }, 120);
}

function closeSheet() {
  document.getElementById('roomSheet').classList.remove('open');
}

// ============================================================
// 3D NAVIGATION CONTROLS
// ============================================================

function startNavigation3D() {
  if (!state.selectedRoom) return;
  closeSheet();
  
  const room = state.selectedRoom;
  const bld = BUILDINGS.find(b => b.id === room.building);
  
  document.getElementById('navDestName').textContent = room.name;
  document.getElementById('navDestBld').textContent = `${bld?.name || room.building} · Piano ${room.floor}`;

  // Draw the path
  const route = draw3DNavigationPath(state.startPlace, room);
  const distance = route ? Math.round(route.totalLength * 2.8) : 0;
  document.getElementById('navDestDist').textContent = distance + ' metri';
  document.getElementById('navDestTime').textContent = Math.max(1, Math.round(distance / 70)) + ' min';

  const steps = buildNavigationSteps(route);
  const stepsEl = document.getElementById('navDestSteps');
  if (stepsEl) {
    stepsEl.innerHTML = steps.map((s, i) => `
      <div class="nav-step">
        <span class="nav-step-num">${i + 1}</span>
        <span class="nav-step-text">${s}</span>
      </div>
    `).join('');
  }

  state.navigationActive = true;
  document.getElementById('navigationCard').style.display = 'block';
  showToast('Navigazione avviata');
}

function exitNavigation3D() {
  state.navigationActive = false;
  document.getElementById('navigationCard').style.display = 'none';
  clear3DNavigationPath();
  resetMapView();
  showToast('Navigazione terminata');
}

function navigateTo(roomId) {
  const room = ROOMS.find(r => r.id === roomId);
  if (!room) return;
  state.selectedRoom = room;
  switchTab('map');
  setTimeout(() => {
    openRoom(roomId);
    setTimeout(startNavigation3D, 400);
  }, 300);
}

// ============================================================
// INITIALIZATION
// ============================================================

// Event listeners per navigation
document.querySelectorAll('.nav-item').forEach(item => {
  if (item.dataset.tab) item.addEventListener('click', () => switchTab(item.dataset.tab));
});
document.querySelectorAll('.side-item').forEach(item => {
  if (item.dataset.tab) item.addEventListener('click', () => switchTab(item.dataset.tab));
});

// Gestione touch
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, false);

// ---- AVVIO APP ----
window.addEventListener('load', async () => {
  // Carica dati dal backend
  await loadDataFromBackend();
  
  // Renderizza onboarding
  renderEntranceList();
  renderPlaceList();
  renderOnbClassList();
  
  console.log('🚀 Navi^FROM^gate avviato!');
});