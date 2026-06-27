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
let adminCampusElements = [];

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
    throw new Error(error.error || 'API Error');
  }
  if (res.status === 204) return null;
  return res.json();
}

async function loadInitialData() {
  try {
    const [teachers, rooms, buildings, schedule, campusElements] = await Promise.all([
      apiRequest('GET', '/teachers'),
      apiRequest('GET', '/rooms'),
      apiRequest('GET', '/buildings'),
      apiRequest('GET', '/schedule'),
      apiRequest('GET', '/campus-elements')
    ]);
    adminTeachers = teachers;
    adminRooms = rooms;
    adminBuildings = buildings;
    adminSchedule = schedule;
    adminCampusElements = campusElements || [];
  } catch (err) {
    console.error('Error loading data', err);
    showToast('Error loading data');
  }
}

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
    showToast('Login successful');
  } catch (err) {
    document.getElementById('adminLoginError').style.display = 'block';
    document.getElementById('adminLoginError').textContent = err.message;
  }
}

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
  try {
    const [teachers, rooms, buildings, campusElements] = await Promise.all([
      apiRequest('GET', '/teachers'),
      apiRequest('GET', '/rooms'),
      apiRequest('GET', '/buildings'),
      apiRequest('GET', '/campus-elements')
    ]);
    TEACHERS.length = 0; teachers.forEach(t => TEACHERS.push(t));
    ROOMS.length = 0; rooms.forEach(r => ROOMS.push(r));
    BUILDINGS.length = 0; buildings.forEach(b => BUILDINGS.push(b));
    if (typeof CAMPUS_ELEMENTS !== 'undefined') {
      CAMPUS_ELEMENTS.length = 0;
      (campusElements || []).forEach(el => CAMPUS_ELEMENTS.push(el));
    }
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
    showToast('Data synchronized with backend');
  } catch (err) {
    console.error('Sync error', err);
    showToast('Error saving data');
  }
  closeAdminOverlay();
  localStorage.removeItem('adminToken');
}

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
  if(name === 'settings') renderAdminSettings();
}

async function renderChatbotAdmin() {
  const settings = await apiRequest('GET', '/settings');
  const enabled = settings.chatbotEnabled ?? true;
  document.getElementById('adminContent').innerHTML = `
    <div style="padding:28px; max-width:500px;">
      <h2 style="font-family:'Outfit',sans-serif;font-weight:700;font-size:20px;margin-bottom:6px;">Chatbot AI</h2>
      <p style="color:var(--text-medium);font-size:13px;margin-bottom:24px;">Abilita o disabilita l'assistente virtuale per gli utenti.</p>
      <div style="display:flex;align-items:center;gap:16px;background:white;padding:18px;border-radius:14px;border:1.5px solid rgba(0,0,0,0.08);">
        <div style="flex:1;">
          <div style="font-weight:700;font-size:15px;">Assistente Campus</div>
          <div style="font-size:12px;color:var(--text-medium);margin-top:3px;">Qwen 2.5 · Ollama locale</div>
        </div>
        <label style="position:relative;display:inline-block;width:48px;height:26px;">
          <input type="checkbox" id="chatbotToggle" ${enabled ? 'checked' : ''} style="opacity:0;width:0;height:0;">
          <span onclick="toggleChatbotSetting()" style="position:absolute;inset:0;background:${enabled ? '#D4A373' : '#ccc'};border-radius:26px;cursor:pointer;transition:background 0.2s;">
            <span style="position:absolute;width:20px;height:20px;background:white;border-radius:50%;top:3px;left:${enabled ? '25px' : '3px'};transition:left 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></span>
          </span>
        </label>
      </div>
    </div>`;
}

function renderAdminSettings() {
  const content = document.getElementById('adminContent');
  content.innerHTML = `
    <div style="padding:28px; max-width:500px;">
      <h2 style="font-family:'Outfit',sans-serif;font-weight:700;font-size:20px;margin-bottom:6px;">Settings</h2>
      <p style="color:var(--text-medium);font-size:13px;margin-bottom:24px;">Configura il comportamento dell'app.</p>
      
      <div id="settingsContainer"></div>
    </div>
  `;
  
  loadSettings();
}

async function loadSettings() {
  const settings = await apiRequest('GET', '/settings');
  const container = document.getElementById('settingsContainer');
  
  const chatEnabled = settings.chatbotEnabled ?? true;
  const rotLocked = settings.lockMapRotation ?? false;
  
  container.innerHTML = `
    <!-- SETTING 1: Chatbot -->
    <div style="display:flex;align-items:center;gap:16px;background:white;padding:18px;border-radius:14px;border:1.5px solid rgba(0,0,0,0.08);margin-bottom:12px;">
      <div style="flex:1;">
        <div style="font-weight:700;font-size:15px;">Chatbot AI</div>
        <div style="font-size:12px;color:var(--text-medium);margin-top:3px;">Abilita assistente virtuale</div>
      </div>
      <label style="position:relative;display:inline-block;width:48px;height:26px;">
        <input type="checkbox" id="chatbotToggle" ${chatEnabled ? 'checked' : ''} style="opacity:0;width:0;height:0;">
        <span onclick="toggleSetting('chatbotEnabled')" style="position:absolute;inset:0;background:${chatEnabled ? '#D4A373' : '#ccc'};border-radius:26px;cursor:pointer;transition:background 0.2s;">
          <span style="position:absolute;width:20px;height:20px;background:white;border-radius:50%;top:3px;left:${chatEnabled ? '25px' : '3px'};transition:left 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></span>
        </span>
      </label>
    </div>
    
    <!-- SETTING 2: Lock Map Rotation -->
    <div style="display:flex;align-items:center;gap:16px;background:white;padding:18px;border-radius:14px;border:1.5px solid rgba(0,0,0,0.08);">
      <div style="flex:1;">
        <div style="font-weight:700;font-size:15px;">Blocca rotazione mappa</div>
        <div style="font-size:12px;color:var(--text-medium);margin-top:3px;">Impedisce la rotazione laterale 3D</div>
      </div>
      <label style="position:relative;display:inline-block;width:48px;height:26px;">
        <input type="checkbox" id="lockRotationToggle" ${rotLocked ? 'checked' : ''} style="opacity:0;width:0;height:0;">
        <span onclick="toggleSetting('lockMapRotation')" style="position:absolute;inset:0;background:${rotLocked ? '#D4A373' : '#ccc'};border-radius:26px;cursor:pointer;transition:background 0.2s;">
          <span style="position:absolute;width:20px;height:20px;background:white;border-radius:50%;top:3px;left:${rotLocked ? '25px' : '3px'};transition:left 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></span>
        </span>
      </label>
    </div>
  `;
}

async function toggleSetting(settingKey) {
  const settings = await apiRequest('GET', '/settings');
  const currentValue = settings[settingKey] ?? false;
  const newValue = !currentValue;
  
  await apiRequest('PATCH', '/settings', { [settingKey]: newValue });
  
  showToast(`${settingKey === 'chatbotEnabled' ? 'Chatbot' : 'Lock rotazione'} ${newValue ? 'abilitato' : 'disabilitato'}`);
  
  loadSettings();
}

async function toggleChatbotSetting() {
  const cb = document.getElementById('chatbotToggle');
  const newVal = !cb.checked;
  cb.checked = newVal;
  await apiRequest('PATCH', '/settings', { chatbotEnabled: newVal });
  renderChatbotAdmin();
  showToast(newVal ? 'Chatbot abilitato' : 'Chatbot disabilitato');
}

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
    <div class="admin-section-title">Teachers</div>
    <div class="admin-section-sub">Teacher management — ${total} teachers on staff</div>

    <div class="admin-stats">
      ${depts.map(d => {
        const count = adminTeachers.filter(t => t.department === d).length;
        const colors = {'Lettere':'#FF7E67','Scientifico':'#58A4B0','Lingue':'#FC642D','Arte':'#9C89B8','Motoria':'#E8A87C','Tecnologico':'#88B04B'};
        return `<div class="admin-stat-chip"><span class="admin-stat-dot" style="background:${colors[d]||'#D4A373'}"></span>${d} (${count})</div>`;
      }).join('')}
    </div>

    <div class="admin-toolbar">
      <input type="text" placeholder="🔍 Search by name, department, subject..." 
        oninput="adminTeacherPage=0; renderAdminTeachers(this.value)" id="teacherSearchAdmin">
      <button class="admin-btn admin-btn-primary" onclick="openTeacherForm(null)">+ Add</button>
      <button class="admin-btn admin-btn-secondary" onclick="exportTeachersCSV()">↓ Export CSV</button>
    </div>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Department</th><th>Subject</th>
            <th>Building</th><th>Office</th><th>Actions</th>
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
          ${slice.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:#999;padding:24px">No results</td></tr>` : ''}
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
      <h3>${t ? 'Edit Teacher' : 'New Teacher'}</h3>
      <div class="admin-form-grid" style="margin-top:14px;">
        <div class="admin-field">
          <label>Title</label>
          <select id="tf_title">
            <option ${t?.name.startsWith('Prof.ssa')?'selected':''}>Prof.ssa</option>
            <option ${t?.name.startsWith('Prof.')&&!t?.name.startsWith('Prof.ssa')?'selected':''}>Prof.</option>
          </select>
        </div>
        <div class="admin-field">
          <label>First Name</label>
          <input type="text" id="tf_first" value="${t?.firstName||''}">
        </div>
        <div class="admin-field">
          <label>Last Name</label>
          <input type="text" id="tf_last" value="${t?.lastName||''}">
        </div>
        <div class="admin-field">
          <label>Department</label>
          <select id="tf_dept">
            ${DEPTS.map(d => `<option ${t?.department===d?'selected':''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="admin-field">
          <label>Subject</label>
          <select id="tf_subject">
            ${allSubjects.map(s => `<option ${t?.subject===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="admin-field">
          <label>Building</label>
          <select id="tf_bld">
            ${adminBuildings.filter(b=>['A','B','C','D'].includes(b.id)).map(b => `<option ${t?.building===b.id?'selected':''}>${b.id}</option>`).join('')}
          </select>
        </div>
        <div class="admin-field">
          <label>Floor (1-4)</label>
          <input type="number" id="tf_floor" min="1" max="4" value="${t?.floor||1}">
        </div>
        <div class="admin-field">
          <label>Office Code</label>
          <input type="text" id="tf_office" value="${t?.office||''}">
        </div>
      </div>
      <div class="btns" style="margin-top:20px;">
        <button class="admin-btn admin-btn-primary" style="flex:1" onclick="saveTeacherForm('${id||''}')">Save</button>
        <button class="admin-btn admin-btn-secondary" style="flex:1" onclick="closeTeacherForm()">Cancel</button>
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

  if (!first || !last) { alert('First and last name are required'); return; }

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
    showToast('Teacher saved');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function closeTeacherForm() {
  document.getElementById('teacherFormModal')?.remove();
}

async function confirmDeleteTeacher(id) {
  const t = adminTeachers.find(x => x.id === id);
  adminConfirm(`Delete ${t?.name}?`, 'This action removes the teacher from the platform.', async () => {
    try {
      await apiRequest('DELETE', `/teachers/${id}`);
      await loadInitialData();
      renderAdminTeachers();
      showToast('Teacher deleted');
    } catch (err) {
      alert('Error: ' + err.message);
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
    a.download = 'teachers.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Export error: ' + err.message);
  }
}

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
    <div class="admin-section-title">Rooms & Spaces</div>
    <div class="admin-section-sub">Campus space management — ${total} total spaces</div>

    <div class="admin-stats">
      ${types.map(type => {
        const count = adminRooms.filter(r => r.type === type).length;
        const colors = { class:'#58A4B0', lab:'#7FA37F', office:'#C9A868', special:'#9C89B8' };
        return `<div class="admin-stat-chip"><span class="admin-stat-dot" style="background:${colors[type]||'#D4A373'}"></span>${type} (${count})</div>`;
      }).join('')}
    </div>

    <div class="admin-toolbar">
      <input type="text" placeholder="🔍 Search by code, name, subject, building..." 
        oninput="adminRoomPage=0; renderAdminRooms(this.value)" id="roomSearchAdmin">
      <button class="admin-btn admin-btn-primary" onclick="openRoomForm(null)">+ Add</button>
      <button class="admin-btn admin-btn-secondary" onclick="exportRoomsCSV()">↓ Export CSV</button>
    </div>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Type</th><th>Building</th>
            <th>Floor</th><th>Subject</th><th>Actions</th>
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
          ${slice.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:#999;padding:24px">No results</td></tr>` : ''}
        </tbody>
      </table>
    </div>
    ${renderPagination(total, PAGE_SIZE, adminRoomPage, 'adminRoomPage', `renderAdminRooms(document.getElementById('roomSearchAdmin')?.value||'')`)}
  `;
}

function openRoomForm(id) {
  const r = id ? adminRooms.find(x => x.id === id) : null;
  const SUBJECTS = ['Italiano','Matematica','Inglese','Storia','Scienze','Fisica','Chimica','Informatica','Arte','Musica','Vertical Connection','Restrooms','Studio','Events','Lunch','Generic'];
  const TYPES = ['class','lab','office','special'];

  const modal = document.createElement('div');
  modal.className = 'admin-confirm';
  modal.id = 'roomFormModal';
  modal.innerHTML = `
    <div class="admin-confirm-box" style="width:min(520px,96vw);text-align:left;max-height:90vh;overflow-y:auto;">
      <h3>${r ? 'Edit Room' : 'New Room / Space'}</h3>
      <div class="admin-form-grid" style="margin-top:14px;">
        <div class="admin-field">
          <label>ID Code</label>
          <input type="text" id="rf_id" value="${r?.id||''}" ${r?'disabled':''} placeholder="e.g. A-204">
        </div>
        <div class="admin-field">
          <label>Display Name</label>
          <input type="text" id="rf_name" value="${r?.name||''}" placeholder="e.g. Room A-204">
        </div>
        <div class="admin-field">
          <label>Type</label>
          <select id="rf_type">
            ${TYPES.map(t => `<option ${r?.type===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="admin-field">
          <label>Building</label>
          <select id="rf_bld">
            ${adminBuildings.map(b => `<option ${r?.building===b.id?'selected':''}>${b.id}</option>`).join('')}
          </select>
        </div>
        <div class="admin-field">
          <label>Floor</label>
          <input type="number" id="rf_floor" min="0" max="6" value="${r?.floor??1}">
        </div>
        <div class="admin-field">
          <label>Subject / Use</label>
          <select id="rf_subject">
            ${SUBJECTS.map(s => `<option ${r?.subject===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="admin-field">
          <label>Position X (campus)</label>
          <input type="number" id="rf_x" value="${r?.x??0}" step="0.5">
        </div>
        <div class="admin-field">
          <label>Position Z (campus)</label>
          <input type="number" id="rf_z" value="${r?.z??0}" step="0.5">
        </div>
        <div class="admin-field">
          <label>Width (m)</label>
          <input type="number" id="rf_w" value="${r?.w??2}" step="0.5" min="0.5">
        </div>
        <div class="admin-field">
          <label>Depth (m)</label>
          <input type="number" id="rf_d" value="${r?.d??2}" step="0.5" min="0.5">
        </div>
      </div>
      <div class="btns" style="margin-top:20px;">
        <button class="admin-btn admin-btn-primary" style="flex:1" onclick="saveRoomForm('${id||''}')">Save</button>
        <button class="admin-btn admin-btn-secondary" style="flex:1" onclick="closeRoomForm()">Cancel</button>
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

  if (!rid || !name) { alert('ID and name are required'); return; }

  const colorMap = { class: 0x93B5C6, lab: 0x7FA37F, office: 0xC9A868, special: 0x95A5A6 };
  const roomData = { id: rid, name, type, building: bld, floor, subject, x, z, w, d, color: colorMap[type] || 0x93B5C6 };

  try {
    if (id) {
      await apiRequest('PUT', `/rooms/${id}`, roomData);
    } else {
      if (adminRooms.find(r => r.id === rid)) { alert('ID already exists'); return; }
      await apiRequest('POST', '/rooms', roomData);
    }
    await loadInitialData();
    renderAdminRooms();
    closeRoomForm();
    showToast('Room saved');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function closeRoomForm() { document.getElementById('roomFormModal')?.remove(); }

async function confirmDeleteRoom(id) {
  const r = adminRooms.find(x => x.id === id);
  adminConfirm(`Delete ${r?.name}?`, 'The space will be removed from the map.', async () => {
    try {
      await apiRequest('DELETE', `/rooms/${id}`);
      await loadInitialData();
      renderAdminRooms();
      showToast('Room deleted');
    } catch (err) {
      alert('Error: ' + err.message);
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
    a.download = 'rooms.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Export error: ' + err.message);
  }
}

const DAYS = ['MON','TUE','WED','THU','FRI'];
const SCHEDULE_COLORS = {
  'Italiano':'#FF7E67','Matematica':'#58A4B0','Inglese':'#FC642D','Storia':'#9C89B8',
  'Scienze':'#88B04B','Fisica':'#E8A87C','Arte':'#F7C59F','Informatica':'#5AA9E6',
  'default':'#D4A373'
};
let adminScheduleSelectedClass = null;

function renderAdminSchedule() {
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
  }

  const classIds = [...new Set([...Object.keys(adminSchedule), ...CLASSES.map(c => c.id)])];
  const selectedClass = adminScheduleSelectedClass || classIds[0];
  if (!adminScheduleSelectedClass) adminScheduleSelectedClass = selectedClass;

  const schedule = adminSchedule[selectedClass] || {};

  document.getElementById('adminContent').innerHTML = `
    <div class="admin-section-title">Schedule Management</div>
    <div class="admin-section-sub">Weekly schedule per class — click a cell to edit</div>

    <div class="admin-toolbar">
      <select id="scheduleClassSelect" onchange="adminScheduleSelectedClass=this.value; renderAdminSchedule()">
        ${classIds.map(id => `<option ${id===selectedClass?'selected':''}>${id}</option>`).join('')}
      </select>
      <button class="admin-btn admin-btn-primary" onclick="addScheduleClass()">+ New class</button>
      <button class="admin-btn admin-btn-secondary" onclick="exportScheduleCSV()">↓ Export CSV</button>
      <button class="admin-btn admin-btn-success" onclick="clearSchedule()">🗑️ Clear</button>
    </div>

    <div style="overflow-x:auto;">
      <div class="schedule-grid" style="min-width:500px;">
        <div class="schedule-cell schedule-cell-header">Hour</div>
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
      <h3>${existing ? 'Edit lesson' : 'Add lesson'}</h3>
      <p style="margin-bottom:14px;">${classId} · ${day} · ${HOURS[hour]}</p>
      <div class="admin-field">
        <label>Subject</label>
        <select id="le_subject">
          ${SUBJECTS.map(s => `<option ${existing?.subject===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="admin-field">
        <label>Teacher</label>
        <select id="le_teacher">
          ${adminTeachers.map(t => `<option ${existing?.teacher===t.name?'selected':''}>${t.name}</option>`).join('')}
        </select>
      </div>
      <div class="admin-field">
        <label>Room</label>
        <select id="le_room">
          ${adminRooms.filter(r => r.type !== 'special').map(r => `<option ${existing?.room===r.id?'selected':''}>${r.id}</option>`).join('')}
        </select>
      </div>
      <div class="btns" style="margin-top:16px;">
        <button class="admin-btn admin-btn-primary" style="flex:1" onclick="saveLessonEditor('${classId}','${day}',${hour})">Save</button>
        ${existing ? `<button class="admin-btn admin-btn-danger" style="flex:1" onclick="deleteLesson('${classId}','${day}',${hour})">Delete</button>` : ''}
        <button class="admin-btn admin-btn-secondary" style="flex:1" onclick="closeLessonEditor()">Cancel</button>
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
    showToast('Lesson saved');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteLesson(classId, day, hour) {
  try {
    await apiRequest('DELETE', `/schedule/${classId}/${day}/${hour}`);
    await loadInitialData();
    renderAdminSchedule();
    closeLessonEditor();
    showToast('Lesson deleted');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function closeLessonEditor() { document.getElementById('lessonModal')?.remove(); }

async function addScheduleClass() {
  const id = prompt('Class ID (e.g. 3A, 5B):')?.toUpperCase();
  if (!id) return;
  if (!adminSchedule[id]) adminSchedule[id] = {};
  try {
    await apiRequest('PUT', `/schedule/${id}`, {});
    await loadInitialData();
    adminScheduleSelectedClass = id;
    renderAdminSchedule();
    showToast('Class added');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function clearSchedule() {
  adminConfirm('Clear schedule?', `Class ${adminScheduleSelectedClass} will lose all lessons.`, async () => {
    try {
      await apiRequest('PUT', `/schedule/${adminScheduleSelectedClass}`, {});
      await loadInitialData();
      renderAdminSchedule();
      showToast('Schedule cleared');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });
}

async function exportScheduleCSV() {
  const cls = adminScheduleSelectedClass;
  const schedule = adminSchedule[cls] || {};
  const headers = ['Hour', ...DAYS];
  const rows = HOURS.map((h, hi) => [
    h,
    ...DAYS.map(day => {
      const l = schedule[day]?.[hi];
      return l ? `${l.subject} (${l.teacher}) [${l.room}]` : '';
    })
  ]);
  const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `schedule_${cls}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderAdminMap() {
  document.getElementById('adminContent').innerHTML = `
    <div class="admin-section-title">Campus Map Editor</div>
    <div class="admin-section-sub">Edit existing buildings or add new ones — drag buildings on the map to reposition them</div>

    <div class="admin-map2d-wrap">
      <svg id="campusMap2D" class="admin-map2d-svg" xmlns="http://www.w3.org/2000/svg"></svg>
    </div>

    <div class="admin-campus-features">
      <div class="admin-campus-features-header">
        <span>Campus features</span>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="admin-campus-features-count" id="campusFeaturesCount">${adminCampusElements.length} elements</span>
          <button class="admin-btn admin-btn-primary" style="font-size:12px;padding:4px 12px;" onclick="openElementsEditor()">✏️ Edit Elements</button>
        </div>
      </div>
      <div class="admin-campus-features-list" id="campusFeaturesList">
        ${adminCampusElements.map(el => `
          <div class="admin-campus-feature-chip" data-id="${el.id}" data-type="${el.type}">
            <span class="admin-feature-type">${el.type}</span>
            <span class="admin-feature-pos">(${el.x}, ${el.z})</span>
            <button class="admin-feature-delete" onclick="deleteCampusElement('${el.id}')" title="Delete" style="background:none;border:none;cursor:pointer;color:#c0392b;font-size:14px;padding:0 4px;line-height:1;">✕</button>
          </div>
        `).join('')}
      </div>
      <p class="admin-campus-features-note">Sidewalks, streetlights, and benches are shown on the map.</p>
    </div>

    <div id="elementsEditorOverlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:999;align-items:center;justify-content:center;">
      <div style="background:#faf7f2;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.22);width:min(92vw,820px);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1.5px solid #E0D8CE;font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;">
          <span>🗺️ Elements Editor</span>
          <button onclick="closeElementsEditor()" style="background:none;border:none;cursor:pointer;font-size:20px;color:#888;line-height:1;">✕</button>
        </div>
        <div style="padding:10px 16px;border-bottom:1px solid #E0D8CE;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          <span style="font-size:12px;color:#888;margin-right:4px;font-family:'Outfit',sans-serif;">Add:</span>
          ${['sidewalk','streetlight','bench','flowerbed','fountain'].map(t => `
            <button class="admin-btn admin-btn-secondary" style="font-size:12px;padding:4px 10px;" onclick="addCampusElement('${t}')">+ ${t}</button>
          `).join('')}
          <span style="font-size:11px;color:#aaa;margin-left:auto;font-family:'Outfit',sans-serif;">Drag to move · Click to select · Del to delete</span>
        </div>
        <div style="flex:1;overflow:hidden;position:relative;">
          <svg id="elementsEditorSVG" style="display:block;width:100%;height:480px;cursor:default;" xmlns="http://www.w3.org/2000/svg"></svg>
        </div>
        <div id="elementsEditorStatus" style="padding:8px 16px;font-size:11px;color:#888;font-family:'Outfit',sans-serif;border-top:1px solid #E0D8CE;min-height:28px;"></div>
      </div>
    </div>

    <div class="admin-map-editor">
      <div class="admin-map-list">
        <div class="admin-map-list-header">Buildings (${adminBuildings.length})</div>
        <div class="admin-map-list-body" id="bldListBody">
          ${adminBuildings.map(b => `
            <div class="admin-bld-item ${adminSelectedBuilding===b.id?'selected':''}" onclick="selectAdminBuilding('${b.id}')">
              <span class="admin-bld-dot" style="background:${b.color}"></span>
              <div>
                <div class="admin-bld-name">${b.id}</div>
                <div class="admin-bld-sub">${b.name} · ${b.floors} floors</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="padding:8px;">
          <button class="admin-btn admin-btn-primary" style="width:100%" onclick="openAddBuildingForm()">+ New building</button>
        </div>
      </div>
      <div class="admin-map-detail" id="bldDetailPanel">
        ${adminSelectedBuilding ? renderBuildingEditor(adminSelectedBuilding) : `
          <div style="text-align:center;padding:60px 20px;color:#999;">
            <div style="font-size:32px;margin-bottom:10px">🏫</div>
            <div style="font-weight:600">Select a building from the list or click on the map</div>
            <div style="font-size:13px;margin-top:6px">or add a new one</div>
          </div>
        `}
      </div>
    </div>
  `;

  initMap2D();
}

async function addCampusElement(type) {
  const defaults = {
    sidewalk:    { x: 0, z: 0, w: 10, d: 3, rotation: 0 },
    streetlight: { x: 0, z: 0, w: 1,  d: 1, rotation: 0 },
    bench:       { x: 0, z: 0, w: 2,  d: 1, rotation: 0 },
    flowerbed:   { x: 0, z: 0, w: 3,  d: 3, rotation: 0 },
    fountain:    { x: 0, z: 0, w: 4,  d: 4, rotation: 0 }
  };
  const payload = { type, ...(defaults[type] || { x: 0, z: 0, w: 2, d: 2, rotation: 0 }) };
  try {
    const created = await apiRequest('POST', '/campus-elements', payload);
    adminCampusElements.push(created);
    document.getElementById('campusFeaturesCount').textContent = `${adminCampusElements.length} elements`;
    const list = document.getElementById('campusFeaturesList');
    const chip = document.createElement('div');
    chip.className = 'admin-campus-feature-chip';
    chip.dataset.id = created.id;
    chip.dataset.type = created.type;
    chip.innerHTML = `
      <span class="admin-feature-type">${created.type}</span>
      <span class="admin-feature-label">${created.label || created.id}</span>
      <span class="admin-feature-pos">(${created.x}, ${created.z})</span>
      <button class="admin-feature-delete" onclick="deleteCampusElement('${created.id}')" title="Delete" style="background:none;border:none;cursor:pointer;color:#c0392b;font-size:14px;padding:0 4px;line-height:1;">✕</button>
    `;
    list.appendChild(chip);
    initMap2D();
    showToast(`${type} added — drag it on the map to position it`);
  } catch (err) {
    showToast('Error adding element: ' + err.message);
  }
}

async function deleteCampusElement(id) {
  try {
    await apiRequest('DELETE', `/campus-elements/${id}`);
    adminCampusElements = adminCampusElements.filter(e => e.id !== id);
    const chip = document.querySelector(`.admin-campus-feature-chip[data-id="${id}"]`);
    if (chip) chip.remove();
    document.getElementById('campusFeaturesCount').textContent = `${adminCampusElements.length} elements`;
    initMap2D();
    showToast('Element deleted');
  } catch (err) {
    showToast('Error deleting element: ' + err.message);
  }
}

function initMap2D() {
    const svg = document.getElementById('campusMap2D');
    if (!svg || !adminBuildings.length) return;
    const W = svg.clientWidth || 600;
    const H = svg.clientHeight || 260;
    const PAD = 30;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    adminBuildings.forEach(b => {
        minX = Math.min(minX, b.x - b.w/2);
        maxX = Math.max(maxX, b.x + b.w/2);
        minZ = Math.min(minZ, b.z - b.d/2);
        maxZ = Math.max(maxZ, b.z + b.d/2);
    });
    adminCampusElements.forEach(el => {
        const hw = (el.w || 2) / 2, hd = (el.d || 2) / 2;
        minX = Math.min(minX, el.x - hw); maxX = Math.max(maxX, el.x + hw);
        minZ = Math.min(minZ, el.z - hd); maxZ = Math.max(maxZ, el.z + hd);
    });
    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;
    const scaleX = (W - PAD*2) / rangeX;
    const scaleZ = (H - PAD*2) / rangeZ;
    const scale = Math.min(scaleX, scaleZ);
    const toSVG = (x, z) => ({
        sx: PAD + (x - minX) * scale,
        sy: PAD + (z - minZ) * scale
    });
    svg.innerHTML = '';

    // Grid
    const gridStep = 5;
    const gridColor = '#e8e2d8';
    for (let gx = Math.floor(minX/gridStep)*gridStep; gx <= maxX+gridStep; gx += gridStep) {
        const {sx} = toSVG(gx, minZ);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', sx); line.setAttribute('y1', PAD-10);
        line.setAttribute('x2', sx); line.setAttribute('y2', H-PAD+10);
        line.setAttribute('stroke', gridColor); line.setAttribute('stroke-width', '1');
        svg.appendChild(line);
    }
    for (let gz = Math.floor(minZ/gridStep)*gridStep; gz <= maxZ+gridStep; gz += gridStep) {
        const {sy} = toSVG(minX, gz);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', PAD-10); line.setAttribute('y1', sy);
        line.setAttribute('x2', W-PAD+10); line.setAttribute('y2', sy);
        line.setAttribute('stroke', gridColor); line.setAttribute('stroke-width', '1');
        svg.appendChild(line);
    }

    // Elements layer (read-only preview)
    adminCampusElements.forEach(el => {
        const { sx, sy } = toSVG(el.x, el.z);
        let shape;
        if (el.type === 'sidewalk') {
            const { sx: x0, sy: y0 } = toSVG(el.x - (el.w||4)/2, el.z - (el.d||2)/2);
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            shape.setAttribute('x', x0); shape.setAttribute('y', y0);
            shape.setAttribute('width', (el.w||4)*scale); shape.setAttribute('height', (el.d||2)*scale);
            shape.setAttribute('fill', '#D8D0C4'); shape.setAttribute('fill-opacity', '0.85');
            shape.setAttribute('stroke', '#A89880'); shape.setAttribute('stroke-width', '1'); shape.setAttribute('rx', '2');
            if (el.rotation) { const cx=x0+(el.w||4)*scale/2,cy=y0+(el.d||2)*scale/2; shape.setAttribute('transform',`rotate(${el.rotation} ${cx} ${cy})`); }
        } else if (el.type === 'streetlight') {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            shape.setAttribute('cx', sx); shape.setAttribute('cy', sy); shape.setAttribute('r', '5');
            shape.setAttribute('fill', '#FFD54F'); shape.setAttribute('stroke', '#F9A825'); shape.setAttribute('stroke-width', '1.5');
        } else if (el.type === 'bench') {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            shape.setAttribute('x', sx-4); shape.setAttribute('y', sy-2); shape.setAttribute('width', '8'); shape.setAttribute('height', '4');
            shape.setAttribute('fill', '#8B5A2B'); shape.setAttribute('rx', '1');
        } else if (el.type === 'flowerbed') {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            shape.setAttribute('cx', sx); shape.setAttribute('cy', sy); shape.setAttribute('r', '6');
            shape.setAttribute('fill', '#6BCB77'); shape.setAttribute('fill-opacity', '0.7');
        } else if (el.type === 'fountain') {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            shape.setAttribute('cx', sx); shape.setAttribute('cy', sy); shape.setAttribute('r', '8');
            shape.setAttribute('fill', '#58A4B0'); shape.setAttribute('fill-opacity', '0.6');
            shape.setAttribute('stroke', '#4A9099'); shape.setAttribute('stroke-width', '1');
        }
        if (shape) svg.appendChild(shape);
    });

    // Buildings with inline labels
    adminBuildings.forEach(b => {
        const rot = normalizeRotation(b.rotation);
        const fp = getEffectiveFootprint(b.w, b.d, rot);
        const { sx, sy } = toSVG(b.x - fp.w/2, b.z - fp.d/2);
        const bw = fp.w * scale;
        const bd = fp.d * scale;
        const isSelected = adminSelectedBuilding === b.id;
        const collisions = getBuildingCollisions(b, adminBuildings, adminCampusElements, b.id);
        const hasConflict = collisions.length > 0;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('cursor', 'grab');
        g.setAttribute('data-id', b.id);

        const cx = sx + bw/2, cy = sy + bd/2;
        if (b.rotation) g.setAttribute('transform', `rotate(${rot} ${cx} ${cy})`);

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', sx); rect.setAttribute('y', sy);
        rect.setAttribute('width', bw); rect.setAttribute('height', bd);
        rect.setAttribute('fill', b.color || '#ccc');
        rect.setAttribute('fill-opacity', isSelected ? '1' : '0.75');
        rect.setAttribute('stroke', hasConflict ? '#e74c3c' : (isSelected ? '#333' : '#888'));
        rect.setAttribute('stroke-width', isSelected ? '2' : '1');
        rect.setAttribute('rx', '3');
        g.appendChild(rect);

        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', cx); txt.setAttribute('y', cy);
        txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('dominant-baseline', 'middle');
        txt.setAttribute('font-size', Math.max(8, Math.min(13, bw/3)));
        txt.setAttribute('font-weight', '700');
        txt.setAttribute('fill', '#fff');
        txt.setAttribute('paint-order', 'stroke');
        txt.setAttribute('stroke', 'rgba(0,0,0,0.4)');
        txt.setAttribute('stroke-width', '2');
        txt.setAttribute('pointer-events', 'none');
        txt.textContent = b.id;
        g.appendChild(txt);

        svg.appendChild(g);

        // Drag on minimap (buildings only)
        let dragging = false, startMX, startMY, startBX, startBZ;
        g.addEventListener('mousedown', e => {
            e.stopPropagation(); dragging = true;
            startMX = e.clientX; startMY = e.clientY;
            startBX = b.x; startBZ = b.z;
            g.setAttribute('cursor', 'grabbing');
            const onMove = ev => {
                if (!dragging) return;
                b.x = Math.round((startBX + (ev.clientX - startMX)/scale)*2)/2;
                b.z = Math.round((startBZ + (ev.clientY - startMY)/scale)*2)/2;
                initMap2D();
            };
            const onUp = async () => {
                dragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                try { await apiRequest('PUT', `/buildings/${b.id}`, { x: b.x, z: b.z }); showToast(`${b.id} repositioned`); }
                catch { showToast('Error saving position'); }
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
        g.addEventListener('click', () => selectAdminBuilding(b.id));
    });
}

function openElementsEditor() {
    const overlay = document.getElementById('elementsEditorOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    initElementsEditorMap();
}

function closeElementsEditor() {
    const overlay = document.getElementById('elementsEditorOverlay');
    if (overlay) overlay.style.display = 'none';
}

function initElementsEditorMap() {
    const svg = document.getElementById('elementsEditorSVG');
    if (!svg) return;
    const W = svg.clientWidth || 780;
    const H = svg.clientHeight || 480;
    const PAD = 40;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    adminBuildings.forEach(b => {
        minX = Math.min(minX, b.x - b.w/2); maxX = Math.max(maxX, b.x + b.w/2);
        minZ = Math.min(minZ, b.z - b.d/2); maxZ = Math.max(maxZ, b.z + b.d/2);
    });
    adminCampusElements.forEach(el => {
        const hw = (el.w||2)/2, hd = (el.d||2)/2;
        minX = Math.min(minX, el.x-hw); maxX = Math.max(maxX, el.x+hw);
        minZ = Math.min(minZ, el.z-hd); maxZ = Math.max(maxZ, el.z+hd);
    });
    // extra padding in world units
    minX -= 5; maxX += 5; minZ -= 5; maxZ += 5;

    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;
    const scale = Math.min((W - PAD*2)/rangeX, (H - PAD*2)/rangeZ);

    const toSVG = (x, z) => ({ sx: PAD + (x - minX)*scale, sy: PAD + (z - minZ)*scale });
    const toWorld = (sx, sy) => ({ x: (sx - PAD)/scale + minX, z: (sy - PAD)/scale + minZ });

    svg.innerHTML = '';
    let selectedEl = null;

    const setStatus = (msg) => { const s = document.getElementById('elementsEditorStatus'); if(s) s.textContent = msg; };

    // Grid
    const gridStep = 5;
    for (let gx = Math.floor(minX/gridStep)*gridStep; gx <= maxX+gridStep; gx += gridStep) {
        const {sx} = toSVG(gx, minZ);
        const l = document.createElementNS('http://www.w3.org/2000/svg','line');
        l.setAttribute('x1',sx);l.setAttribute('y1',PAD-10);l.setAttribute('x2',sx);l.setAttribute('y2',H-PAD+10);
        l.setAttribute('stroke','#e8e2d8');l.setAttribute('stroke-width','1'); svg.appendChild(l);
    }
    for (let gz = Math.floor(minZ/gridStep)*gridStep; gz <= maxZ+gridStep; gz += gridStep) {
        const {sy} = toSVG(minX, gz);
        const l = document.createElementNS('http://www.w3.org/2000/svg','line');
        l.setAttribute('x1',PAD-10);l.setAttribute('y1',sy);l.setAttribute('x2',W-PAD+10);l.setAttribute('y2',sy);
        l.setAttribute('stroke','#e8e2d8');l.setAttribute('stroke-width','1'); svg.appendChild(l);
    }

    // Buildings (ghost, not draggable here)
    adminBuildings.forEach(b => {
        const rot = normalizeRotation(b.rotation);
        const fp = getEffectiveFootprint(b.w, b.d, rot);
        const {sx, sy} = toSVG(b.x - fp.w/2, b.z - fp.d/2);
        const bw = fp.w*scale, bd = fp.d*scale;
        const cx = sx+bw/2, cy = sy+bd/2;
        const g = document.createElementNS('http://www.w3.org/2000/svg','g');
        if (b.rotation) g.setAttribute('transform',`rotate(${rot} ${cx} ${cy})`);
        const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
        rect.setAttribute('x',sx);rect.setAttribute('y',sy);rect.setAttribute('width',bw);rect.setAttribute('height',bd);
        rect.setAttribute('fill',b.color||'#ccc');rect.setAttribute('fill-opacity','0.3');
        rect.setAttribute('stroke','#aaa');rect.setAttribute('stroke-width','1');rect.setAttribute('rx','3');
        g.appendChild(rect);
        const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
        txt.setAttribute('x',cx);txt.setAttribute('y',cy);txt.setAttribute('text-anchor','middle');txt.setAttribute('dominant-baseline','middle');
        txt.setAttribute('font-size',Math.max(8,Math.min(12,bw/4)));txt.setAttribute('font-weight','700');txt.setAttribute('fill','#888');txt.setAttribute('pointer-events','none');
        txt.textContent = b.id; g.appendChild(txt);
        svg.appendChild(g);
    });

    // Elements — fully draggable including sidewalks
    const elGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
    elGroup.setAttribute('id','editorElGroup');
    svg.appendChild(elGroup);

    function buildElementShape(el) {
        const {sx, sy} = toSVG(el.x, el.z);
        let shape;
        if (el.type === 'sidewalk') {
            const {sx: x0, sy: y0} = toSVG(el.x - (el.w||4)/2, el.z - (el.d||2)/2);
            shape = document.createElementNS('http://www.w3.org/2000/svg','rect');
            shape.setAttribute('x',x0); shape.setAttribute('y',y0);
            shape.setAttribute('width',(el.w||4)*scale); shape.setAttribute('height',(el.d||2)*scale);
            shape.setAttribute('fill','#D8D0C4'); shape.setAttribute('stroke','#A89880'); shape.setAttribute('stroke-width','1.5'); shape.setAttribute('rx','2');
            if (el.rotation) { const cx=x0+(el.w||4)*scale/2, cy=y0+(el.d||2)*scale/2; shape.setAttribute('transform',`rotate(${el.rotation} ${cx} ${cy})`); }
        } else if (el.type === 'streetlight') {
            shape = document.createElementNS('http://www.w3.org/2000/svg','circle');
            shape.setAttribute('cx',sx); shape.setAttribute('cy',sy); shape.setAttribute('r','7');
            shape.setAttribute('fill','#FFD54F'); shape.setAttribute('stroke','#F9A825'); shape.setAttribute('stroke-width','1.5');
        } else if (el.type === 'bench') {
            shape = document.createElementNS('http://www.w3.org/2000/svg','rect');
            shape.setAttribute('x',sx-5); shape.setAttribute('y',sy-3); shape.setAttribute('width','10'); shape.setAttribute('height','5');
            shape.setAttribute('fill','#8B5A2B'); shape.setAttribute('rx','1');
            shape.setAttribute('transform',`rotate(${el.rotation||0} ${sx} ${sy})`);
        } else if (el.type === 'flowerbed') {
            shape = document.createElementNS('http://www.w3.org/2000/svg','circle');
            shape.setAttribute('cx',sx); shape.setAttribute('cy',sy); shape.setAttribute('r','8');
            shape.setAttribute('fill','#6BCB77'); shape.setAttribute('fill-opacity','0.8');
        } else if (el.type === 'fountain') {
            shape = document.createElementNS('http://www.w3.org/2000/svg','circle');
            shape.setAttribute('cx',sx); shape.setAttribute('cy',sy); shape.setAttribute('r','10');
            shape.setAttribute('fill','#58A4B0'); shape.setAttribute('fill-opacity','0.7');
            shape.setAttribute('stroke','#4A9099'); shape.setAttribute('stroke-width','1.5');
        }
        return shape;
    }

    function renderAllElements() {
        elGroup.innerHTML = '';
        adminCampusElements.forEach(el => {
            const shape = buildElementShape(el);
            if (!shape) return;
            shape.setAttribute('cursor','grab');
            shape.dataset && (shape.dataset.elId = el.id);
            const isSelected = selectedEl && selectedEl.id === el.id;
            if (isSelected) {
                shape.setAttribute('stroke','#e74c3c');
                shape.setAttribute('stroke-width','2.5');
                shape.setAttribute('filter','url(#selGlow)');
            }

            let dragging = false, startMX, startMY, startEX, startEZ;
            shape.addEventListener('mousedown', e => {
                e.stopPropagation();
                selectedEl = el;
                dragging = true;
                startMX = e.clientX; startMY = e.clientY;
                startEX = el.x; startEZ = el.z;
                setStatus(`Selected: ${el.type} (${el.id}) — drag to move, press Delete to remove`);
                renderAllElements();
                shape.setAttribute('cursor','grabbing');

                const rect = svg.getBoundingClientRect();
                const onMove = ev => {
                    if (!dragging) return;
                    const dx = (ev.clientX - startMX) / scale;
                    const dz = (ev.clientY - startMY) / scale;
                    el.x = Math.round((startEX + dx) * 2) / 2;
                    el.z = Math.round((startEZ + dz) * 2) / 2;
                    renderAllElements();
                };
                const onUp = async () => {
                    dragging = false;
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    try {
                        await apiRequest('PUT', `/campus-elements/${el.id}`, { x: el.x, z: el.z });
                        setStatus(`✓ ${el.type} saved at (${el.x}, ${el.z})`);
                        initMap2D();
                        // update chip position
                        const chip = document.querySelector(`.admin-campus-feature-chip[data-id="${el.id}"] .admin-feature-pos`);
                        if (chip) chip.textContent = `(${el.x}, ${el.z})`;
                    } catch { setStatus('Error saving position'); }
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });

            elGroup.appendChild(shape);
        });
    }

    // Glow filter for selection
    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg','filter');
    filter.setAttribute('id','selGlow');
    const feGlow = document.createElementNS('http://www.w3.org/2000/svg','feDropShadow');
    feGlow.setAttribute('dx','0');feGlow.setAttribute('dy','0');feGlow.setAttribute('stdDeviation','3');feGlow.setAttribute('flood-color','#e74c3c');feGlow.setAttribute('flood-opacity','0.7');
    filter.appendChild(feGlow); defs.appendChild(filter); svg.insertBefore(defs, svg.firstChild);

    // Delete key handler
    const keyHandler = e => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEl) {
            deleteCampusElement(selectedEl.id);
            selectedEl = null;
            renderAllElements();
            setStatus('Element deleted');
        }
    };
    svg.setAttribute('tabindex','0');
    svg.addEventListener('keydown', keyHandler);
    svg.addEventListener('click', e => { if (e.target === svg) { selectedEl = null; renderAllElements(); setStatus(''); } });

    renderAllElements();
    setStatus(`${adminCampusElements.length} elements on canvas — drag to reposition`);
}

function selectAdminBuilding(id) {
  adminSelectedBuilding = id;
  const detail = document.getElementById('bldDetailPanel');
  if (detail) detail.innerHTML = renderBuildingEditor(id);
  document.querySelectorAll('.admin-bld-item').forEach(el => {
    el.classList.toggle('selected', el.querySelector('.admin-bld-name')?.textContent === id);
  });
  if (id) initRoomMap2D(id);
}

function renderBuildingEditor(id) {
  const b = adminBuildings.find(x => x.id === id);
  if (!b) return '';
  const roomsInBld = adminRooms.filter(r => r.building === id);
  const rot = normalizeRotation(b.rotation);
  const collisions = getBuildingCollisions(b, adminBuildings, adminCampusElements, id);
  const styles = (typeof BUILDING_STYLES !== 'undefined') ? BUILDING_STYLES : [];
  return `
    <div class="admin-form-title">
      <span style="width:16px;height:16px;border-radius:4px;background:${b.color};display:inline-block;flex-shrink:0;"></span>
      ${b.name} (${b.id})
    </div>
    <div class="admin-form-grid">
      <div class="admin-field">
        <label>Building name</label>
        <input type="text" id="be_name" value="${b.name}">
      </div>
      <div class="admin-field">
        <label>Subtitle</label>
        <input type="text" id="be_subtitle" value="${b.subtitle||''}">
      </div>
      <div class="admin-field">
        <label>Color</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="color" id="be_color" value="${b.color}" style="width:48px;height:36px;border:1px solid #E0D8CE;border-radius:8px;cursor:pointer;">
          <input type="text" id="be_colorHex" value="${b.color}" style="flex:1;" oninput="document.getElementById('be_color').value=this.value">
        </div>
      </div>
      <div class="admin-field" style="grid-column:1/-1;">
        <label>Architectural style</label>
        <div class="admin-style-picker" id="stylePicker_${id}">
          ${styles.map(s => {
            const def = (typeof BUILDING_STYLE_DEFS !== 'undefined' && BUILDING_STYLE_DEFS[s.value]) || {};
            return `
            <div class="admin-style-opt ${(b.icon||'wing')===s.value?'selected':''}"
                 onclick="selectBuildingStyle('${id}','${s.value}')"
                 title="${s.desc}"
                 style="--style-accent:${def.accent || '#D4A373'}">
              <div class="admin-style-preview">${def.preview || ''}</div>
              <span class="admin-style-name">${s.label}</span>
              <span class="admin-style-desc">${s.desc}</span>
            </div>`;
          }).join('')}
        </div>
        <input type="hidden" id="be_icon" value="${b.icon||'wing'}">
      </div>
      <div class="admin-field">
        <label>Rotation</label>
        <div class="admin-rotation-control">
          <button type="button" class="admin-btn admin-btn-secondary admin-rotate-btn" onclick="rotateBuilding90('${id}')" title="Rotate 90° clockwise">
            ↻ Rotate 90°
          </button>
          <span class="admin-rotation-value" id="be_rotation_display">${rot}°</span>
          <input type="hidden" id="be_rotation" value="${rot}">
        </div>
      </div>
      <div class="admin-field">
        <label>Number of floors</label>
        <input type="number" id="be_floors" value="${b.floors}" min="0" max="10">
      </div>
      <div class="admin-field">
        <label>Position X</label>
        <input type="number" id="be_x" value="${b.x}" step="1">
      </div>
      <div class="admin-field">
        <label>Position Z</label>
        <input type="number" id="be_z" value="${b.z}" step="1">
      </div>
      <div class="admin-field">
        <label>Width (3D units)</label>
        <input type="number" id="be_w" value="${b.w}" step="0.5" min="2">
      </div>
      <div class="admin-field">
        <label>Depth (3D units)</label>
        <input type="number" id="be_d" value="${b.d}" step="0.5" min="2">
      </div>
    </div>

    <div id="collisionWarning" style="display:${collisions.length ? 'block' : 'none'};font-size:12px;color:#E53935;margin-top:4px;font-weight:600;">
      ${collisions.length ? `⚠ Overlaps: ${collisions.map(c => c.label).join(', ')}` : ''}
    </div>

    <div style="margin-top:4px;margin-bottom:16px;font-size:12px;color:#888;">
      Drag on the map to reposition. Use ↻ Rotate 90° to change orientation. Save and reload 3D map to apply.
    </div>

    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
      <button class="admin-btn admin-btn-primary" onclick="saveBuildingEdit('${id}')">Save changes</button>
      <button class="admin-btn admin-btn-danger" onclick="confirmDeleteBuilding('${id}')">Delete building</button>
      <button class="admin-btn admin-btn-secondary" onclick="applyAndReloadMap()">Apply & reload 3D map</button>
    </div>

    <div style="font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;margin-bottom:10px;">
      Rooms in this building (${roomsInBld.length})
    </div>

    <div class="admin-room-map-wrap" id="roomMap2DWrap_${id}">
      <div class="admin-room-map-toolbar">
        <label>Floor: </label>
        <select id="roomMapFloor_${id}" onchange="renderRoomMap2D('${id}')">
          ${Array.from({length: b.floors}, (_,i) => i+1).map(f =>
            `<option value="${f}">Floor ${f}</option>`
          ).join('')}
        </select>
        <span style="font-size:11px;color:#999;margin-left:8px;">Drag rooms to reposition them</span>
      </div>
      <svg id="roomMap2D_${id}" class="admin-room-map-svg" xmlns="http://www.w3.org/2000/svg"></svg>
    </div>

    <div class="admin-toolbar" style="margin-bottom:10px;">
      <button class="admin-btn admin-btn-primary" onclick="openRoomForm(null); document.getElementById('rf_bld').value='${id}'">+ Add room to ${id}</button>
    </div>
    <div class="admin-table-wrap" style="max-height:220px;overflow-y:auto;">
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Floor</th><th>Actions</th></tr></thead>
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
          ${roomsInBld.length > 30 ? `<tr><td colspan="5" style="text-align:center;color:#999;font-size:12px;">... and ${roomsInBld.length-30} more spaces</td></tr>` : ''}
        </tbody>
      </table>
    </div>
  `;
}

function selectBuildingStyle(bldId, value) {
  document.getElementById('be_icon').value = value;
  document.querySelectorAll(`#stylePicker_${bldId} .admin-style-opt`).forEach(el => {
    el.classList.toggle('selected', el.getAttribute('onclick')?.includes(`'${value}'`));
  });
}

function rotateBuilding90(id) {
  const b = adminBuildings.find(x => x.id === id);
  if (!b) return;
  b.rotation = normalizeRotation((b.rotation || 0) + 90);
  const rotInput = document.getElementById('be_rotation');
  const rotDisplay = document.getElementById('be_rotation_display');
  if (rotInput) rotInput.value = b.rotation;
  if (rotDisplay) rotDisplay.textContent = `${b.rotation}°`;
  initMap2D();
  if (adminSelectedBuilding === id) initRoomMap2D(id);
  showToast(`Rotation: ${b.rotation}°`);
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
    d: parseFloat(document.getElementById('be_d').value) || 6,
    icon: document.getElementById('be_icon').value || 'wing',
    rotation: normalizeRotation(parseInt(document.getElementById('be_rotation')?.value, 10) || 0)
  };
  try {
    await apiRequest('PUT', `/buildings/${id}`, bldData);
    await loadInitialData();
    renderAdminMap();
    showToast('Building updated');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function renderRoomMap2D(bldId) {
  const b = adminBuildings.find(x => x.id === bldId);
  if (!b) return;
  const floorSel = document.getElementById(`roomMapFloor_${bldId}`);
  const floor = floorSel ? parseInt(floorSel.value) : 1;
  const svg = document.getElementById(`roomMap2D_${bldId}`);
  if (!svg) return;

  const rooms = adminRooms.filter(r => r.building === bldId && r.floor === floor);
  const W = svg.clientWidth || 500;
  const H = svg.clientHeight || 220;
  const PAD = 18;

  const halfW = b.w / 2, halfD = b.d / 2;
  const rangeX = b.w, rangeZ = b.d;
  const scaleX = (W - PAD*2) / rangeX;
  const scaleZ = (H - PAD*2) / rangeZ;
  const scale = Math.min(scaleX, scaleZ);

  const originSX = W/2;
  const originSY = H/2;
  const toSVG = (x, z) => ({
    sx: originSX + x * scale,
    sy: originSY + z * scale
  });

  const typeColors = { class: '#93B5C6', lab: '#7FA37F', office: '#C9A868', special: '#95A5A6' };

  svg.innerHTML = '';

  const { sx: bsx, sy: bsy } = toSVG(-halfW, -halfD);
  const bw = b.w * scale, bd = b.d * scale;
  const bldGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const rot = normalizeRotation(b.rotation);
  const cx = originSX, cy = originSY;
  if (rot) bldGroup.setAttribute('transform', `rotate(${rot} ${cx} ${cy})`);

  const bldRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bldRect.setAttribute('x', bsx); bldRect.setAttribute('y', bsy);
  bldRect.setAttribute('width', bw); bldRect.setAttribute('height', bd);
  bldRect.setAttribute('fill', b.color); bldRect.setAttribute('fill-opacity', '0.08');
  bldRect.setAttribute('stroke', b.color); bldRect.setAttribute('stroke-width', '2');
  bldRect.setAttribute('rx', '4');
  bldGroup.appendChild(bldRect);

  const bldLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  bldLabel.setAttribute('x', bsx + 6); bldLabel.setAttribute('y', bsy + 14);
  bldLabel.setAttribute('font-size', '11'); bldLabel.setAttribute('fill', b.color);
  bldLabel.setAttribute('font-weight', '700'); bldLabel.setAttribute('opacity', '0.6');
  bldLabel.textContent = `${b.id} · Floor ${floor}${rot ? ` · ${rot}°` : ''}`;
  bldGroup.appendChild(bldLabel);
  svg.appendChild(bldGroup);

  if (rooms.length === 0) {
    const empty = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    empty.setAttribute('x', W/2); empty.setAttribute('y', H/2);
    empty.setAttribute('text-anchor', 'middle'); empty.setAttribute('fill', '#aaa');
    empty.setAttribute('font-size', '13');
    empty.textContent = 'No rooms on this floor';
    svg.appendChild(empty);
    return;
  }

  rooms.forEach(r => {
    const {sx, sy} = toSVG(r.x - r.w/2, r.z - r.d/2);
    const rw = Math.max(r.w * scale, 18);
    const rd = Math.max(r.d * scale, 14);
    const col = typeColors[r.type] || '#aaa';

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('cursor', 'grab');

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', sx); rect.setAttribute('y', sy);
    rect.setAttribute('width', rw); rect.setAttribute('height', rd);
    rect.setAttribute('fill', col); rect.setAttribute('fill-opacity', '0.82');
    rect.setAttribute('stroke', '#fff'); rect.setAttribute('stroke-width', '1.5');
    rect.setAttribute('rx', '2');
    g.appendChild(rect);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', sx + rw/2); label.setAttribute('y', sy + rd/2 + 4);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', Math.max(7, Math.min(11, rw/3)));
    label.setAttribute('fill', '#fff'); label.setAttribute('font-weight', '600');
    label.setAttribute('pointer-events', 'none');
    label.textContent = r.id;
    g.appendChild(label);

    let dragging = false, startMX, startMY, startRX, startRZ;
    g.addEventListener('mousedown', e => {
      e.stopPropagation();
      dragging = true;
      startMX = e.clientX; startMY = e.clientY;
      startRX = r.x; startRZ = r.z;
      g.setAttribute('cursor', 'grabbing');
      const onMove = ev => {
        if (!dragging) return;
        const dx = (ev.clientX - startMX) / scale;
        const dz = (ev.clientY - startMY) / scale;
        r.x = Math.round((startRX + dx) * 4) / 4;
        r.z = Math.round((startRZ + dz) * 4) / 4;
        renderRoomMap2D(bldId);
      };
      const onUp = async () => {
        dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        try {
          await apiRequest('PUT', `/rooms/${r.id}`, { ...r });
          showToast(`${r.id} moved`);
        } catch(e) { showToast('Error saving position'); }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    svg.appendChild(g);
  });
}

function initRoomMap2D(bldId) {
  setTimeout(() => renderRoomMap2D(bldId), 50);
}

async function openAddBuildingForm() {
  const modal = document.createElement('div');
  modal.className = 'admin-confirm';
  modal.id = 'addBldModal';
  modal.innerHTML = `
    <div class="admin-confirm-box" style="width:min(480px,96vw);text-align:left;max-height:90vh;overflow-y:auto;">
      <h3>New Building</h3>
      <div class="admin-form-grid" style="margin-top:14px;">
        <div class="admin-field">
          <label>ID (e.g. E, F, LAB2)</label>
          <input type="text" id="nb_id" placeholder="Unique ID">
        </div>
        <div class="admin-field">
          <label>Name</label>
          <input type="text" id="nb_name" placeholder="Building E">
        </div>
        <div class="admin-field">
          <label>Subtitle</label>
          <input type="text" id="nb_subtitle" placeholder="e.g. Technology">
        </div>
        <div class="admin-field">
          <label>Color</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="color" id="nb_color" value="#58A4B0" style="width:48px;height:36px;border:1px solid #E0D8CE;border-radius:8px;cursor:pointer;">
            <span style="font-size:13px;color:#999">(choose from picker)</span>
          </div>
        </div>
        <div class="admin-field">
          <label>Floors</label>
          <input type="number" id="nb_floors" value="3" min="0" max="10">
        </div>
        <div class="admin-field">
          <label>Position X</label>
          <input type="number" id="nb_x" value="30" step="1">
        </div>
        <div class="admin-field">
          <label>Position Z</label>
          <input type="number" id="nb_z" value="0" step="1">
        </div>
        <div class="admin-field">
          <label>Width</label>
          <input type="number" id="nb_w" value="8" step="0.5" min="2">
        </div>
        <div class="admin-field">
          <label>Depth</label>
          <input type="number" id="nb_d" value="6" step="0.5" min="2">
        </div>
      </div>
      <div style="font-size:12px;color:#888;margin-top:8px;">
        Tip: place the new building at X > 30 or X < -30 to avoid overlaps.
      </div>
      <div class="btns" style="margin-top:16px;">
        <button class="admin-btn admin-btn-primary" style="flex:1" onclick="saveNewBuilding()">Add</button>
        <button class="admin-btn admin-btn-secondary" style="flex:1" onclick="document.getElementById('addBldModal').remove()">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveNewBuilding() {
  const id = document.getElementById('nb_id').value.trim().toUpperCase();
  if (!id) { alert('ID required'); return; }
  if (adminBuildings.find(b => b.id === id)) { alert('ID already exists'); return; }
  const bldData = {
    id,
    name: document.getElementById('nb_name').value.trim() || `Building ${id}`,
    subtitle: document.getElementById('nb_subtitle').value.trim(),
    color: document.getElementById('nb_color').value,
    floors: parseInt(document.getElementById('nb_floors').value)||3,
    rooms: 0,
    x: parseFloat(document.getElementById('nb_x').value)||30,
    z: parseFloat(document.getElementById('nb_z').value)||0,
    w: parseFloat(document.getElementById('nb_w').value)||8,
    d: parseFloat(document.getElementById('nb_d').value)||6,
    icon: 'wing',
    rotation: 0
  };
  try {
    await apiRequest('POST', '/buildings', bldData);
    await loadInitialData();
    document.getElementById('addBldModal').remove();
    adminSelectedBuilding = id;
    renderAdminMap();
    showToast('Building added');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function confirmDeleteBuilding(id) {
  const b = adminBuildings.find(x => x.id === id);
  adminConfirm(`Delete ${b?.name}?`, 'All rooms in this building will also be deleted.', async () => {
    try {
      await apiRequest('DELETE', `/buildings/${id}`);
      await loadInitialData();
      adminSelectedBuilding = null;
      renderAdminMap();
      showToast('Building deleted');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });
}

function applyAndReloadMap() {
  if (typeof mapInitialized !== 'undefined' && mapInitialized) {
    if (typeof buildCampus3D === 'function') {
      while(campusGroup.children.length) campusGroup.remove(campusGroup.children[0]);
      buildingMeshes = {};
      activeIndoorBuilding = null;
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
          showToast('3D map updated!');
        } catch (err) {
          console.error('Error reloading map', err);
        }
      })();
    }
  }
}

function renderAdminCSV() {
  document.getElementById('adminContent').innerHTML = `
    <div class="admin-section-title">CSV Import / Export</div>
    <div class="admin-section-sub">Upload CSV files to bulk update teachers, rooms, or schedules</div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px;">
      ${[
        { label: 'Teachers', icon: '👨‍🏫', type: 'teachers', template: 'ID,Title,First Name,Last Name,Department,Subject,Building,Floor,Office', example: 'T999,Prof.,Mario,Rossi,Science,Physics,A,2,A-201' },
        { label: 'Rooms', icon: '🏫', type: 'rooms', template: 'ID,Name,Type,Building,Floor,Subject,X,Z,W,D', example: 'X-101,Room X-101,class,A,1,Math,2,0,2,2' },
        { label: 'Schedules', icon: '📅', type: 'schedule', template: 'Class,Day,Hour,Subject,Teacher,Room', example: '3A,MON,0,Math,Prof. Rossi,A-101' },
      ].map(item => `
        <div class="admin-form-card">
          <div class="admin-form-title">${item.icon} ${item.label}</div>
          <div class="csv-dropzone" onclick="triggerCSVUpload('${item.type}')" 
               ondragover="event.preventDefault()" ondrop="handleCSVDrop(event,'${item.type}')">
            <div class="csv-dropzone-icon">📂</div>
            <div class="csv-dropzone-text">Drag & drop or click</div>
            <div class="csv-dropzone-sub">.csv file — max 5MB</div>
          </div>
          <input type="file" id="csvInput_${item.type}" accept=".csv" style="display:none" onchange="handleCSVFile(this,'${item.type}')">
          <div style="margin-top:10px;">
            <div style="font-size:11px;font-weight:700;color:#6B5E4F;text-transform:uppercase;margin-bottom:4px;">Required format:</div>
            <div class="csv-preview">${item.template}\n${item.example}</div>
          </div>
          <button class="admin-btn admin-btn-secondary" style="width:100%;" onclick="downloadTemplate('${item.type}','${item.template}','${item.example}')">
            ↓ Download CSV template
          </button>
        </div>
      `).join('')}
    </div>

    <div id="csvPreviewArea"></div>

    <div class="admin-form-card">
      <div class="admin-form-title">📊 Full export</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="admin-btn admin-btn-secondary" onclick="exportTeachersCSV()">↓ Export Teachers</button>
        <button class="admin-btn admin-btn-secondary" onclick="exportRoomsCSV()">↓ Export Rooms</button>
        <button class="admin-btn admin-btn-secondary" onclick="exportAllSchedulesCSV()">↓ Export All Schedules</button>
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
        <div class="admin-form-title">📋 Preview: ${file.name} (${rows.length} rows)</div>
        <div class="csv-preview">${lines.slice(0,6).map(l => l.join(', ')).join('\n')}</div>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button class="admin-btn admin-btn-primary" onclick="confirmImportCSV('${type}', ${JSON.stringify(rows).replace(/'/g, "\\'")} )">
            ✓ Import ${rows.length} rows
          </button>
          <button class="admin-btn admin-btn-secondary" onclick="document.getElementById('csvPreviewArea').innerHTML=''">Cancel</button>
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
      showToast('Schedule CSV import not yet implemented');
      return;
    }
    await loadInitialData();
    document.getElementById('csvPreviewArea').innerHTML = '';
    if (type === 'teachers') renderAdminTeachers();
    else if (type === 'rooms') renderAdminRooms();
    showToast(`Imported ${count} rows successfully`);
  } catch (err) {
    alert('Import error: ' + err.message);
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
  try {
    const res = await fetch(`${API_BASE}/schedule`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const schedule = await res.json();
    const headers = ['Class','Day','Hour','Subject','Teacher','Room'];
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
    a.download = 'all_schedules.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Export error: ' + err.message);
  }
}

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
        <button class="admin-btn admin-btn-danger" style="flex:1" id="confirmYes">Confirm</button>
        <button class="admin-btn admin-btn-secondary" style="flex:1" onclick="document.getElementById('adminConfirmDialog').remove()">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  document.getElementById('confirmYes').onclick = () => {
    el.remove();
    onConfirm();
  };
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

if (adminToken) {
  window.addEventListener('load', async () => {
    try {
      await loadInitialData();
      const overlay = document.getElementById('adminOverlay');
      if (overlay && overlay.style.display !== 'none') {
        document.getElementById('adminLoginModal').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'flex';
        adminTab('teachers');
      }
    } catch (err) {
      console.error('Auto-login failed', err);
      localStorage.removeItem('adminToken');
    }
  });
}