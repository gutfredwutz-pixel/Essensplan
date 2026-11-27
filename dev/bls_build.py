"""Hängt zusätzliche Nährwerte aus dem BLS 4.0 an die Vektoren der App an.
Aufruf:  python3 dev/bls_build.py /pfad/BLS_4_0_Daten_2025_DE.xlsx
Quelle: Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0, DOI 10.25826/Data20251217-134202-0, Lizenz CC BY 4.0
(Download: blsdb.de > BLS-Daten > Download BLS-Daten)

Die ersten 24 Werte bleiben wie gehabt. Angehängt werden (Index: Code, Einheit in der App):
24 FAMS g, 25 FAPU g, 26 FAPUN6 g, 27 ALA (F18:3CN3) g, 28 EPA (F20:5CN3) g, 29 DHA (F22:6CN3) g, 30 DPA (F22:5CN3) g,
31 STARCH g, 32 VITK µg, 33 NIAEQ mg, 34 PANTAC mg, 35 BIOT µg, 36 P mg, 37 CU mg, 38 MN mg, 39 LACS g,
40 HIS g, 41 ILE g, 42 LEU g, 43 LYS g, 44 MET+CYSTE g, 45 PHE+TYR g, 46 THR g, 47 TRP g, 48 VAL g
"""
import json, re, sys, pathlib
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXTRA = [('FAMS', 1), ('FAPU', 1), ('FAPUN6', 1), ('F18:3CN3', 1), ('F20:5CN3', 1), ('F22:6CN3', 1), ('F22:5CN3', 1),
         ('STARCH', 1), ('VITK', 1), ('NIAEQ', 1), ('PANTAC', 1), ('BIOT', 1), ('P', 1), ('CU', 0.001), ('MN', 0.001), ('LACS', 1),
         ('HIS', 1), ('ILE', 1), ('LEU', 1), ('LYS', 1), (('MET', 'CYSTE'), 1), (('PHE', 'TYR'), 1), ('THR', 1), ('TRP', 1), ('VAL', 1)]
N = 24 + len(EXTRA)


def sig(x):
    if not x: return 0
    from math import log10, floor
    d = max(0, 3 - int(floor(log10(abs(x)))))
    r = round(x, d)
    return int(r) if r == int(r) else r


def read(path):
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = ws.iter_rows(values_only=True)
    head = next(rows)
    col = {}
    for i, hd in enumerate(head):
        m = re.match(r'^(\S+) .*\[', str(hd or ''))
        if m and m.group(1) not in col: col[m.group(1)] = i
    out = {}
    for r in rows:
        if not r or not r[1]: continue
        def g(c):
            v = r[col[c]] if c in col else None
            try: return float(v)
            except (TypeError, ValueError): return 0.0
        ext = []
        for c, f in EXTRA:
            v = sum(g(x) for x in c) if isinstance(c, tuple) else g(c)
            ext.append(sig(v * f))
        out[str(r[1]).strip()] = ext
    return out


def key(v): return json.dumps([round(float(x), 4) for x in v[:24]])


def main():
    ext = read(sys.argv[1])
    bls = json.load(open(ROOT / 'bls.json'))
    miss = 0
    by_vec = {}
    for e in bls:
        base = e[1][:24]
        x = ext.get(e[0])
        if x is None: miss += 1; x = [0] * len(EXTRA)
        e[1] = base + x if len(e[1]) < N or not any(e[1][24:]) else e[1]
        by_vec.setdefault(key(base), e[1])
    json.dump(bls, open(ROOT / 'bls.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    print('bls.json', len(bls), 'ohne Treffer', miss)
    name_vec = {e[0]: e[1] for e in bls}

    def extend(v, name=None):
        if len(v) >= N and any(v[24:N]): return v
        v = v[:24]
        if name and name in name_vec and key(name_vec[name]) == key(v): return v[:24] + name_vec[name][24:]
        hit = by_vec.get(key(v))
        if hit: return v[:24] + hit[24:]
        if name and name in name_vec: return v[:24] + name_vec[name][24:]
        # Rundungsunterschiede: nächstliegenden BLS-Eintrag nehmen, wenn praktisch gleich
        best, bd = None, 1e9
        for w in name_vec.values():
            d = sum(abs(float(v[i]) - float(w[i])) / (abs(float(v[i])) + abs(float(w[i])) + 1) for i in range(24))
            if d < bd: best, bd = w, d
        if bd < 0.05: return v[:24] + best[24:]
        return v[:24] + [0] * len(EXTRA)

    def rewrite(fn, var, fix):
        p = ROOT / fn; s = p.read_text()
        m = re.search(r'window\.' + var + r'\s*=\s*', s); i = m.end()
        data, end = json.JSONDecoder().raw_decode(s[i:])
        data = fix(data)
        p.write_text(s[:i] + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + s[i + end:])

    stats = {'n': 0, 'nohit': 0}
    def ext_count(v, name=None):
        r = extend(v, name); stats['n'] += 1
        if not any(r[24:]) and any(v): stats['nohit'] += 1
        return r
    rewrite('nutrition.js', 'NUTRI', lambda d: {k: ext_count(v) for k, v in d.items()})
    rewrite('diaryfoods.js', 'DIARY_FOODS', lambda d: [x[:4] + [ext_count(x[4], x[1])] for x in d])
    def fv(d):
        for g in d:
            g['o'] = [[o[0], ext_count(o[1], o[2])] + o[2:] for o in g['o']]
        return d
    rewrite('variants.js', 'VARIANTS', fv)
    print('Vektoren', stats)


if __name__ == '__main__':
    main()
