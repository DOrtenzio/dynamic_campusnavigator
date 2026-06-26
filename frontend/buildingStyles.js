/** Architectural style definitions — shared by admin picker and 3D renderer */
const BUILDING_STYLE_DEFS = {
  main: {
    label: 'Classic',
    desc: 'Stone facade, pediment, terracotta gabled roof',
    accent: '#C45C3E',
    roof: '#8B4513',
    facade: '#E8DCC8',
    preview: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="18" width="36" height="22" fill="#E8DCC8" stroke="#C45C3E" stroke-width="1.5"/>
      <polygon points="24,6 4,20 44,20" fill="#8B4513"/>
      <rect x="14" y="26" width="6" height="8" fill="#FFE082" rx="1"/>
      <rect x="21" y="26" width="6" height="8" fill="#FFE082" rx="1"/>
      <rect x="28" y="26" width="6" height="8" fill="#FFE082" rx="1"/>
      <rect x="20" y="32" width="8" height="8" fill="#4A3728" rx="1"/>
      <rect x="10" y="38" width="4" height="4" fill="#C45C3E"/>
      <rect x="34" y="38" width="4" height="4" fill="#C45C3E"/>
    </svg>`
  },
  wing: {
    label: 'Modern',
    desc: 'Glass curtain wall, flat roof, ribbon windows',
    accent: '#2196F3',
    roof: '#78909C',
    facade: '#ECEFF1',
    preview: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="14" width="32" height="26" fill="#ECEFF1" stroke="#2196F3" stroke-width="1.5"/>
      <rect x="8" y="14" width="32" height="3" fill="#78909C"/>
      <rect x="11" y="20" width="26" height="4" fill="#81D4FA" opacity="0.9"/>
      <rect x="11" y="27" width="26" height="4" fill="#81D4FA" opacity="0.9"/>
      <rect x="11" y="34" width="26" height="4" fill="#81D4FA" opacity="0.9"/>
      <rect x="20" y="38" width="8" height="2" fill="#455A64"/>
    </svg>`
  },
  brutalist: {
    label: 'Brutalist',
    desc: 'Raw concrete, punched windows, heavy bands',
    accent: '#616161',
    roof: '#424242',
    facade: '#9E9E9E',
    preview: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="36" height="32" fill="#9E9E9E" stroke="#424242" stroke-width="2"/>
      <rect x="6" y="18" width="36" height="3" fill="#616161"/>
      <rect x="6" y="28" width="36" height="3" fill="#616161"/>
      <rect x="10" y="14" width="4" height="3" fill="#333"/>
      <rect x="18" y="14" width="4" height="3" fill="#333"/>
      <rect x="26" y="14" width="4" height="3" fill="#333"/>
      <rect x="34" y="14" width="4" height="3" fill="#333"/>
      <rect x="10" y="22" width="4" height="3" fill="#333"/>
      <rect x="18" y="22" width="4" height="3" fill="#333"/>
      <rect x="26" y="22" width="4" height="3" fill="#333"/>
      <rect x="34" y="22" width="4" height="3" fill="#333"/>
      <rect x="20" y="34" width="8" height="8" fill="#333"/>
    </svg>`
  },
  liberty: {
    label: 'Liberty',
    desc: 'Art Nouveau curves, gold trim, copper roof',
    accent: '#D4AF37',
    roof: '#2E7D52',
    facade: '#FFF8E7',
    preview: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="16" width="32" height="26" fill="#FFF8E7" stroke="#D4AF37" stroke-width="1.5"/>
      <polygon points="24,4 10,18 38,18" fill="#2E7D52"/>
      <path d="M8 22 Q24 26 40 22" fill="none" stroke="#D4AF37" stroke-width="2"/>
      <ellipse cx="16" cy="28" rx="4" ry="5" fill="#FFD699"/>
      <ellipse cx="24" cy="28" rx="4" ry="5" fill="#FFD699"/>
      <ellipse cx="32" cy="28" rx="4" ry="5" fill="#FFD699"/>
      <rect x="20" y="36" width="8" height="6" fill="#8B6914" rx="2"/>
    </svg>`
  },
  industrial: {
    label: 'Industrial',
    desc: 'Brick and steel, sawtooth roof, factory windows',
    accent: '#BF360C',
    roof: '#546E7A',
    facade: '#8D6E63',
    preview: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="20" width="36" height="22" fill="#8D6E63" stroke="#BF360C" stroke-width="1.5"/>
      <polygon points="6,20 12,12 18,20" fill="#546E7A"/>
      <polygon points="18,20 24,12 30,20" fill="#607D8B"/>
      <polygon points="30,20 36,12 42,20" fill="#546E7A"/>
      <rect x="10" y="24" width="28" height="6" fill="#B3E5FC" opacity="0.8"/>
      <rect x="10" y="33" width="28" height="6" fill="#B3E5FC" opacity="0.8"/>
      <line x1="6" y1="20" x2="6" y2="42" stroke="#37474F" stroke-width="2"/>
      <line x1="42" y1="20" x2="42" y2="42" stroke="#37474F" stroke-width="2"/>
    </svg>`
  },
  gym: {
    label: 'Gym',
    desc: 'Corrugated metal, barrel vault, clerestory',
    accent: '#FF6F00',
    roof: '#78909C',
    facade: '#B0BEC5',
    preview: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="22" width="36" height="20" fill="#B0BEC5" stroke="#FF6F00" stroke-width="1.5"/>
      <path d="M6 22 Q24 8 42 22" fill="#78909C"/>
      <line x1="10" y1="26" x2="38" y2="26" stroke="#78909C" stroke-width="1"/>
      <line x1="10" y1="30" x2="38" y2="30" stroke="#78909C" stroke-width="1"/>
      <line x1="10" y1="34" x2="38" y2="34" stroke="#78909C" stroke-width="1"/>
      <rect x="10" y="16" width="28" height="4" fill="#E8F5E9" opacity="0.9"/>
      <rect x="18" y="36" width="12" height="6" fill="#37474F" rx="1"/>
    </svg>`
  },
  field: {
    label: 'Open field',
    desc: 'Grass pitch with markings and goals',
    accent: '#2E7D32',
    roof: '#4CAF50',
    facade: '#66BB6A',
    preview: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="40" height="32" fill="#4CAF50" rx="2"/>
      <rect x="4" y="23" width="40" height="2" fill="#fff" opacity="0.8"/>
      <circle cx="24" cy="24" r="6" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.8"/>
      <rect x="4" y="16" width="8" height="16" fill="none" stroke="#fff" stroke-width="1" opacity="0.7"/>
      <rect x="36" y="16" width="8" height="16" fill="none" stroke="#fff" stroke-width="1" opacity="0.7"/>
    </svg>`
  },
  pavilion: {
    label: 'Pavilion',
    desc: 'Open columns, lightweight canopy roof',
    accent: '#00897B',
    roof: '#E0F2F1',
    facade: '#B2DFDB',
    preview: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <polygon points="24,8 4,22 44,22" fill="#E0F2F1" stroke="#00897B" stroke-width="1.5"/>
      <line x1="10" y1="22" x2="10" y2="40" stroke="#00897B" stroke-width="3"/>
      <line x1="24" y1="22" x2="24" y2="40" stroke="#00897B" stroke-width="3"/>
      <line x1="38" y1="22" x2="38" y2="40" stroke="#00897B" stroke-width="3"/>
      <line x1="6" y1="40" x2="42" y2="40" stroke="#00897B" stroke-width="1" stroke-dasharray="3 2"/>
    </svg>`
  }
};

const BUILDING_STYLES = Object.entries(BUILDING_STYLE_DEFS).map(([value, def]) => ({
  value,
  label: def.label,
  desc: def.desc
}));
