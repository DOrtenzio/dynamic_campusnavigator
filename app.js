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
      // Update marker in case startPlace changed (but it doesn't after onboarding)
      if (typeof createStartMarker === 'function') createStartMarker();
    }
  }
  if (tab === 'rooms') renderRoomsList();
  if (tab === 'teachers') renderTeachersList();
  if (tab === 'classes') renderClassesList();
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toastText').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/* =========================================================
   ONBOARDING
   ========================================================= */

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
    !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q)
  ).slice(0, 40);
  document.getElementById('placeList').innerHTML = filtered.map(r => {
    const bld = BUILDINGS.find(b => b.id === r.building);
    return `
      <div class="list-item" data-type="room" data-id="${r.id}">
        <div class="list-icon" style="background:${bld.color}">${ICONS[r.type] || ICONS.class}</div>
        <div class="list-info">
          <div class="list-name">${r.name}</div>
          <div class="list-meta">
            <span class="tag" style="background:${bld.color}">${r.building}</span>
            Piano ${r.floor} · ${r.subject}
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
    return `
      <div class="list-item" data-type="class" data-id="${c.id}">
        <div class="list-icon" style="background:${bld.color}">${ICONS.classGroup}</div>
        <div class="list-info">
          <div class="list-name">Classe ${c.name}</div>
          <div class="list-meta">
            <span class="tag" style="background:${bld.color}">${c.building}</span>
            ${c.students} studenti · Aula ${c.classroom}
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
    startLabel = `Aula ${state.startPlace.id}`;
  } else if (state.startPlace.type === 'class') {
    startLabel = `Classe ${state.startPlace.id}`;
  } else if (state.startPlace.id === 'back') {
    startLabel = 'Ingresso Secondario';
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
  const days = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const months = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const d = new Date();
  document.getElementById('greetingDate').textContent = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

/* =========================================================
   HOME CONTENT
   ========================================================= */

function renderBuildingsGrid() {
  document.getElementById('buildingsGrid').innerHTML = BUILDINGS.map(b => `
    <div class="clay-card bld-card" style="--bld-color:${b.color}" onclick="focusBuilding3D('${b.id}')">
      <div class="bld-icon" style="background:${b.color}">${ICONS[b.icon]}</div>
      <div class="bld-name">${b.name}</div>
      <div class="bld-meta">
        <span>${b.subtitle}</span> · 
        <span>${b.rooms} aule</span>
      </div>
    </div>
  `).join('');
}

function focusBuilding3D(bldId) {
  switchTab('map');
  setTimeout(() => setIndoorBuilding(bldId, 1), 100);
}

function renderPopular() {
  const popular = [
    { id: 'LIB', name: 'Biblioteca', meta: 'Palazzina A · Piano terra', color: '#9C89B8', icon: 'special' },
    { id: 'MENSA', name: 'Mensa', meta: 'Palazzina A · Piano terra', color: '#58A4B0', icon: 'special' },
    { id: 'LAB-INFO', name: 'Lab. Informatica', meta: 'Palazzina B · Piano 1', color: '#7FA37F', icon: 'lab' },
    { id: 'GYM1', name: 'Palestra 1', meta: 'Edificio separato', color: '#E8A87C', icon: 'gym' },
  ];
  document.getElementById('popularList').innerHTML = popular.map(p => `
    <div class="clay-card compact-item" onclick="openRoom('${p.id}')">
      <div class="compact-icon" style="background:${p.color}">${ICONS[p.icon]}</div>
      <div class="compact-info">
        <div class="compact-name">${p.name}</div>
        <div class="compact-meta">${p.meta}</div>
      </div>
      <div class="compact-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5l7 7-7 7"/></svg></div>
    </div>
  `).join('');
}

/* =========================================================
   AUTOCOMPLETE SEARCH
   ========================================================= */

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
      <div class="result-item" onclick="selectSearchResult('room','LIB')">
        <div class="result-icon" style="background:var(--accent-primary)">${ICONS.special}</div>
        <div class="result-info">
          <div class="result-name">Biblioteca</div>
          <div class="result-meta">Palazzina A · Silenzio & Studio</div>
        </div>
      </div>
      <div class="result-item" onclick="selectSearchResult('room','LAB-INFO')">
        <div class="result-icon" style="background:var(--accent-secondary)">${ICONS.lab}</div>
        <div class="result-info">
          <div class="result-name">Laboratorio Informatica</div>
          <div class="result-meta">Palazzina B · Postazioni PC</div>
        </div>
      </div>
      <div style="text-align:center;padding:32px 20px;color:var(--text-medium);font-size:13px;line-height:1.4">
        Cerca <b> aule</b>, <b> professori</b> e <b> classi</b>.
      </div>
    `;
  } else {
    const rooms = ROOMS.filter(r => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q)).slice(0, 6);
    const teachers = TEACHERS.filter(t => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)).slice(0, 6);
    const classes = CLASSES.filter(c => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)).slice(0, 6);
    if (rooms.length) {
      html += `<div class="search-category">Aule e Laboratori (${rooms.length})</div>`;
      html += rooms.map(r => {
        const bld = BUILDINGS.find(b => b.id === r.building);
        return `<div class="result-item" onclick="selectSearchResult('room','${r.id}')">
          <div class="result-icon" style="background:${bld.color}">${ICONS[r.type]||ICONS.class}</div>
          <div class="result-info">
            <div class="result-name">${r.name}</div>
            <div class="result-meta"><span class="tag" style="background:${bld.color}">${r.building}</span> Piano ${r.floor} · ${r.subject}</div>
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
            <div class="result-meta"><span class="tag" style="background:${bld.color}">${t.office}</span> Materia: ${t.subject}</div>
          </div>
        </div>`;
      }).join('');
    }
    if (classes.length) {
      html += `<div class="search-category">Classi (${classes.length})</div>`;
      html += classes.map(c => {
        const bld = BUILDINGS.find(b => b.id === c.building);
        return `<div class="result-item" onclick="selectSearchResult('class','${c.id}')">
          <div class="result-icon" style="background:${bld.color}">${ICONS.classGroup}</div>
          <div class="result-info">
            <div class="result-name">Classe ${c.name}</div>
            <div class="result-meta"><span class="tag" style="background:${bld.color}">${c.classroom}</span> Edificio ${c.building} · ${c.students} alunni</div>
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
      openRoom(teacher.office);
      showToast(`Ufficio del ${teacher.name}`);
    } else if (type === 'class') {
      const cls = CLASSES.find(c => c.id === id);
      openRoom(cls.classroom);
      showToast(`Aula della classe ${cls.name}`);
    }
  }, 200);
}

/* =========================================================
   ROOMS EXPLORE
   ========================================================= */

function renderRoomFilters() {
  const buildings = ['all', ...BUILDINGS.filter(b => b.floors > 0).map(b => b.id)];
  const bldHtml = buildings.map(b => {
    const label = b === 'all' ? 'Tutti gli edifici' : BUILDINGS.find(x => x.id === b).name;
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
      if (!r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q) && !r.subject.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const grouped = {};
  filtered.forEach(r => { if (!grouped[r.building]) grouped[r.building] = []; grouped[r.building].push(r); });
  let html = `<div class="results-summary"><span>${filtered.length} aule trovate</span></div>`;
  Object.entries(grouped).forEach(([bldId, rooms]) => {
    const bld = BUILDINGS.find(b => b.id === bldId);
    html += `<div class="group-header">${bld.name} <span class="group-count">${rooms.length}</span></div>`;
    html += rooms.slice(0, 20).map(r => `
      <div class="clay-card result-item" onclick="openRoom('${r.id}')">
        <div class="result-icon" style="background:${bld.color}">${ICONS[r.type]||ICONS.class}</div>
        <div class="result-info">
          <div class="result-name">${r.name} <span class="tag" style="background:${bld.color}">${r.id}</span></div>
          <div class="result-meta">Piano ${r.floor} · ${r.subject}</div>
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

/* =========================================================
   TEACHERS EXPLORE
   ========================================================= */

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
      if (!t.name.toLowerCase().includes(q) && !t.subject.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  filtered.sort((a, b) => a.lastName.localeCompare(b.lastName));
  const grouped = {};
  filtered.forEach(t => { const letter = t.lastName[0]; if (!grouped[letter]) grouped[letter] = []; grouped[letter].push(t); });
  let html = `<div class="results-summary"><span>${filtered.length} professori trovati</span></div>`;
  Object.entries(grouped).forEach(([letter, teachers]) => {
    html += `<div class="group-header">${letter} <span class="group-count">${teachers.length}</span></div>`;
    html += teachers.map(t => {
      const bld = BUILDINGS.find(b => b.id === t.building);
      return `
        <div class="clay-card result-item" onclick="openRoom('${t.office}')">
          <div class="result-icon" style="background:var(--accent-terracotta)">${ICONS.teacher}</div>
          <div class="result-info">
            <div class="result-name">${t.name}</div>
            <div class="result-meta"><span class="tag" style="background:${bld.color}">${t.office}</span> Dipartimento: ${t.department} · ${t.subject}</div>
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

/* =========================================================
   CLASSES EXPLORE
   ========================================================= */

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
      return `
        <div class="clay-card result-item" onclick="openRoom('${c.classroom}')">
          <div class="result-icon" style="background:${bld.color}">${ICONS.classGroup}</div>
          <div class="result-info">
            <div class="result-name">Classe ${c.name}</div>
            <div class="result-meta"><span class="tag" style="background:${bld.color}">${c.classroom}</span> ${c.students} studenti · Edificio ${c.building}</div>
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

/* =========================================================
   DETAILS BOTTOM SHEET
   ========================================================= */

function openRoom(roomId) {
  const room = ROOMS.find(r => r.id === roomId);
  if (!room) { showToast('Aula non trovata'); return; }
  state.selectedRoom = room;
  const bld = BUILDINGS.find(b => b.id === room.building);
  document.getElementById('sheetTitle').textContent = room.name;
  document.getElementById('sheetBld').textContent = bld.name;
  document.getElementById('sheetBld').style.background = bld.color;
  document.getElementById('sheetFloor').textContent = 'Piano ' + room.floor;
  let descText = 'Materia principale: ' + room.subject;
  if (room.id.endsWith('SC')) descText = 'Vano scale antincendio / Ascensori di collegamento tra i piani.';
  else if (room.id.endsWith('WC')) descText = 'Servizi igienici di piano dell\'edificio.';
  document.getElementById('sheetSubject').textContent = descText;
  document.getElementById('sheetIcon').style.background = bld.color;
  document.getElementById('sheetIcon').innerHTML = ICONS[room.type] || ICONS.class;
  document.getElementById('roomSheet').classList.add('open');
  if (state.currentTab !== 'map') switchTab('map');
  setTimeout(() => setIndoorBuilding(room.building, room.floor), 120);
}

function closeSheet() {
  document.getElementById('roomSheet').classList.remove('open');
}

/* =========================================================
   3D NAVIGATION CONTROLS
   ========================================================= */

function startNavigation3D() {
  if (!state.selectedRoom) return;
  closeSheet();
  const room = state.selectedRoom;
  const bld = BUILDINGS.find(b => b.id === room.building);
  document.getElementById('navDestName').textContent = room.name;
  document.getElementById('navDestBld').textContent = `${bld.name} · Piano ${room.floor}`;

  // Draw the path AND get back the real route data (length, building hops),
  // instead of estimating distance from the camera's current look-at point,
  // which drifts every time the user drags or zooms and made the previous
  // distance/time numbers meaningless.
  const route = draw3DNavigationPath(state.startPlace, room);
  const distance = route ? Math.round(route.totalLength * 2.8) : 0;
  document.getElementById('navDestDist').textContent = distance + ' metri';
  document.getElementById('navDestTime').textContent = Math.max(1, Math.round(distance / 70)) + ' min';

  // Plain-language steps, so the route isn't something the user has to
  // decode by staring at a line on the 3D map.
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


window.addEventListener('load', () => {
  renderEntranceList();
  renderPlaceList();
  renderOnbClassList();
});

document.querySelectorAll('.nav-item').forEach(item => {
  if (item.dataset.tab) item.addEventListener('click', () => switchTab(item.dataset.tab));
});
document.querySelectorAll('.side-item').forEach(item => {
  if (item.dataset.tab) item.addEventListener('click', () => switchTab(item.dataset.tab));
});

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, false);