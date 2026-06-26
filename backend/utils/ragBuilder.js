const { readDB } = require('./db');

function buildContext() {
  const db = readDB();
  const buildings = db.buildings.map(b =>
    `Edificio ${b.id}: "${b.name}" (${b.subtitle || ''}), ${b.floors} piani, ${b.rooms} aule.`
  ).join('\n');

  const rooms = db.rooms.map(r =>
    `Aula ${r.id}: edificio ${r.building}, piano ${r.floor}, tipo ${r.type}${r.subject ? ', materia: ' + r.subject : ''}.`
  ).join('\n');

  const teachers = (db.teachers || []).slice(0, 60).map(t =>
    `Prof. ${t.firstName} ${t.lastName}: ${t.department || ''}, ufficio ${t.room || 'N/D'}.`
  ).join('\n');

  return `Sei l'assistente del Campus Navigator dell'Istituto G. Galilei. Rispondi SOLO con le informazioni qui sotto. Se non sai, dì che non hai l'informazione. Rispondi nella lingua dell'utente. Quando citi un'aula o un edificio, includi alla fine della risposta una riga JSON speciale così: ACTION:{"tab":"map","roomId":"ID_AULA"} — solo se pertinente.

=== EDIFICI ===
${buildings}

=== AULE (prime 80) ===
${rooms}

=== DOCENTI (primi 60) ===
${teachers}`;
}

module.exports = { buildContext };