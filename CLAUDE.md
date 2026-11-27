# Essensplan → persönliche Allround-App

Gemeinsame App von Jakob und seiner Freundin Frieda. Sprache überall Deutsch (UI, Antworten, Commit-Nachrichten). Jakob nutzt die App fast nur auf dem iPhone als Home-Bildschirm-App (PWA), arbeitet am iPad. Er ist kein Entwickler: Erklärungen kurz, ohne Fachjargon, Schritte nummeriert.

## Wohin es geht

- Die App wird zur **Allround-App**. Essen (Einkaufsliste, Essenswoche, Rezepte, Nährstoffe) ist künftig nur noch ein Bereich. Dazu kommen **Schlaf**, **tägliche To-dos** und **Nachrichten**, die für Jakob interessant sind.
- Geplanter Aufbau: Startbildschirm mit Übersicht, dahinter je ein Modul. Vorher den Code in Module aufteilen (siehe „Aufbau“): `app.js` hat über 2000 Zeilen.
- **Das Design wird komplett neu gemacht.** Die aktuelle Optik (Glas-Look, hellblauer Verlauf, farbige Wochentage) ist ausdrücklich **kein Vorbild**. Nur die Geschmacksregeln unten gelten weiter. Vor dem Neubau mit Jakob die Richtung klären, am besten mit 2 bis 3 Entwürfen als Bilder.
- Schlaf: Eine Web-App kommt nicht an Apple-Health-Daten. Möglich: selbst eintragen oder per iOS-Kurzbefehl täglich an die App schicken. Echte HealthKit-Anbindung bräuchte eine native iOS-App (Mac + Xcode).
- Nachrichten: Quellen (RSS) über die Supabase-Funktion holen, von der KI kurz zusammenfassen lassen.

## Geschmacksregeln (gelten für jedes Design)

- **Keine Kästen und keine Trennlinien.** Inhalte stehen als reine Textzeilen auf Schwarz, mit Abstand statt Rahmen (Look wie iOS-Notizen, aber ohne gruppierte Kästen). Abgerundete Karten mit Inhalt drauf wirken für Jakob nach KI-Look; sie wurden zweimal abgelehnt. Hervorgehobenes und Auswahl in Weiß, nicht in Farbe (kein Gelb, kein Orange); Auswahl-Knöpfe als Text. Haken: weißer Kreis, schwarzer Haken, kein Orange.

- Kein typischer KI-Look: keine Mittelpunkte (·) als Trenner, lieber Slash oder Bindestrich; keine Rauten (#); keine überflüssigen Icons, Untertitel oder Texte, die nur wiederholen; keine ALL-CAPS-Labels.
- **Nichts bewegt sich von selbst.** Keine Dauer-Animationen, keine animierten Icons, kein Hochzählen. Bewegung nur als Antwort auf eine Aktion (Antippen, Wischen, Seitenwechsel, kurz Ring/Balken füllen beim Tageswechsel).
- **Symmetrie und Einheitlichkeit selbst prüfen**, auf allen Seiten, hell und dunkel, bevor etwas an Jakob geht. Gleiche Abstände unter Überschriften, gleiche Ränder, gleiche Elemente gleich gestaltet. Jakob hat „gedrungen“ sehr oft bemängelt: lieber großzügige Abstände.
- Aktueller Look (Nov. 2026): schwarz, flach, ohne Glanz und Schatten. Feedback beim Tippen = kurz minimal kleiner und heller, kein „Eindrücken“.
- Farbe mögen er und Frieda, aber nicht wahllos bunt. Texte müssen auf jedem Hintergrund gut lesbar sein.
- Sheets wie bei Apple: von unten, nach unten wegwischen, kein X, Hintergrund abgedunkelt und unscharf. Zurück in Unteransichten per Wischen nach rechts oder nach unten, nicht per Knopf ganz unten.
- Mikrofon als bekanntes Icon direkt im Textfeld, nicht als Text „Einsprechen“.
- Zahlen mit Dezimalkomma, Eingaben speichern sich sofort (kein Speichern-Knopf nötig).

## Stand des Umbaus (Ende Nov. 2026)

- Fünf Reiter unten mit Symbolen: Start, Statistik, Essen (Mitte), To-dos, News. Interne Reiter-IDs: `start`, `stat`, `list`/`cal`/`rec` (Essen, Umschalter Woche/Rezepte, Einkaufsliste über Wagen-Symbol oben rechts), `todo`, `news`; `nutri` = alte Tagesansicht der Nährstoffe („Einzelne Tage“).
- Neue Seiten in `start.js` (`PAGES.start/stat/todo/news`). Neue Sammlungen: `todos` (mit `repeat`, `doneDays`), `goals` (`days`), `sleep` (`bed`, `wake`), `training` (`kind`, `min`), jeweils mit `who`.
- Kopf überall gleich: Datum (Statistik: Zeitraum) → große Überschrift → ggf. Umschalter. Abstände stehen im CSS-Block „Einheitliche Abstände oben“ am Ende von `index.html`.
- Start: Schlaf als Zeitstrahl (Jakob mag den, nicht entfernen), Eintragen (Training, Gegessen), Heute (To-dos + Ziele), Vorschlag (was noch fehlt, ohne KI über `suggestFoods`), Essen.
- Kopf (Datum, Überschrift, Umschalter) steht beim Scrollen fest (`position:sticky`, CSS-Block „Fester Kopf“ am Ende von `index.html`); `stageClone` setzt ihn in der Wisch-Kopie an dieselbe Stelle.
- Nährwerte einzelner Tage: eigenes Fenster `openDayNut(tageZurück, zurück)` in `start.js` mit Pfeilen; Unterseiten führen per Wischen dorthin zurück (`ctx.home`). Erreichbar über Statistik > Nährstoffe > „Einzelne Tage“, Antippen der Kalorien, Essen > Woche > „Nährwerte“ und das Eintragen-Fenster. Den Umschalter „Tag“ in der Statistik gibt es nicht mehr (nur Woche/Monat/Jahr).
- Im Nährwerte-Fenster wechselt Wischen nach rechts/links den Tag (`.dnswipe`, eigener Touch-Handler; der Sheet-Handler ignoriert dort waagrechtes Wischen, zurück geht per Wischen nach unten).
- Statistik-Reihenfolge (Jakob, Nov. 2026): Schlaf ganz oben, dann Kalorien/Nährstoffe, Training, Ziele. Antippen öffnet Infos statt Eintragen: `openSleepInfo` (Schnitt, Nächte ≥ 7 h, Ein-/Aufwachzeit, Gleichmäßigkeit, Liste der Nächte), `openTrainInfo` (WHO: 150 min Ausdauer, 2 Krafttage pro Woche), `openKcalInfo` (Grundumsatz × Aktivität ± Ziel, einzelne Tage → `openDayNut`). Jakob wünscht sich allgemein: fast überall, wo Fragen entstehen, antippen für Infos.
- Statistik: Schlaf-Balken ab 0 mit 8-h-Linie, Training-Balken, Ziele als Tagesfelder, Kalorien groß, Nährstoffe als Menü mit Unterseiten (Sheets).
- Einstellungen: Menü mit Unterseiten (`setSub`), zurück per Wischen.
- Logo (Entwurf 3, mit Jakob ausgesucht Nov. 2026): zwei weiße Striche, rosa Punkt (`#ff7aa8`) rechts oberhalb, auf Schwarz. Quelle `icons/logo.svg`, PNGs daraus gerendert. Jakob mochte auch die flächige weiße Sonne mit Horizont-Schlitzen.
- Offen: Nährstoff-Darstellung weiter verbessern (Jakob hat noch Punkte), Training in den Kalorienbedarf einrechnen, Uni-Bereich, CSS aufräumen (viele Überschreib-Blöcke), `app.js` in Module teilen.
- Nächste große Punkte (mit Jakob besprochen, Ende Nov. 2026):
  1. **News**: Bereiche KI, Wirtschaft (inkl. auffällige Kursbewegungen/boomende Firmen), Politik Deutschland und Welt, ganz unten Weiterbildung/Arbeitsmarkt. Seriöse Quellen (Tagesschau u. a.) per RSS über die Supabase-Funktion, kurze KI-Zusammenfassungen zum Lesen in der Bahn, wenn möglich mit Bild aus dem Artikel.
     Quellen-Wunsch: Handelsblatt, FAZ, Heise, Tagesschau „und die besten“ (seriös). Wichtig: Artikel wirklich aufbereiten, lesbar für Nicht-Fachleute: Fachbegriffe kurz erklären und Zahlen einordnen (z. B. „DAX +300 Punkte“ = wie viel Prozent, ist das viel, warum). Achtung Bezahlschranken (Handelsblatt/FAZ): per RSS oft nur Teaser; offen damit umgehen und frei lesbare Quellen ergänzen.
  2. ~~Vorrat~~ und 3. ~~Start Essen~~: erledigt (Ende Nov. 2026), siehe unten „Vorrat und Vorschläge“.
  4. ~~Einkaufsliste neu~~ erledigt (Entwurf A): Überschrift „Einkaufsliste“, Eingabe ohne Plus mit Mikrofon, Bereiche als graue Namen, darunter „Fehlt deiner Woche“ (Plus rechts fügt hinzu, Name antippen zeigt Alternativen, Nährstoff antippen öffnet Karte `openNutInfo`), dann „Im Wagen“. Kein Personen-Punkt mehr. CSS-Block „Einkaufsliste (neu“ am Ende von `index.html`.
  5. Ladebildschirm beim Öffnen klären (Screenshot von Jakob abwarten; evtl. alter iOS-Startbildschirm, nach Neu-Hinzufügen weg).
- **Mitteilungen** (Web Push): Einstellungen > Mitteilungen, je Gerät und Person (Sammlung `push`, Doc-ID in `ep_push`). To-dos haben `remind` (Minuten vorher, `'off'`, Standard 15). Die Datenbank ruft jede Minute `push_tick()` auf (pg_cron, `supabase-push.sql`), die Funktion `push` (`supabase/functions/push/index.ts`, Verify JWT aus, keine Secrets) entscheidet und verschickt: Erinnerungen und höchstens 2 Anstupser am Tag (ab ca. 12 und 17:30 Uhr, nicht wenn in der Stunde ein To-do mit Uhrzeit ansteht). Signier-Schlüssel erzeugt die App beim ersten Einschalten, er liegt in `push_config` (nur Datenbank). Rückmeldung per `push_mark` mit Einmal-Token gegen doppelte Meldungen.
- `dev/screens.py` braucht Python-Playwright (`pip install playwright`), nutzt den vorinstallierten Chromium unter `/opt/pw-browsers/chromium`.

## Vorrat und Vorschläge (`vorrat.js`)

- Sammlung `pantry` (ganzer Haushalt): `name`, `qty`, `category`, `added`, `by`. Essen-Umschalter: Woche / Rezepte / Vorrat (Reiter-ID `pan`). Abgehakte Sachen der Einkaufsliste per „In den Vorrat“ übernehmen.
- Start: „Bald essen“ (Vorrat, der Lücken der letzten 7 Tage füllt, dann frische Sachen ab 3 Tagen, eigenes Rezept mit den meisten Zutaten da, „Gericht-Ideen“) und „Einkaufen“ (Tippen setzt auf die Liste). Auswahl schrittweise (`greedy`), damit nicht drei Lebensmittel dieselbe Lücke füllen.
- Rechnung ohne KI auf dem Gerät. Nur „Gericht-Ideen“ fragt die KI (Aufgabe `meal`), Ergebnis pro Tag und Vorrat in `localStorage` gemerkt. Ohne KI: passende eigene Rezepte.

- Gewohnheiten (`habits()`): was in 30 Tagen oft gegessen, gekocht, gekauft wurde. Vertrautes wird bei „Einkaufen“ leicht bevorzugt und geht als Text an die KI (Gericht-Ideen); die KI hat kein Gedächtnis, sie weiß nur, was die App mitschickt.

## Gegessen eintragen (`openDiary` in `tagebuch.js`, Nov. 2026)

- Kein Speichern-Knopf: jede Änderung wird nach 0,5 s gespeichert, beim Schließen/Tag-Wechsel wird Getipptes noch ausgewertet und gespeichert. Unten steht „Gespeichert“ bzw. „Nicht gespeichert, keine Verbindung“.
- Großes buntes Mikrofon (Jakob mag es, nicht entfernen), beim Zuhören wachsen zwei Ringe mit der Lautstärke der Stimme (`--lv`, Analyser), darunter „Ich höre zu. Fertig? Nochmal tippen.“; danach „Verstanden: …“ mit dem erkannten Satz. Neue Einträge kommen oben in die Liste.
- Mischungen („Kokos-Rosinen-Mix“, „Whey Shake“) werden in Einzelteile zerlegt (`findFoods`), Bindestriche zählen als Leerzeichen. Die KI (`diary`) ist ebenfalls angewiesen, Gemischtes aufzuteilen.
- Eigene Ergänzungen außerhalb des BLS stehen in `diaryfoods.js` (u. a. Whey-Protein mit Durchschnittswerten) und erscheinen auch in der Lebensmittel-Suche.
- Unten im Eintragen-Fenster „Nährstoffe an diesem Tag“ → Statistik „Tag“ für dieses Datum (`statDay` = Tage zurück, Pfeile `dayNav`). Im Tag-Modus stehen Kalorien/Nährstoffe zuerst.
- Kalorien-/Nährstoff-Schnitt zählt nur Tage mit Einträgen (`dayIntake().logged` = Essen oder Plan-Anteil eingetragen); nur geplante Tage zählen nicht mehr.
- Essen > Woche hat oben „Heute gegessen“. Umschalter Woche/Rezepte/Vorrat tauscht die Seite ohne Wischeffekt (`switchNow`); Wischen mit dem Finger bleibt.

## Nährwerte erweitert, Meine Lebensmittel (Ende Nov. 2026)

- Nährwert-Listen haben jetzt 49 Werte (`NV` in `app.js`). 0–23 wie bisher, dazu 24 einfach unges., 25 mehrfach unges., 26 Omega-6, 27 ALA, 28 EPA, 29 DHA, 30 DPA, 31 Stärke, 32 Vit. K, 33 Niacin-Äquiv., 34 Pantothensäure, 35 Biotin, 36 Phosphor, 37 Kupfer (mg), 38 Mangan (mg), 39 Laktose, 40–48 unentbehrliche Aminosäuren (g). Erzeugt mit `dev/bls_build.py` aus der BLS-4.0-Datei (blsdb.de > BLS-Daten > Download, CC BY 4.0, Quelle in der App nennen). Selen gibt es im BLS nicht.
- Alte gespeicherte Listen (24 Werte) ergänzt `fullV(v, src)` beim Rechnen (über Werte-Schlüssel oder BLS-Namen; Statistik lädt dafür `bls.json`).
- Bedarf neu: Vit. K, Niacin, Kupfer nach DGE (Geschlecht/Alter), Pantothensäure 5 mg, Biotin 40 µg, Phosphor 550 mg und Mangan 3 mg (EFSA).
- Statistik > Nährstoffe: jeder Nährstoff ist antippbar (Sheet, zurück per Wischen). „Einzelne Tage“ (alte Seite `nutri`, Ringe, Kästen, Knopf „Übersicht“) ist nicht mehr verlinkt, dafür Statistik „Tag“ mit Pfeilen. Farben überall nur grün/gelb/rot (`lvl`: ≥ 80 % / ≥ 50 % / darunter; Höchstwerte ≤ 100 / ≤ 125 / darüber) mit Legende in den Listen.
- Reihenfolge Nährstoff-Menü: Fehlt am meisten, Makros, Lieber nicht zu viel, Ballaststoffe (eigene Zeile, Ziel aus Profil `fibG`, Jakob 25 g), Vitamine, Mineralstoffe, Supplemente. Statistik zeigt Schlaf zuerst, danach Kalorien/Nährstoffe.
- Makro-Farbe hängt nur an Eiweiß (≥ 90 % grün, ≥ 70 % gelb) und Fett-Qualität (`fatQuality`: ungesättigte ≥ 80 % von zwei Dritteln des Fettbedarfs UND gesättigte ≤ 10 % der Kalorien; schlechterer Wert zählt). Kohlenhydrate grau, nur zur Info (Jakob: braucht man nicht zwingend). Jakobs Eiweißziel 150 g (`protG`).
- Ein Tag zählt als eingetragen nur mit Essen (Gramm > 0) oder Plan-Anteil > 0. Plan-Einträge lassen sich im Eintragen-Fenster löschen (Mülleimer neben dem Gericht).
- Diktat live: `SpeechRecognition` des Geräts (de-DE, Zwischenergebnisse im Textfeld, startet nach Pausen neu bis „Fertig“). Fehlt sie oder wird sie verweigert, Rückfall auf Aufnahme + ElevenLabs/Whisper (`ep_livesr` = off merkt sich das).
- Gruppenfarbe (`groupSt`): gelb zählt 1, rot 2, geteilt durch Anzahl; < 0,2 grün, < 0,75 gelb, < 1,25 orange, sonst rot (grün grün rot = gelb, grün gelb rot = orange). Bei „Lieber nicht zu viel“ steht, was zu viel ist.
- Eintragen-Fenster hat feste Höhe (Klasse `fixh`), damit beim Tageswechsel nichts springt; `subSheet`/`pickProduct` stellen die Sheet-Klassen wieder her.
- Essen > Woche: „Heute gegessen“ und „Nährwerte“ (→ Statistik „Tag“).
- Fett, Kohlenhydrate, Eiweiß und Omega-3 haben eigene Details (`openNutDetail` in `start.js`): Fettarten mit % der Kalorien, Omega-6 zu 3 (Ziel ≤ 5:1), ALA vs. EPA+DHA (250 mg, EFSA), KH-Qualität (≥ 1 g Ballaststoff je 10 g KH = hochwertig, Milchzucker extra), Eiweißqualität als Aminosäure-Score (WHO 2007).
- `produkte.js`: Sammlung `foods` (Haushalt). Strichcode mit ZXing (`lib/zxing.min.js`, lädt erst bei Bedarf) → Open Food Facts; Foto der Nährwerttabelle → KI-Aufgabe `label`. Produkte werden beim Diktieren zuerst erkannt (`findMine`, auch „So sage ich dazu“ und Teilnamen ab 2 Wörtern) und der KI als Kontext mitgegeben. Einstellungen > Meine Lebensmittel. Knöpfe im Eintragen-Fenster und in der Nährwert-Suche.
- Eintragen-Fenster: „Suchen“ (`searchFlow`: eigene Produkte, Diary-Lebensmittel, NUTRI, ganzer BLS, auf Wunsch Open Food Facts; Treffer → Produktfenster mit Gramm → „Eintragen“, danach zurück ins Eintragen-Fenster), „Strichcode“, „Nährwert-Foto“. „Selbst anlegen“ = Produktfenster mit eingebbaren Werten pro 100 g (`opts.edit`).
- Diktat ohne Live-Erkennung des Geräts: alle 2,5 s Zwischenstand über `cloudTranscribe` (ElevenLabs) im Textfeld; liefert die Geräte-Erkennung nichts, wird sie abgeschaltet (`ep_livesr`).
- Netz der Cloud-Umgebung: blsdb.de, USDA, Open Food Facts, heise, MRI sind freigegeben.

## News (`news.js`, `supabase/functions/news`, `supabase-news.sql`, Ende Nov. 2026)

- Die Datenbank ruft stündlich `news_tick()` auf (pg_cron `news-tick`, Minute 7); gebaut wird um 6, 12 und 17 Uhr (Berlin) oder wenn der Stand älter als 8 Std. ist, höchstens alle 20 Min. Öffnet jemand die News und der Stand ist älter als 3 Std., stößt `news_get` neu an.
- Funktion `news` (Verify JWT an, Secret `ANTHROPIC_API_KEY`): RSS von Tagesschau (API mit ganzem Text), Spiegel, Zeit, Deutschlandfunk, heise, t3n, The Decoder, Handelsblatt und FAZ (Bezahlschranke, nur Anriss, höchstens eine je Bereich). Haiku wählt Bereich für Bereich aus (KI, Wirtschaft, Deutschland, Welt, Weiterbildung und Arbeitsmarkt), danach Zusammenfassung mit Einordnung und Begriffen. Börsenwerte (DAX, S&P 500, Euro in Dollar, Bitcoin) von Yahoo. Ergebnis über `news_save` mit Einmal-Token in `news_state` (nur Datenbank), Fehler stehen in `news_state.error`.
- Haiku verschachtelt Listen manchmal (`picks:[{picks:[...]}]`), `flat()` fängt das ab.
- App: Seite `PAGES.news`, Artikel als Sheet, Stand im Browser unter `ep_news`. Testdaten in `dev/news.json`.
- App startet erst nach `DOMContentLoaded` (vorher blitzte beim Öffnen kurz die Rezeptseite auf, weil `start.js` noch nicht geladen war).

## Supplemente (`supplemente.js`)

- Feste Regeln, keine KI. Prüft eingetragene Supplemente (Summe aller) gegen BfR-Höchstmengen für Supplemente (2024, belegt nur: D 20 µg, Jod 100 µg, Eisen 6 mg, Magnesium 250 mg, Zink 6,5 mg, Folsäure 200 µg; andere ohne Warnung) und meldet „eher unnötig“, wenn das Essen schon 100 % deckt.
- Empfehlungen: Vitamin D 20 µg von Oktober bis März (DGE) bzw. bei wenig Sonne; Jod, B12 (vegan/vegetarisch), Omega-3, Eisen erst übers Essen, Eisen nur nach Bluttest. Prüfungen außer D erst ab 5 eingetragenen Tagen in 14 Tagen.
- Rückfragen im Profil: `jodsalz`, `salz` (wenig/normal/viel = 1/2,5/4 g), `sonne`. Jodsalz zählt in `dayIntake` mit (20 µg Jod pro g). Gefragt wird auf Start (eine Zeile) und im Sheet „Supplemente“ (Statistik > Nährstoffe).

## Aufbau (Stand jetzt)

- Reines HTML/CSS/JS ohne Build-Schritt, gehostet über **GitHub Pages** (Branch `main`, Push = live nach ca. 1 Minute). Kein Service-Worker-Cache für App-Dateien; nach Änderungen App einmal ganz schließen.
- `index.html`: Markup + gesamtes CSS (viele nachträgliche „Runde N“-Blöcke am Ende, die frühere Regeln überschreiben; beim Neubau aufräumen).
- `app.js`: fast alles (Daten, Tabs, Wischen, Liste, Woche, Rezepte, Nährstoffe, Einstellungen, KI, Spracherkennung).
- `tagebuch.js`: persönlicher Bedarf (`needsOf`), Tagebuch, Tag/Woche-Ansicht der Nährstoffe.
- `foods.js`, `diaryfoods.js`, `variants.js`, `nutrition.js`, `bls.json`: Lebensmittel und Nährwerte (BLS 4.0, Max Rubner-Institut). Bedarf nach DGE, Grundumsatz Mifflin-St-Jeor bzw. Katch-McArdle.
- Nährstoff-Rechnung läuft komplett auf dem Gerät (Gramm × Wert pro 100 g, Vergleich mit Bedarf), kostet nichts.
- Whisper (`models/`, `ort/`) als Spracherkennung auf dem Gerät, wenn die Cloud nicht erreichbar ist. Tesseract für Texterkennung als Rückfall.

## Daten und Dienste

- **Supabase** (Datenbank + anonyme Anmeldung). Zugriff über einen Adapter im Firestore-Stil: `db.collection('x').doc('y').set/update/delete/onSnapshot`. Sammlungen u. a. `items`, `recipes`, `plan`, `profiles`, `diary`, `settings` (Doc `household`). Tabellen-Setup: `supabase-setup.sql`.
- Projekt-URL und öffentlicher Schlüssel werden in der App eingegeben oder per Einladungslink übergeben, **nie committen**. `config.js` bleibt leer.
- **Niemals** den Supabase-`service_role`-Schlüssel oder das DB-Passwort verwenden oder anfordern. API-Schlüssel nie in die App, ins Repo oder in einen Chat.
- **KI**: Supabase Edge Function `ai` (`supabase/functions/ai/index.ts`). Secrets in Supabase: `ANTHROPIC_API_KEY` (Claude Haiku, Modell `claude-haiku-5-5`, für Rezepte aus Text/Video/Fotos und fürs Tagebuch) und `ELEVENLABS_API_KEY` (Spracherkennung Scribe v3; die Funktion gibt nur Einmal-Schlüssel an die App). Aufgaben: `ping`, `recipe`, `diary`, `label`, `meal`, `stt_token`. Ohne KI greifen die festen Regeln (`recipeFromText`, `parseDiary`). Änderungen an der Funktion müssen in Supabase neu deployt werden (bisher per Kopieren in den Dashboard-Editor; mit Supabase-CLI oder -Connector kann Claude Code das selbst).
- Kosten: Anthropic-Guthaben in der Claude Console (getrennt vom Claude-Abo), ElevenLabs Free-Plan.

## Gelernt auf dem iPhone (wichtig)

- iOS 26 färbt den Streifen hinter der Statusleiste mit der Hintergrundfarbe der Seite oder eines **fest positionierten Elements oben**. Ein durchsichtiges `position:fixed`-Element oben ergibt einen weißen Balken. Beim Öffnen von Sheets wird die Seitenfarbe mit abgedunkelt (`barColor()`).
- `backdrop-filter` auf Dingen, die sich bewegen oder über bewegtem Inhalt liegen, kostet pro Bild viel und ruckelt. Sparsam einsetzen.
- Seitenwechsel per Wischen: Transforms auf dem Inhalt wurden während `touchmove` auf iOS nicht zuverlässig gezeichnet, daher folgt ein Schnappschuss-Klon (`stageClone`) dem Finger; die neue Seite kommt aus einem Zwischenspeicher (`pageCache`) und wird erst nach der Animation neu aufgebaut.
- Elemente mit `position:fixed` innerhalb eines Containers mit Transform springen. Schwebende Bedienelemente (z. B. Vorschlags-Pille) außerhalb von `#stage` halten.
- `stageClone` übernimmt Größen/Abstände der Elemente mit `id` als Inline-Stil vom Original, weil alte CSS-Regeln die Kopie sonst anders zeichnen (Überschrift kleiner, Inhalt 30 px höher, Rahmen um Knöpfe) und beim Loslassen alles springt.
- Neu aufgebaute Umschalter-Marker sofort vor dem ersten Zeichnen setzen, sonst „ploppen“ sie auf.
- Beim offenen Sheet die Seite dahinter festhalten (`lockBody`), sonst lässt sie sich mitwischen.
- `#stage` steckt in `#clipw` (overflow clip/hidden). Grund: Beim Seitenwechsel wird `#stage` um eine Bildschirmbreite verschoben; ohne Rahmen merkt sich iOS die doppelte Breite, die Seite wird seitlich wischbar und rechts abgeschnitten (`overflow-x:clip` auf html/body hilft auf iOS nicht). Test: in Chromium `html,body{overflow:visible}` setzen und `scrollWidth` nach Tab-Wechsel prüfen.

## Arbeitsweise

- Nach jeder Änderung selbst Screenshots machen und ansehen: `python3 dev/screens.py` (nachgebautes Supabase in `dev/sbmock.js`, inkl. gespielter KI-Antworten). Erst dann committen.
- Commit + Push auf `main` nur, wenn es funktioniert. Danach Jakob in wenigen Sätzen sagen, was sich geändert hat und was nur im Browser, nicht auf dem iPhone getestet ist.
- Wenn Jakob Videos oder Screenshots schickt: Bild für Bild ansehen und alle Punkte der Reihe nach abarbeiten, nichts auslassen. Bei unklaren Punkten nachfragen statt raten.
- Kein Fachjargon gegenüber Jakob. Wenn er etwas einrichten muss: nummerierte Schritte mit genauen Namen und Links.
