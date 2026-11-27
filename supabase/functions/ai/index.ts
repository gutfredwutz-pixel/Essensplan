// Supabase Edge Function "ai": leitet Anfragen der App an Claude weiter.
// Der API-Schlüssel liegt nur hier als Secret ANTHROPIC_API_KEY, nie in der App.
const KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const XI = Deno.env.get('ELEVENLABS_API_KEY') ?? '';
const MODEL = 'claude-haiku-5-5';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json' } });

const TOOLS: Record<string, { system: string; tool: Record<string, unknown> }> = {
  recipe: {
    system: 'Du liest Rezepte aus Text, Untertiteln, gesprochener Sprache und Bildern (Standbilder aus Kochvideos in zeitlicher Reihenfolge, Fotos von Rezepten). Eingeblendete Untertitel und Texte in den Bildern gehören zum Rezept, lies sie alle. Schreibe die Zubereitung als vollständige, nachkochbare Schritte in der richtigen Reihenfolge. Nutze dafür auch, was du in den Bildern siehst, selbst wenn es nicht gesagt wird: was in welche Pfanne oder welchen Topf kommt, wie stark angebraten wird, wann etwas fertig aussieht, welche Werkzeuge benutzt werden. Ergänze fehlende Hitze, Zeiten und Garzustände mit üblichen Werten, aber erfinde keine Zutaten, die nicht vorkommen. Jeder Schritt ein bis zwei klare Sätze. Antworte immer auf Deutsch. Zutaten mit deutschen Supermarkt-Namen in Grundform (z. B. "Zwiebeln", "Hackfleisch", "Sahne"), Mengen in g, ml, EL, TL oder Stück. Fehlt eine Menge, schätze eine übliche. Schritte kurz und klar. Erfinde nichts, was nicht zum Rezept passt. Wenn es eine Spracheingabe ist, korrigiere offensichtliche Hörfehler.',
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
    system: 'Du wandelst eine gesprochene oder getippte Beschreibung, was jemand gegessen hat, in eine Liste um. Antworte auf Deutsch. Lebensmittel als einfache, allgemeine Namen in Grundform (z. B. "Vollkornbrot", "Gouda", "Banane", "Haferflocken", "Milch 1,5 %"). Schätze für jedes Lebensmittel realistische Gramm, auch bei Angaben wie "zwei Scheiben", "eine Handvoll", "ein großer Teller". Wenn etwas zu einem der geplanten Gerichte oder eigenen Rezepte passt, nimm dieses statt der Einzelzutaten, mit dem Anteil einer Portion (z. B. 0.5 für die Hälfte). Teile Gemischtes und selbst Zusammengestelltes immer in die einzelnen Zutaten auf, jede mit eigenen Gramm (z. B. "Mix aus Kokos und Rosinen" oder "Kokos-Rosinen-Mix" → "Kokosraspeln" und "Rosinen"; "Proteinshake mit Milch" → "Whey-Proteinpulver" und "Milch"; "Müsli mit Joghurt und Beeren" → drei Einträge). Ein Eintrag nur für Dinge, die man so fertig kaufen oder bestellen kann (z. B. "Pizza Margherita", "Studentenfutter"). Erfinde keine Namen wie "...-Mix". Proteinpulver heißt immer "Whey-Proteinpulver", ein Messlöffel sind etwa 30 g. Korrigiere offensichtliche Hörfehler (z. B. "Wei" oder "Way" → Whey).',
    tool: {
      name: 'eintrag', description: 'Was gegessen wurde',
      input_schema: { type: 'object', properties: {
        foods: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, label: { type: 'string', description: 'Menge wie gesagt, z. B. "2 Scheiben"' }, grams: { type: 'number' } }, required: ['name', 'grams'] } },
        plans: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, factor: { type: 'number' } }, required: ['id', 'factor'] } },
        recipes: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, factor: { type: 'number' } }, required: ['title', 'factor'] } },
      }, required: ['foods'] },
    },
  },
  meal: {
    system: 'Du schlägst einem Studenten in Deutschland 3 einfache Gerichte für die nächsten Tage vor. Nutze vor allem, was im Vorrat ist, und frische Sachen, die schon länger da sind, zuerst. Die Gerichte sollen die Nährstoffe liefern, die zuletzt gefehlt haben. Pro Gericht höchstens 3 Sachen dazukaufen, am besten aus den genannten Kauf-Ideen, mit einfachen deutschen Supermarkt-Namen in Grundform. Alltagstauglich, 10 bis 30 Minuten, normale Küche, keine exotischen Zutaten. Passt ein eigenes Rezept, nimm es mit genau diesem Titel. Nichts vorschlagen, was unter „Mögen wir nicht“ steht. Antworte auf Deutsch, kurz und ohne Fachjargon: why ist ein Satz, welche fehlenden Nährstoffe das Gericht bringt; steps sind 2 bis 4 kurze Sätze.',
    tool: {
      name: 'ideen', description: 'Gericht-Ideen',
      input_schema: { type: 'object', properties: {
        ideas: { type: 'array', items: { type: 'object', properties: {
          title: { type: 'string' }, why: { type: 'string' },
          use: { type: 'array', items: { type: 'string' }, description: 'Zutaten aus dem Vorrat' },
          buy: { type: 'array', items: { type: 'string' }, description: 'Was dazu gekauft werden muss' },
          steps: { type: 'array', items: { type: 'string' } },
        }, required: ['title', 'use', 'buy'] } },
      }, required: ['ideas'] },
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json();
    const task = String(body.task || '');
    if (task === 'ping') return json({ ok: true, data: { claude: !!KEY, speech: !!XI } });
    if (task === 'stt_token') {
      if (!XI) return json({ ok: false, error: 'Kein Spracherkennungs-Schlüssel' });
      const t = await fetch('https://api.elevenlabs.io/v1/single-use-token/batch_scribe', { method: 'POST', headers: { 'xi-api-key': XI } });
      const tj = await t.json();
      if (!t.ok || !tj.token) return json({ ok: false, error: tj?.detail?.message || 'Token-Fehler' }, 502);
      return json({ ok: true, data: { token: tj.token } });
    }
    if (!KEY) return json({ ok: false, error: 'Kein API-Schlüssel hinterlegt' }, 500);
    const cfg = TOOLS[task]; if (!cfg) return json({ ok: false, error: 'Unbekannte Aufgabe' }, 400);
    const text = String(body.text || '').slice(0, 20000);
    const frames: string[] = Array.isArray(body.frames) ? body.frames.slice(0, 48) : [];
    if (frames.some((f) => typeof f !== 'string' || f.length > 700000)) return json({ ok: false, error: 'Bild zu groß' }, 400);
    const context = String(body.context || '').slice(0, 4000);
    const content = [
      ...frames.flatMap((data, k) => [{ type: 'text', text: `Bild ${k + 1} von ${frames.length}` }, { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } }]),
      { type: 'text', text: (context ? context + '\n\n' : '') + (text ? (task === 'meal' ? text : 'Text:\n' + text) : 'Lies das Rezept aus den Bildern.') },
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
