// Supabase Edge Function "ai": leitet Anfragen der App an Claude weiter.
// Der API-Schlüssel liegt nur hier als Secret ANTHROPIC_API_KEY, nie in der App.
const KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL = 'claude-haiku-5-5';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json' } });

const TOOLS: Record<string, { system: string; tool: Record<string, unknown> }> = {
  recipe: {
    system: 'Du liest Rezepte aus Text, Untertiteln, gesprochener Sprache und Bildern (Standbilder aus Kochvideos in zeitlicher Reihenfolge, Fotos von Rezepten). Eingeblendete Untertitel und Texte in den Bildern gehören zum Rezept, lies sie alle. Antworte immer auf Deutsch. Zutaten mit deutschen Supermarkt-Namen in Grundform (z. B. "Zwiebeln", "Hackfleisch", "Sahne"), Mengen in g, ml, EL, TL oder Stück. Fehlt eine Menge, schätze eine übliche. Schritte kurz und klar. Erfinde nichts, was nicht zum Rezept passt. Wenn es eine Spracheingabe ist, korrigiere offensichtliche Hörfehler.',
    tool: {
      name: 'rezept', description: 'Das erkannte Rezept',
      input_schema: { type: 'object', properties: {
        title: { type: 'string' }, servings: { type: 'number', description: 'Portionen' },
        ingredients: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, amount: { type: 'string', description: 'z. B. "500 g", "2", "1 EL"' } }, required: ['name'] } },
        steps: { type: 'array', items: { type: 'string' } },
      }, required: ['title', 'ingredients', 'steps'] },
    },
  },
  diary: {
    system: 'Du wandelst eine gesprochene oder getippte Beschreibung, was jemand gegessen hat, in eine Liste um. Antworte auf Deutsch. Lebensmittel als einfache, allgemeine Namen in Grundform (z. B. "Vollkornbrot", "Gouda", "Banane", "Haferflocken", "Milch 1,5 %"). Schätze für jedes Lebensmittel realistische Gramm, auch bei Angaben wie "zwei Scheiben", "eine Handvoll", "ein großer Teller". Wenn etwas zu einem der geplanten Gerichte oder eigenen Rezepte passt, nimm dieses statt der Einzelzutaten, mit dem Anteil einer Portion (z. B. 0.5 für die Hälfte). Korrigiere offensichtliche Hörfehler.',
    tool: {
      name: 'eintrag', description: 'Was gegessen wurde',
      input_schema: { type: 'object', properties: {
        foods: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, label: { type: 'string', description: 'Menge wie gesagt, z. B. "2 Scheiben"' }, grams: { type: 'number' } }, required: ['name', 'grams'] } },
        plans: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, factor: { type: 'number' } }, required: ['id', 'factor'] } },
        recipes: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, factor: { type: 'number' } }, required: ['title', 'factor'] } },
      }, required: ['foods'] },
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (!KEY) return json({ ok: false, error: 'Kein API-Schlüssel hinterlegt' }, 500);
    const body = await req.json();
    const task = String(body.task || '');
    if (task === 'ping') return json({ ok: true, data: 'ok' });
    const cfg = TOOLS[task]; if (!cfg) return json({ ok: false, error: 'Unbekannte Aufgabe' }, 400);
    const text = String(body.text || '').slice(0, 20000);
    const frames: string[] = Array.isArray(body.frames) ? body.frames.slice(0, 48) : [];
    if (frames.some((f) => typeof f !== 'string' || f.length > 700000)) return json({ ok: false, error: 'Bild zu groß' }, 400);
    const context = String(body.context || '').slice(0, 4000);
    const content = [
      ...frames.map((data) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } })),
      { type: 'text', text: (context ? context + '\n\n' : '') + (text ? 'Text:\n' + text : 'Lies das Rezept aus den Bildern.') },
    ];
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 2500, system: cfg.system, tools: [cfg.tool], tool_choice: { type: 'tool', name: (cfg.tool as { name: string }).name }, messages: [{ role: 'user', content }] }),
    });
    const j = await r.json();
    if (!r.ok) return json({ ok: false, error: j?.error?.message || 'KI-Fehler' }, 502);
    const out = (j.content || []).find((c: { type: string }) => c.type === 'tool_use');
    return json({ ok: true, data: out ? out.input : null, usage: j.usage });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 400);
  }
});
