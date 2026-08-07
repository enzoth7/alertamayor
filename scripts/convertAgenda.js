const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/agenda.md'), 'utf8'));

const mapped = raw.activities.map((item, idx) => {
  const cat = (item.category || 'CULTURA').toUpperCase();
  let interests = [];
  const catLower = (item.category || '').toLowerCase();
  const tags = (item.tags || []).map(t => t.toLowerCase());
  
  if (catLower.includes('movimiento') || tags.some(t => t.includes('gimnasia') || t.includes('movimiento') || t.includes('deporte') || t.includes('tai chi') || t.includes('yoga'))) {
    interests.push('Moverme');
  }
  if (catLower.includes('aprender') || tags.some(t => t.includes('aprender') || t.includes('taller') || t.includes('capacitación') || t.includes('inteligencia artificial') || t.includes('lectura') || t.includes('tecnología'))) {
    interests.push('Aprender');
  }
  if (catLower.includes('cultura') || tags.some(t => t.includes('música') || t.includes('teatro') || t.includes('arte') || t.includes('cine') || t.includes('folclore') || t.includes('exposición'))) {
    interests.push('Cultura');
  }
  if (catLower.includes('recreación') || tags.some(t => t.includes('encuentro') || t.includes('personas mayores') || t.includes('social') || t.includes('mate') || t.includes('juego'))) {
    interests.push('Conocer gente');
  }
  if (interests.length === 0) {
    interests = ['Conocer gente', 'Cultura'];
  }

  let color = '#1d4ed8';
  if (interests.includes('Moverme')) color = '#087443';
  else if (interests.includes('Cultura')) color = '#e83e6f';
  else if (interests.includes('Aprender')) color = '#6941c6';
  else if (interests.includes('Conocer gente')) color = '#d97706';

  let moment = 'Entre semana';
  if (item.dates && item.dates.some(d => {
    const day = new Date(d + 'T12:00:00Z').getUTCDay();
    return day === 0 || day === 6;
  }) || (item.schedule && (item.schedule.toLowerCase().includes('sábado') || item.schedule.toLowerCase().includes('domingo') || item.schedule.toLowerCase().includes('fin de semana')))) {
    moment = 'Fin de semana';
  }

  let zone = item.department || 'Montevideo';
  if (zone === 'Desde casa') zone = 'Montevideo';

  return {
    id: item.id || 'act-agenda-' + idx,
    icon: item.icon || '📍',
    category: cat,
    title: item.title,
    place: item.locality ? `${item.place} (${item.locality})` : item.place,
    zone: zone,
    moment: moment,
    freeOnly: item.costType === 'free' || (item.cost && item.cost.toLowerCase().includes('gratuit')),
    accessible: Boolean(item.accessibility && !item.accessibility.toLowerCase().includes('no informada')),
    smallGroups: true,
    interests: interests,
    time: item.schedule || 'Horario a confirmar',
    color: color,
    lat: item.lat || -32.5228,
    lng: item.lng || -55.7658,
    description: item.summary || item.title,
    organizer: item.organizer || 'Organización comunitaria'
  };
});

const content = 'import type { ActivityItem } from "./ActivitiesView";\n\nexport const AGENDA_ACTIVITIES: ActivityItem[] = ' + JSON.stringify(mapped, null, 2) + ';\n';
fs.writeFileSync(path.join(__dirname, '../app/components/agendaData.ts'), content, 'utf8');
console.log('Successfully generated app/components/agendaData.ts with', mapped.length, 'activities');
