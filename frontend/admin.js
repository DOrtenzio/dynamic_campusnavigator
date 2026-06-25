let adminToken = localStorage.getItem('adminToken');
let adminTeachers = [];
let adminRooms = [];
let adminBuildings = [];
let adminSchedule = {};
let adminCurrentTab = 'teachers';
let adminTeacherPage = 0;
let adminRoomPage = 0;
const PAGE_SIZE = 20;
let adminSelectedBuilding = null;
let adminEditingTeacher = null;
let adminEditingRoom = null;

async function apiRequest(method, endpoint, body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore API');
  }
  if (res.status === 204) return null;
  return res.json();
}

async function loadInitialData() {
  try {
    const [teachers, rooms, buildings, schedule] = await Promise.all([
      apiRequest('GET', '/teachers'),
      apiRequest('GET', '/rooms'),
      apiRequest('GET', '/buildings'),
      apiRequest('GET', '/schedule')
    ]);
    adminTeachers = teachers;
    adminRooms = rooms;
    adminBuildings = buildings;
    adminSchedule = schedule;
  } catch (err) {
    console.error('Errore caricamento dati', err);
    showToast('Errore nel caricamento dei dati');
  }
}

// ── LOGIN ──────────────────────────────────────────────────
function openAdminLogin() {
  document.getElementById('adminOverlay').style.display = 'block';
  document.getElementById('adminLoginModal').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('adminLoginError').style.display = 'none';
  document.getElementById('adminPSK').value = '';
  document.getElementById('adminAuthCode').value = '';
  setTimeout(() => document.getElementById('adminPSK').focus(), 100);
}

async function submitAdminLogin() {
  const psk = document.getElementById('adminPSK').value.trim();
  const totp = document.getElementById('adminAuthCode').value.trim();
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ psk, totp })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    adminToken = data.token;
    localStorage.setItem('adminToken', adminToken);
    document.getElementById('adminLoginModal').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'flex';
    await loadInitialData();
    adminTab('teachers');
    showToast('Accesso effettuato');
  } catch (err) {
    document.getElementById('adminLoginError').style.display = 'block';
    document.getElementById('adminLoginError').textContent = err.message;
  }
}

// Allow Enter key in login
document.addEventListener('keydown', e => {
  const overlay = document.getElementById('adminOverlay');
  if (overlay && overlay.style.display !== 'none') {
    if (e.key === 'Enter') {
      const modal = document.getElementById('adminLoginModal');
      if (modal && modal.style.display !== 'none') submitAdminLogin();
    }
    if (e.key === 'Escape') closeAdminPanel();
  }
});

function closeAdminOverlay() {
  document.getElementById('adminOverlay').style.display = 'none';
}

async function closeAdminPanel() {
  // Sincronizza i dati globali con il backend
  try {
    const [teachers, rooms, buildings] = await Promise.all([
      apiRequest('GET', '/teachers'),
      apiRequest('GET', '/rooms'),
      apiRequest('GET', '/buildings')
    ]);
    // Aggiorna i globali
    TEACHERS.length = 0; teachers.forEach(t => TEACHERS.push(t));
    ROOMS.length = 0; rooms.forEach(r => ROOMS.push(r));
    BUILDINGS.length = 0; buildings.forEach(b => BUILDINGS.push(b));
    // Ricarica la mappa se inizializzata
    if (typeof mapInitialized !== 'undefined' && mapInitialized) {
      if (typeof buildCampus3D === 'function') {
        while(campusGroup.children.length) campusGroup.remove(campusGroup.children[0]);
        buildingMeshes = {};
        activeIndoorBuilding = null;
        buildCampus3D();
        createStartMarker();
        resetMapView();
      }
    }
    showToast('Dati sincronizzati con il backend');
  } catch (err) {
    console.error('Errore sincronizzazione', err);
    showToast('Errore nel salvataggio dei dati');
  }
  closeAdminOverlay();
  localStorage.removeItem('adminToken');
}

// ── TAB ROUTING ───────────────────────────────────────────
function adminTab(name) {
  adminCurrentTab = name;
  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(`'${name}'`));
  });
  const content = document.getElementById('adminContent');
  content.innerHTML = '';
  if (name === 'teachers') renderAdminTeachers();
  if (name === 'rooms') renderAdminRooms();
  if (name === 'schedule') renderAdminSchedule();
  if (name === 'map') renderAdminMap();
  if (name === 'csv') renderAdminCSV();
}

// ── TEACHERS ──────────────────────────────────────────────
function renderAdminTeachers(filter = '') {
  const q = filter.toLowerCase();
  const filtered = adminTeachers.filter(t =>
    !q || t.name.toLowerCase().includes(q) ||
    t.department.toLowerCase().includes(q) ||
    t.subject.toLowerCase().includes(q)
  );
  const total = filtered.length;
  const page = adminTeacherPage;
  const slice = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const depts = [...new Set(adminTeachers.map(t => t.department))];

  document.getElementById('adminContent').innerHTML = `
    <div class="admin-section-title">Professori</div>
    <div class="admin-section-sub">Gestione docenti — ${total} professori in organico</div>

    <div class="admin-stats">
      ${depts.map(d => {
        const count = adminTeachers.filter(t => t.department === d).length;
        const colors = {'Lettere':'#FF7E67','Scientifico':'#58A4B0','Lingue':'#FC642D','Arte':'#9C89B8','Motoria':'#E8A87C','Tecnologico':'#88B04B'};
        return `<div class="admin-stat-chip"><span class="admin-stat-dot" style="background:${colors[d]||'#D4A373'}"></span>${d} (${count})</div>`;
      }).join('')}
    </div>

    <div class="admin-toolbar">
      <input type="text" placeholder="🔍 Cerca per nome, dipartimento, materia..." 
        oninput="adminTeacherPage=0; renderAdminTeachers(this.value)" id="teacherSearchAdmin">
      <button class="admin-btn admin-btn-primary" onclick="openTeacherForm(null)">+ Aggiungi</button>
      <button class="admin-btn admin-btn-secondary" onclick="exportTeachersCSV()">↓ Esporta CSV</button>
    </div>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th><th>Nome</th><th>Dipartimento</th><th>Materia</th>
            <th>Edificio</th><th>Ufficio</th><th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          ${slice.map(t => `
            <tr>
              <td><span class="admin-tag">${t.id}</span></td>
              <td style="font-weight:600">${t.name}</td>
              <td>${t.department}</td>
              <td>${t.subject}</td>
              <td>${t.building}</td>
              <td>${t.office}</td>
              <td class="cell-actions">
                <button class="admin-btn admin-btn-secondary" onclick="openTeacherForm('${t.id}')">✏️</button>
                <button class="admin-btn admin-btn-danger" onclick="confirmDeleteTeacher('${t.id}')">🗑️</button>
              </td>
            </tr>
          `).join('')}
          ${slice.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:#999;padding:24px">Nessun risultato</td></tr>` : ''}
        </tbody>
      </table>
    </div>
    ${renderPagination(total, PAGE_SIZE, page, 'adminTeacherPage', `renderAdminTeachers(document.getElementById('teacherSearchAdmin')?.value||'')`)}
  `;
}

function openTeacherForm(id) {
  const t = id ? adminTeachers.find(x => x.id === id) : null;
  const DEPTS = ['Lettere','Scientifico','Lingue','Arte','Motoria','Tecnologico'];
  const allSubjects = ['Italiano','Matematica','Inglese','Storia','Geografia','Scienze','Fisica','Chimica',
    'Filosofia','Arte','Musica','Diritto','Economia','Informatica','Latino','Greco','Religione',
    'Francese','Spagnolo','Tedesco','Motoria','Storia dell\'arte'];

  const modal = document.createElement('div');
  modal.className = 'admin-confirm';
  modal.id = 'teacherFormModal';
  modal.innerHTML = `
    <div class="admin-confirm-box" style="width:min(500px,96vw);text-align:left;max-height:90vh;overflow-y:auto;">
      <h3>${t ? 'Modifica Professore' : 'Nuovo Professore'}</h3>
      <div class="admin-form-grid" style="margin-top:14px;">
        <div class="admin-field">
          <label>Titolo</label>
          <select id="tf_title">
            <option ${t?.name.startsWith('Prof.ssa')?'selected':''}>Prof.ssa</option>
            <option ${t?.name.startsWith('Prof.')&&!t?.name.startsWith('Prof.ssa')?'selected':''}>Prof.</option>
          </select>
        </div>
        <div class="admin-field">
          <label>Nome</label>
          <input type="text" id="tf_first" value="${t?.firstName||''}">
        </div>
        <div class="admin-field">
          <label>Cognome</label>
          <input type="text" id="tf_last" value="${t?.lastName||''}">
        </div>
        <div class="admin-field">
          <label>Dipartimento</label>
          <select id="tf_dept">
            ${DEPTS.map(d => `<option ${t?.department===d?'selected':''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="admin-field">
          <label>Materia</label>
          <select id="tf_subject">
            ${allSubjects.map(s => `<option ${t?.subject===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="admin-field">
          <label>Edificio</label>
          <select id="tf_bld">
            ${adminBuildings.filter(b=>['A','B','C','D'].includes(b.id)).map(b => `<option ${t?.building===b.id?'selected':''}>${b.id}</option>`).join('')}
          </select>
        </div>
        <div class="admin-field">
          <label>Piano (1-4)</label>
          <input type="number" id="tf_floor" min="1" max="4" value="${t?.floor||1}">
        </div>
        <div class="admin-field">
          <label>Codice Ufficio</label>
          <input type="text" id="tf_office" value="${t?.office||''}">
        </div>
      </div>
      <div class="btns" style="margin-top:20px;">
        <button class="admin-btn admin-btn-primary" style="flex:1" onclick="saveTeacherForm('${id||''}')">Salva</button>
        <button class="admin-btn admin-btn-secondary" style="flex:1" onclick="closeTeacherForm()">Annulla</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveTeacherForm(id) {
  const title = document.getElementById('tf_title').value;
  const first = document.getElementById('tf_first').value.trim();
  const last = document.getElementById('tf_last').value.trim();
  const dept = document.getElementById('tf_dept').value;
  const subject = document.getElementById('tf_subject').value;
  const bld = document.getElementById('tf_bld').value;
  const floor = parseInt(document.getElementById('tf_floor').value) || 1;
  const office = document.getElementById('tf_office').value.trim();

  if (!first || !last) { alert('Nome e cognome sono obbligatori'); return; }

  const teacherData = {
    name: `${title} ${first} ${last}`,
    firstName: first,
    lastName: last,
    department: dept,
    subject,
    building: bld,
    floor,
    office: office || `${bld}-${floor}01`
  };
  try {
    if (id) {
      await apiRequest('PUT', `/teachers/${id}`, teacherData);
    } else {
      await apiRequest('POST', '/teachers', teacherData);
    }
    await loadInitialData();
    renderAdminTeachers();
    closeTeacherForm();
    showToast('Professore salvato');
  } catch (err) {
    alert('Errore: ' + err.message);
  }
}

function closeTeacherForm() {
  document.getElementById('teacherFormModal')?.remove();
}

async function confirmDeleteTeacher(id) {
  const t = adminTeachers.find(x => x.id === id);
  adminConfirm(`Eliminare ${t?.name}?`, 'Questa azione rimuove il professore dalla piattaforma.', async () => {
    try {
      await apiRequest('DELETE', `/teachers/${id}`);
      await loadInitialData();
      renderAdminTeachers();
      showToast('Professore eliminato');
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  });
}

async function exportTeachersCSV() {
  try {
    const res = await fetch(`${API_BASE}/csv/export/teachers`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'professori.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Errore esportazione: ' + err.message);
  }
}

// ── ROOMS ──────────────────────────────────────────────────
function renderAdminRooms(filter = '') {
  const q = filter.toLowerCase();
  const filtered = adminRooms.filter(r =>
    !q || r.id.toLowerCase().includes(q) ||
    r.name.toLowerCase().includes(q) ||
    r.subject?.toLowerCase().includes(q) ||
    r.building.toLowerCase().includes(q)
  );
  const total = filtered.length;
  const slice = filtered.slice(adminRoomPage * PAGE_SIZE, (adminRoomPage + 1) * PAGE_SIZE);
  const types = [...new Set(adminRooms.map(r => r.type))];

  document.getElementById('adminContent').innerHTML = `
    <div class="admin-section-title">Aule e Spazi</div>
    <div class="admin-section-sub">Gestione spazi del campus — ${total} spazi totali</div>

    <div class="admin-stats">
      ${types.map(type => {
        const count = adminRooms.filter(r => r.type === type).length;
        const colors = { class:'#58A4B0', lab:'#7FA37F', office:'#C9A868', special:'#9C89B8' };
        return `<div class="admin-stat-chip"><span class="admin-stat-dot" style="background:${colors[type]||'#D4A373'}"></span>${type} (${count})</div>`;
      }).join('')}
    </div>

    <div class="admin-toolbar">
      <input type="text" placeholder="🔍 Cerca per codice, nome, materia, edificio..." 
        oninput="adminRoomPage=0; renderAdminRooms(this.value)" id="roomSearchAdmin">
      <button class="admin-btn admin-btn-primary" onclick="openRoomForm(null)">+ Aggiungi</button>
      <button class="admin-btn admin-btn-secondary" onclick="exportRoomsCSV()">↓ Esporta CSV</button>
    </div>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th><th>Nome</th><th>Tipo</th><th>Edificio</th>
            <th>Piano</th><th>Materia</th><th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          ${slice.map(r => {
            const typeColors = { class:'#58A4B0', lab:'#7FA37F', office:'#C9A868', special:'#9C89B8' };
            return `
              <tr>
                <td><span class="admin-tag">${r.id}</span></td>
                <td style="font-weight:600">${r.name}</td>
                <td><span class="admin-tag" style="background:${typeColors[r.type]||'#EDE7DA'};color:#fff">${r.type}</span></td>
                <td>${r.building}</td>
                <td>${r.floor ?? '—'}</td>
                <td>${r.subject||'—'}</td>
                <td class="cell-actions">
                  <button class="admin-btn admin-btn-secondary" onclick="openRoomForm('${r.id}')">✏️</button>
                  <button class="admin-btn admin-btn-danger" onclick="confirmDeleteRoom('${r.id}')">🗑️</button>
                </td>
              </tr>
            `;
          }).join('')}
          ${slice.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:#999;padding:24px">Nessun risultato</td></tr>` : ''}
        </tbody>
      </table>
    </div>
    ${renderPagination(total, PAGE_SIZE, adminRoomPage, 'adminRoomPage', `renderAdminRooms(document.getElementById('roomSearchAdmin')?.value||'')`)}
  `;
}

function openRoomForm(id) {
  const r = id ? adminRooms.find(x => x.id === id) : null;
  const SUBJECTS = ['Italiano','Matematica','Inglese','Storia','Scienze','Fisica','Chimica','Informatica','Arte','Musica','Collegamento Verticale','Servizi Igienici','Studio','Eventi','Pranzo','Generico'];
  const TYPES = ['class','lab','office','special'];

  const modal = document.createElement('div');
  modal.className = 'admin-confirm';
  modal.id = 'roomFormModal';
  modal.innerHTML = `
    <div class="admin-confirm-box" style="width:min(520px,96vw);text-align:left;max-height:90vh;overflow-y:auto;">
      <h3>${r ? 'Modifica Aula' : 'Nuova Aula / Spazio'}</h3>
      <div class="admin-form-grid" style="margin-top:14px;">
        <div class="admin-field">
          <label>Codice ID</label>
          <input type="text" id="rf_id" value="${r?.id||''}" ${r?'disabled':''} placeholder="Es. A-204">
        </div>
        <div class="admin-field">
          <label>Nome visualizzato</label>
          <input type="text" id="rf_name" value="${r?.name||''}" placeholder="Es. Aula A-204">
        </div>
        <div class="admin-field">
          <label>Tipo</label>
          <select id="rf_type">
            ${TYPES.map(t => `<option ${r?.type===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="admin-field">
          <label>Edificio</label>
          <select id="rf_bld">
            ${adminBuildings.map(b => `<option ${r?.building===b.id?'selected':''}>${b.id}</option>`).join('')}
          </select>
        </div>
        <div class="admin-field">
          <label>Piano</label>
          <input type="number" id="rf_floor" min="0" max="6" value="${r?.floor??1}">
        </div>
        <div class="admin-field">
          <label>Materia / Uso</label>
          <select id="rf_subject">
            ${SUBJECTS.map(s => `<option ${r?.subject===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="admin-field">
          <label>Posizione X (campus)</label>
          <input type="number" id="rf_x" value="${r?.x??0}" step="0.5">
        </div>
        <div class="admin-field">
          <label>Posizione Z (campus)</label>
          <input type="number" id="rf_z" value="${r?.z??0}" step="0.5">
        </div>
        <div class="admin-field">
          <label>Larghezza (m)</label>
          <input type="number" id="rf_w" value="${r?.w??2}" step="0.5" min="0.5">
        </div>
        <div class="admin-field">
          <label>Profondità (m)</label>
          <input type="number" id="rf_d" value="${r?.d??2}" step="0.5" min="0.5">
        </div>
      </div>
      <div class="btns" style="margin-top:20px;">
        <button class="admin-btn admin-btn-primary" style="flex:1" onclick="saveRoomForm('${id||''}')">Salva</button>
        <button class="admin-btn admin-btn-secondary" style="flex:1" onclick="closeRoomForm()">Annulla</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveRoomForm(id) {
  const rid = id || document.getElementById('rf_id').value.trim();
  const name = document.getElementById('rf_name').value.trim();
  const type = document.getElementById('rf_type').value;
  const bld = document.getElementById('rf_bld').value;
  const floor = parseInt(document.getElementById('rf_floor').value) || 1;
  const subject = document.getElementById('rf_subject').value;
  const x = parseFloat(document.getElementById('rf_x').value) || 0;
  const z = parseFloat(document.getElementById('rf_z').value) || 0;
  const w = parseFloat(document.getElementById('rf_w').value) || 2;
  const d = parseFloat(document.getElementById('rf_d').value) || 2;

  if (!rid || !name) { alert('ID e nome sono obbligatori'); return; }

  const colorMap = { class: 0x93B5C6, lab: 0x7FA37F, office: 0xC9A868, special: 0x95A5A6 };
  const roomData = { id: rid, name, type, building: bld, floor, subject, x, z, w, d, color: colorMap[type] || 0x93B5C6 };

  try {
    if (id) {
      await apiRequest('PUT', `/rooms/${id}`, roomData);
    } else {
      if (adminRooms.find(r => r.id === rid)) { alert('ID già esistente'); return; }
      await apiRequest('POST', '/rooms', roomData);
    }
    await loadInitialData();
    renderAdminRooms();
    closeRoomForm();
    showToast('Aula salvata');
  } catch (err) {
    alert('Errore: ' + err.message);
  }
}

function closeRoomForm() { document.getElementById('roomFormModal')?.remove(); }

async function confirmDeleteRoom(id) {
  const r = adminRooms.find(x => x.id === id);
  adminConfirm(`Eliminare ${r?.name}?`, 'Lo spazio verrà rimosso dalla mappa.', async () => {
    try {
      await apiRequest('DELETE', `/rooms/${id}`);
      await loadInitialData();
      renderAdminRooms();
      showToast('Aula eliminata');
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  });
}

async function exportRoomsCSV() {
  try {
    const res = await fetch(`${API_BASE}/csv/export/rooms`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aule.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Errore esportazione: ' + err.message);
  }
}

const DAYS = ['LUN','MAR','MER','GIO','VEN'];
const SCHEDULE_COLORS = {
  'Italiano':'#FF7E67','Matematica':'#58A4B0','Inglese':'#FC642D','Storia':'#9C89B8',
  'Scienze':'#88B04B','Fisica':'#E8A87C','Arte':'#F7C59F','Informatica':'#5AA9E6',
  'default':'#D4A373'
};
let adminScheduleSelectedClass = null;

function renderAdminSchedule() {
  // Initialize schedule if empty
  if (Object.keys(adminSchedule).length === 0) {
    const sampleClass = CLASSES[0]?.id || '1A';
    adminSchedule[sampleClass] = {};
    DAYS.forEach(day => {
      adminSchedule[sampleClass][day] = {};
      HOURS.forEach((h, i) => {
        const subj = ['Italiano','Matematica','Inglese','Storia','Scienze','Fisica'][i % 6];
        const teacher = adminTeachers.find(t => t.subject === subj);
        adminSchedule[sampleClass][day][i] = { subject: subj, teacher: teacher?.name || '—', room: `A-${Math.floor(Math.random()*10+101)}` };
      });
    });
    // Save to backend? For now, just local. We'll save on changes.
  }

  const classIds = [...new Set([...Object.keys(adminSchedule), ...CLASSES.map(c => c.id)])];
  const selectedClass = adminScheduleSelectedClass || classIds[0];
  if (!adminScheduleSelectedClass) adminScheduleSelectedClass = selectedClass;

  const schedule = adminSchedule[selectedClass] || {};

  document.getElementById('adminContent').innerHTML = `
    <div class="admin-section-title">Gestione Orari</div>
    <div class="admin-section-sub">Orario settimanale per classe — click su una cella per modificare</div>

    <div class="admin-toolbar">
      <select id="scheduleClassSelect" onchange="adminScheduleSelectedClass=this.value; renderAdminSchedule()">
        ${classIds.map(id => `<option ${id===selectedClass?'selected':''}>${id}</option>`).join('')}
      </select>
      <button class="admin-btn admin-btn-primary" onclick="addScheduleClass()">+ Nuova classe</button>
      <button class="admin-btn admin-btn-secondary" onclick="exportScheduleCSV()">↓ Esporta CSV</button>
      <button class="admin-btn admin-btn-success" onclick="clearSchedule()">🗑️ Svuota</button>
    </div>

    <div style="overflow-x:auto;">
      <div class="schedule-grid" style="min-width:500px;">
        <div class="schedule-cell schedule-cell-header">Ora</div>
        ${DAYS.map(d => `<div class="schedule-cell schedule-cell-header">${d}</div>`).join('')}
        ${HOURS.map((h, hi) => `
          <div class="schedule-cell schedule-cell-time" style="font-size:10px;">${h}</div>
          ${DAYS.map(day => {
            const lesson = schedule[day]?.[hi];
            const color = lesson ? (SCHEDULE_COLORS[lesson.subject] || SCHEDULE_COLORS.default) : '#F5F0E8';
            const textColor = lesson ? '#fff' : '#CCC';
            return `
              <div class="schedule-cell" style="cursor:pointer" onclick="openLessonEditor('${selectedClass}','${day}',${hi})">
                ${lesson ? `<div class="schedule-cell-lesson" style="background:${color};color:${textColor}">
                  <div>${lesson.subject}</div>
                  <div style="font-size:9px;opacity:0.9">${lesson.room}</div>
                </div>` : `<div style="color:#DDD;font-size:18px;line-height:1">+</div>`}
              </div>
            `;
          }).join('')}
        `).join('')}
      </div>
    </div>
  `;
}

function openLessonEditor(classId, day, hour) {
  const existing = adminSchedule[classId]?.[day]?.[hour];
  const SUBJECTS = ['Italiano','Matematica','Inglese','Storia','Geografia','Scienze','Fisica','Chimica','Arte','Musica','Informatica','Latino','Filosofia','Diritto','Economia','Religione'];

  const modal = document.createElement('div');
  modal.className = 'admin-confirm';
  modal.id = 'lessonModal';
  modal.innerHTML = `
    <div class="admin-confirm-box" style="width:min(380px,96vw);text-align:left;">
      <h3>${existing ? 'Modifica lezione' : 'Aggiungi lezione'}</h3>
      <p style="margin-bottom:14px;">${classId} · ${day} · ${HOURS[hour]}</p>
      <div class="admin-field">
        <label>Materia</label>
        <select id="le_subject">
          ${SUBJECTS.map(s => `<option ${existing?.subject===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="admin-field">
        <label>Professore</label>
        <select id="le_teacher">
          ${adminTeachers.map(t => `<option ${existing?.teacher===t.name?'selected':''}>${t.name}</option>`).join('')}
        </select>
      </div>
      <div class="admin-field">
        <label>Aula</label>
        <select id="le_room">
          ${adminRooms.filter(r => r.type !== 'special').map(r => `<option ${existing?.room===r.id?'selected':''}>${r.id}</option>`).join('')}
        </select>
      </div>
      <div class="btns" style="margin-top:16px;">
        <button class="admin-btn admin-btn-primary" style="flex:1" onclick="saveLessonEditor('${classId}','${day}',${hour})">Salva</button>
        ${existing ? `<button class="admin-btn admin-btn-danger" style="flex:1" onclick="deleteLesson('${classId}','${day}',${hour})">Elimina</button>` : ''}
        <button class="admin-btn admin-btn-secondary" style="flex:1" onclick="closeLessonEditor()">Annulla</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveLessonEditor(classId, day, hour) {
  const lessonData = {
    subject: document.getElementById('le_subject').value,
    teacher: document.getElementById('le_teacher').value,
    room: document.getElementById('le_room').value
  };
  try {
    await apiRequest('PATCH', `/schedule/${classId}/${day}/${hour}`, lessonData);
    await loadInitialData();
    renderAdminSchedule();
    closeLessonEditor();
    showToast('Lezione salvata');
  } catch (err) {
    alert('Errore: ' + err.message);
  }
}

async function deleteLesson(classId, day, hour) {
  try {
    await apiRequest('DELETE', `/schedule/${classId}/${day}/${hour}`);
    await loadInitialData();
    renderAdminSchedule();
    closeLessonEditor();
    showToast('Lezione eliminata');
  } catch (err) {
    alert('Errore: ' + err.message);
  }
}

function closeLessonEditor() { document.getElementById('lessonModal')?.remove(); }

async function addScheduleClass() {
  const id = prompt('ID classe (Es. 3A, 5B):')?.toUpperCase();
  if (!id) return;
  if (!adminSchedule[id]) adminSchedule[id] = {};
  // Salva sul backend (vuoto)
  try {
    await apiRequest('PUT', `/schedule/${id}`, {});
    await loadInitialData();
    adminScheduleSelectedClass = id;
    renderAdminSchedule();
    showToast('Classe aggiunta');
  } catch (err) {
    alert('Errore: ' + err.message);
  }
}

async function clearSchedule() {
  adminConfirm('Svuotare l\'orario?', `La classe ${adminScheduleSelectedClass} perderà tutte le lezioni.`, async () => {
    try {
      await apiRequest('PUT', `/schedule/${adminScheduleSelectedClass}`, {});
      await loadInitialData();
      renderAdminSchedule();
      showToast('Orario svuotato');
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  });
}

async function exportScheduleCSV() {
  const cls = adminScheduleSelectedClass;
  const schedule = adminSchedule[cls] || {};
  const headers = ['Ora', ...DAYS];
  const rows = HOURS.map((h, hi) => [
    h,
    ...DAYS.map(day => {
      const l = schedule[day]?.[hi];
      return l ? `${l.subject} (${l.teacher}) [${l.room}]` : '';
    })
  ]);
  // Export client-side (semplice)
  const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orario_${cls}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── MAP EDITOR ────────────────────────────────────────────
function renderAdminMap() {
  document.getElementById('adminContent').innerHTML = `
    <div class="admin-section-title">Editor Mappa Campus</div>
    <div class="admin-section-sub">Modifica edifici esistenti o aggiungine di nuovi — le modifiche si riflettono sulla mappa 3D al salvataggio</div>
    <div class="admin-map-editor">
      <div class="admin-map-list">
        <div class="admin-map-list-header">Edifici (${adminBuildings.length})</div>
        <div class="admin-map-list-body" id="bldListBody">
          ${adminBuildings.map(b => `
            <div class="admin-bld-item ${adminSelectedBuilding===b.id?'selected':''}" onclick="selectAdminBuilding('${b.id}')">
              <span class="admin-bld-dot" style="background:${b.color}"></span>
              <div>
                <div class="admin-bld-name">${b.id}</div>
                <div class="admin-bld-sub">${b.name} · ${b.floors} piani</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="padding:8px;">
          <button class="admin-btn admin-btn-primary" style="width:100%" onclick="openAddBuildingForm()">+ Nuova palazzina</button>
        </div>
      </div>
      <div class="admin-map-detail" id="bldDetailPanel">
        ${adminSelectedBuilding ? renderBuildingEditor(adminSelectedBuilding) : `
          <div style="text-align:center;padding:60px 20px;color:#999;">
            <div style="font-size:32px;margin-bottom:10px">🏫</div>
            <div style="font-weight:600">Seleziona un edificio dalla lista</div>
            <div style="font-size:13px;margin-top:6px">oppure aggiungine uno nuovo</div>
          </div>
        `}
      </div>
    </div>
  `;
}

function selectAdminBuilding(id) {
  adminSelectedBuilding = id;
  renderAdminMap();
}

function renderBuildingEditor(id) {
  const b = adminBuildings.find(x => x.id === id);
  if (!b) return '';
  const roomsInBld = adminRooms.filter(r => r.building === id);
  return `
    <div class="admin-form-title">
      <span style="width:16px;height:16px;border-radius:4px;background:${b.color};display:inline-block;flex-shrink:0;"></span>
      ${b.name} (${b.id})
    </div>
    <div class="admin-form-grid">
      <div class="admin-field">
        <label>Nome palazzina</label>
        <input type="text" id="be_name" value="${b.name}">
      </div>
      <div class="admin-field">
        <label>Sottotitolo</label>
        <input type="text" id="be_subtitle" value="${b.subtitle||''}">
      </div>
      <div class="admin-field">
        <label>Colore</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="color" id="be_color" value="${b.color}" style="width:48px;height:36px;border:1px solid #E0D8CE;border-radius:8px;cursor:pointer;">
          <input type="text" id="be_colorHex" value="${b.color}" style="flex:1;" oninput="document.getElementById('be_color').value=this.value">
        </div>
      </div>
      <div class="admin-field">
        <label>Numero piani</label>
        <input type="number" id="be_floors" value="${b.floors}" min="0" max="10">
      </div>
      <div class="admin-field">
        <label>Posizione X</label>
        <input type="number" id="be_x" value="${b.x}" step="1">
      </div>
      <div class="admin-field">
        <label>Posizione Z</label>
        <input type="number" id="be_z" value="${b.z}" step="1">
      </div>
      <div class="admin-field">
        <label>Larghezza (unità 3D)</label>
        <input type="number" id="be_w" value="${b.w}" step="0.5" min="2">
      </div>
      <div class="admin-field">
        <label>Profondità (unità 3D)</label>
        <input type="number" id="be_d" value="${b.d}" step="0.5" min="2">
      </div>
    </div>

    <div style="margin-top:4px;margin-bottom:16px;font-size:12px;color:#888;">
      ⚠ Modificare posizione/dimensioni richiede ricaricamento della mappa 3D (applica e ricarica).
    </div>

    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
      <button class="admin-btn admin-btn-primary" onclick="saveBuildingEdit('${id}')">💾 Salva modifiche</button>
      <button class="admin-btn admin-btn-danger" onclick="confirmDeleteBuilding('${id}')">🗑️ Elimina edificio</button>
      <button class="admin-btn admin-btn-secondary" onclick="applyAndReloadMap()">🔄 Applica e ricarica mappa 3D</button>
    </div>

    <div style="font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;margin-bottom:10px;">
      Aule in questo edificio (${roomsInBld.length})
    </div>
    <div class="admin-toolbar" style="margin-bottom:10px;">
      <button class="admin-btn admin-btn-primary" onclick="openRoomForm(null); document.getElementById('rf_bld').value='${id}'">+ Aggiungi aula a ${id}</button>
    </div>
    <div class="admin-table-wrap" style="max-height:220px;overflow-y:auto;">
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Nome</th><th>Tipo</th><th>Piano</th><th>Azioni</th></tr></thead>
        <tbody>
          ${roomsInBld.slice(0,30).map(r => `
            <tr>
              <td><span class="admin-tag">${r.id}</span></td>
              <td>${r.name}</td>
              <td>${r.type}</td>
              <td>${r.floor??'—'}</td>
              <td class="cell-actions">
                <button class="admin-btn admin-btn-secondary" onclick="openRoomForm('${r.id}')">✏️</button>
                <button class="admin-btn admin-btn-danger" onclick="confirmDeleteRoom('${r.id}');renderAdminMap()">🗑️</button>
              </td>
            </tr>
          `).join('')}
          ${roomsInBld.length > 30 ? `<tr><td colspan="5" style="text-align:center;color:#999;font-size:12px;">... e altri ${roomsInBld.length-30} spazi</td></tr>` : ''}
        </tbody>
      </table>
    </div>
  `;
}

async function saveBuildingEdit(id) {
  const bldData = {
    name: document.getElementById('be_name').value.trim(),
    subtitle: document.getElementById('be_subtitle').value.trim(),
    color: document.getElementById('be_colorHex').value.trim() || document.getElementById('be_color').value,
    floors: parseInt(document.getElementById('be_floors').value) || 1,
    x: parseFloat(document.getElementById('be_x').value) || 0,
    z: parseFloat(document.getElementById('be_z').value) || 0,
    w: parseFloat(document.getElementById('be_w').value) || 8,
    d: parseFloat(document.getElementById('be_d').value) || 6
  };
  try {
    await apiRequest('PUT', `/buildings/${id}`, bldData);
    await loadInitialData();
    renderAdminMap();
    showToast('Edificio aggiornato');
  } catch (err) {
    alert('Errore: ' + err.message);
  }
}

async function openAddBuildingForm() {
  const modal = document.createElement('div');
  modal.className = 'admin-confirm';
  modal.id = 'addBldModal';
  modal.innerHTML = `
    <div class="admin-confirm-box" style="width:min(480px,96vw);text-align:left;max-height:90vh;overflow-y:auto;">
      <h3>Nuova Palazzina</h3>
      <div class="admin-form-grid" style="margin-top:14px;">
        <div class="admin-field">
          <label>ID (es. E, F, LAB2)</label>
          <input type="text" id="nb_id" placeholder="ID univoco">
        </div>
        <div class="admin-field">
          <label>Nome</label>
          <input type="text" id="nb_name" placeholder="Palazzina E">
        </div>
        <div class="admin-field">
          <label>Sottotitolo</label>
          <input type="text" id="nb_subtitle" placeholder="Es. Tecnologica">
        </div>
        <div class="admin-field">
          <label>Colore</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="color" id="nb_color" value="#58A4B0" style="width:48px;height:36px;border:1px solid #E0D8CE;border-radius:8px;cursor:pointer;">
            <span style="font-size:13px;color:#999">(scegli dal picker)</span>
          </div>
        </div>
        <div class="admin-field">
          <label>Piani</label>
          <input type="number" id="nb_floors" value="3" min="0" max="10">
        </div>
        <div class="admin-field">
          <label>Posizione X</label>
          <input type="number" id="nb_x" value="30" step="1">
        </div>
        <div class="admin-field">
          <label>Posizione Z</label>
          <input type="number" id="nb_z" value="0" step="1">
        </div>
        <div class="admin-field">
          <label>Larghezza</label>
          <input type="number" id="nb_w" value="8" step="0.5" min="2">
        </div>
        <div class="admin-field">
          <label>Profondità</label>
          <input type="number" id="nb_d" value="6" step="0.5" min="2">
        </div>
      </div>
      <div style="font-size:12px;color:#888;margin-top:8px;">
        💡 Suggerimento: posiziona il nuovo edificio a X > 30 o X < -30 per evitare sovrapposizioni.
      </div>
      <div class="btns" style="margin-top:16px;">
        <button class="admin-btn admin-btn-primary" style="flex:1" onclick="saveNewBuilding()">Aggiungi</button>
        <button class="admin-btn admin-btn-secondary" style="flex:1" onclick="document.getElementById('addBldModal').remove()">Annulla</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveNewBuilding() {
  const id = document.getElementById('nb_id').value.trim().toUpperCase();
  if (!id) { alert('ID obbligatorio'); return; }
  if (adminBuildings.find(b => b.id === id)) { alert('ID già esistente'); return; }
  const bldData = {
    id,
    name: document.getElementById('nb_name').value.trim() || `Palazzina ${id}`,
    subtitle: document.getElementById('nb_subtitle').value.trim(),
    color: document.getElementById('nb_color').value,
    floors: parseInt(document.getElementById('nb_floors').value)||3,
    rooms: 0,
    x: parseFloat(document.getElementById('nb_x').value)||30,
    z: parseFloat(document.getElementById('nb_z').value)||0,
    w: parseFloat(document.getElementById('nb_w').value)||8,
    d: parseFloat(document.getElementById('nb_d').value)||6,
    icon: 'wing'
  };
  try {
    await apiRequest('POST', '/buildings', bldData);
    await loadInitialData();
    document.getElementById('addBldModal').remove();
    adminSelectedBuilding = id;
    renderAdminMap();
    showToast('Edificio aggiunto');
  } catch (err) {
    alert('Errore: ' + err.message);
  }
}

async function confirmDeleteBuilding(id) {
  const b = adminBuildings.find(x => x.id === id);
  adminConfirm(`Eliminare ${b?.name}?`, 'Saranno eliminate anche tutte le aule di questo edificio.', async () => {
    try {
      await apiRequest('DELETE', `/buildings/${id}`);
      await loadInitialData();
      adminSelectedBuilding = null;
      renderAdminMap();
      showToast('Edificio eliminato');
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  });
}

function applyAndReloadMap() {
  // Sincronizza i globali e ricarica la mappa
  if (typeof mapInitialized !== 'undefined' && mapInitialized) {
    if (typeof buildCampus3D === 'function') {
      while(campusGroup.children.length) campusGroup.remove(campusGroup.children[0]);
      buildingMeshes = {};
      activeIndoorBuilding = null;
      // Aggiorna i globali con i dati correnti dal backend
      (async () => {
        try {
          const [teachers, rooms, buildings] = await Promise.all([
            apiRequest('GET', '/teachers'),
            apiRequest('GET', '/rooms'),
            apiRequest('GET', '/buildings')
          ]);
          TEACHERS.length = 0; teachers.forEach(t => TEACHERS.push(t));
          ROOMS.length = 0; rooms.forEach(r => ROOMS.push(r));
          BUILDINGS.length = 0; buildings.forEach(b => BUILDINGS.push(b));
          buildCampus3D();
          createStartMarker();
          resetMapView();
          showToast('Mappa 3D aggiornata!');
        } catch (err) {
          console.error('Errore ricarica mappa', err);
        }
      })();
    }
  }
}

// ── CSV IMPORT ────────────────────────────────────────────
function renderAdminCSV() {
  document.getElementById('adminContent').innerHTML = `
    <div class="admin-section-title">Import / Export CSV</div>
    <div class="admin-section-sub">Carica file CSV per aggiornare professori, aule od orari in blocco</div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px;">
      ${[
        { label: 'Professori', icon: '👨‍🏫', type: 'teachers', template: 'ID,Titolo,Nome,Cognome,Dipartimento,Materia,Edificio,Piano,Ufficio', example: 'T999,Prof.,Mario,Rossi,Scientifico,Fisica,A,2,A-201' },
        { label: 'Aule', icon: '🏫', type: 'rooms', template: 'ID,Nome,Tipo,Edificio,Piano,Materia,X,Z,W,D', example: 'X-101,Aula X-101,class,A,1,Matematica,2,0,2,2' },
        { label: 'Orari', icon: '📅', type: 'schedule', template: 'Classe,Giorno,Ora,Materia,Professore,Aula', example: '3A,LUN,0,Matematica,Prof. Rossi,A-101' },
      ].map(item => `
        <div class="admin-form-card">
          <div class="admin-form-title">${item.icon} ${item.label}</div>
          <div class="csv-dropzone" onclick="triggerCSVUpload('${item.type}')" 
               ondragover="event.preventDefault()" ondrop="handleCSVDrop(event,'${item.type}')">
            <div class="csv-dropzone-icon">📂</div>
            <div class="csv-dropzone-text">Trascina o clicca</div>
            <div class="csv-dropzone-sub">File .csv — max 5MB</div>
          </div>
          <input type="file" id="csvInput_${item.type}" accept=".csv" style="display:none" onchange="handleCSVFile(this,'${item.type}')">
          <div style="margin-top:10px;">
            <div style="font-size:11px;font-weight:700;color:#6B5E4F;text-transform:uppercase;margin-bottom:4px;">Formato richiesto:</div>
            <div class="csv-preview">${item.template}\n${item.example}</div>
          </div>
          <button class="admin-btn admin-btn-secondary" style="width:100%;" onclick="downloadTemplate('${item.type}','${item.template}','${item.example}')">
            ↓ Scarica template CSV
          </button>
        </div>
      `).join('')}
    </div>

    <div id="csvPreviewArea"></div>

    <div class="admin-form-card">
      <div class="admin-form-title">📊 Export completo</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="admin-btn admin-btn-secondary" onclick="exportTeachersCSV()">↓ Esporta Professori</button>
        <button class="admin-btn admin-btn-secondary" onclick="exportRoomsCSV()">↓ Esporta Aule</button>
        <button class="admin-btn admin-btn-secondary" onclick="exportAllSchedulesCSV()">↓ Esporta Tutti gli Orari</button>
      </div>
    </div>
  `;
}

function triggerCSVUpload(type) {
  document.getElementById(`csvInput_${type}`).click();
}

function handleCSVDrop(e, type) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) processCSVFile(file, type);
}

function handleCSVFile(input, type) {
  const file = input.files[0];
  if (file) processCSVFile(file, type);
  input.value = '';
}

function processCSVFile(file, type) {
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const lines = text.trim().split('\n').map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
    const headers = lines[0];
    const rows = lines.slice(1).filter(l => l.some(c => c));
    const preview = document.getElementById('csvPreviewArea');

    preview.innerHTML = `
      <div class="admin-form-card">
        <div class="admin-form-title">📋 Anteprima: ${file.name} (${rows.length} righe)</div>
        <div class="csv-preview">${lines.slice(0,6).map(l => l.join(', ')).join('\n')}</div>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button class="admin-btn admin-btn-primary" onclick="confirmImportCSV('${type}', ${JSON.stringify(rows).replace(/'/g, "\\'")} )">
            ✓ Importa ${rows.length} righe
          </button>
          <button class="admin-btn admin-btn-secondary" onclick="document.getElementById('csvPreviewArea').innerHTML=''">Annulla</button>
        </div>
      </div>
    `;
  };
  reader.readAsText(file);
}

async function confirmImportCSV(type, rows) {
  let count = 0;
  try {
    if (type === 'teachers') {
      // Converti rows in oggetti per il backend
      const teachers = rows.map(r => {
        const [id, title, first, last, dept, subject, bld, floor, office] = r;
        return { id, name: `${title} ${first} ${last}`, firstName: first, lastName: last, department: dept, subject, building: bld, floor: parseInt(floor)||1, office };
      }).filter(t => t.id && t.firstName && t.lastName);
      for (const t of teachers) {
        const existing = adminTeachers.findIndex(te => te.id === t.id);
        if (existing >= 0) {
          await apiRequest('PUT', `/teachers/${t.id}`, t);
        } else {
          await apiRequest('POST', '/teachers', t);
        }
        count++;
      }
    } else if (type === 'rooms') {
      const colorMap = { class: 0x93B5C6, lab: 0x7FA37F, office: 0xC9A868, special: 0x95A5A6 };
      const rooms = rows.map(r => {
        const [id, name, type_, bld, floor, subject, x, z, w, d] = r;
        return { id, name, type: type_, building: bld, floor: parseInt(floor)||1, subject, x: parseFloat(x)||0, z: parseFloat(z)||0, w: parseFloat(w)||2, d: parseFloat(d)||2, color: colorMap[type_]||0x93B5C6 };
      }).filter(r => r.id && r.name);
      for (const r of rooms) {
        const existing = adminRooms.findIndex(rm => rm.id === r.id);
        if (existing >= 0) {
          await apiRequest('PUT', `/rooms/${r.id}`, r);
        } else {
          await apiRequest('POST', '/rooms', r);
        }
        count++;
      }
    } else if (type === 'schedule') {
      // Per gli orari, si può importare in modo più complesso; per ora skip
      showToast('Import orari non ancora implementato via CSV');
      return;
    }
    await loadInitialData();
    document.getElementById('csvPreviewArea').innerHTML = '';
    if (type === 'teachers') renderAdminTeachers();
    else if (type === 'rooms') renderAdminRooms();
    showToast(`Importate ${count} righe con successo`);
  } catch (err) {
    alert('Errore import: ' + err.message);
  }
}

function downloadTemplate(type, template, example) {
  const content = template + '\n' + example;
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `template_${type}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportAllSchedulesCSV() {
  // Esporta tutti gli orari dal backend
  try {
    const res = await fetch(`${API_BASE}/schedule`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const schedule = await res.json();
    const headers = ['Classe','Giorno','Ora','Materia','Professore','Aula'];
    const rows = [];
    Object.entries(schedule).forEach(([cls, days]) => {
      Object.entries(days).forEach(([day, hours]) => {
        Object.entries(hours).forEach(([hour, lesson]) => {
          rows.push([cls, day, hour, lesson.subject, lesson.teacher, lesson.room]);
        });
      });
    });
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orari_tutti.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Errore esportazione: ' + err.message);
  }
}

// ── UTILITIES ─────────────────────────────────────────────
function renderPagination(total, pageSize, currentPage, pageVar, renderFn) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return '';
  let btns = '';
  for (let i = 0; i < totalPages; i++) {
    btns += `<button class="admin-page-btn ${i === currentPage ? 'active' : ''}" onclick="${pageVar}=${i};${renderFn}">${i + 1}</button>`;
  }
  return `<div class="admin-pagination">${btns}</div>`;
}

function adminConfirm(title, message, onConfirm) {
  const el = document.createElement('div');
  el.className = 'admin-confirm';
  el.id = 'adminConfirmDialog';
  el.innerHTML = `
    <div class="admin-confirm-box">
      <h3>⚠️ ${title}</h3>
      <p>${message}</p>
      <div class="btns">
        <button class="admin-btn admin-btn-danger" style="flex:1" id="confirmYes">Conferma</button>
        <button class="admin-btn admin-btn-secondary" style="flex:1" onclick="document.getElementById('adminConfirmDialog').remove()">Annulla</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  document.getElementById('confirmYes').onclick = () => {
    el.remove();
    onConfirm();
  };
}

// Toast helper (se non esiste in app.js, la definiamo)
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

// Riavvio dopo login se token esiste
if (adminToken) {
  // Carica i dati e mostra il pannello (se l'overlay è visibile)
  window.addEventListener('load', async () => {
    try {
      await loadInitialData();
      // Se l'overlay è già visibile (admin aperto), mostra il pannello
      const overlay = document.getElementById('adminOverlay');
      if (overlay && overlay.style.display !== 'none') {
        document.getElementById('adminLoginModal').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'flex';
        adminTab('teachers');
      }
    } catch (err) {
      console.error('Auto-login fallito', err);
      localStorage.removeItem('adminToken');
    }
  });
}