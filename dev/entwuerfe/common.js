// Gemeinsame Inhalte für alle Entwürfe
window.DATA = {
  hello: 'Guten Morgen, Jakob', date: 'Donnerstag, 26. November',
  sleep: { dur: '7 h 20 min', span: '23:40 bis 7:00', pct: .92 },
  todos: { done: 3, all: 5, open: ['Bibliothek: Statistik-Skript abholen', 'Frieda wegen Samstag schreiben'] },
  food: { today: 'Linsencurry mit Reis', list: 8, kcal: .64 },
  news: [ { src: 'Süddeutsche', t: 'MVG: U-Bahn-Ausbau in Freiham kommt schneller' },
          { src: 'Handelsblatt', t: 'EZB lässt Leitzins unverändert bei 2,0 Prozent' } ]
};
function ring(p, r, w, cls){ const c=2*Math.PI*r; return `<svg width="${2*r+w}" height="${2*r+w}" viewBox="0 0 ${2*r+w} ${2*r+w}" class="${cls||''}"><circle cx="${r+w/2}" cy="${r+w/2}" r="${r}" fill="none" stroke-width="${w}" class="rt"/><circle cx="${r+w/2}" cy="${r+w/2}" r="${r}" fill="none" stroke-width="${w}" stroke-linecap="round" class="rf" stroke-dasharray="${c*p} ${c}" transform="rotate(-90 ${r+w/2} ${r+w/2})"/></svg>`; }
