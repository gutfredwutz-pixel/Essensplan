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
- **KI**: Supabase Edge Function `ai` (`supabase/functions/ai/index.ts`). Secrets in Supabase: `ANTHROPIC_API_KEY` (Claude Haiku, Modell `claude-haiku-5-5`, für Rezepte aus Text/Video/Fotos und fürs Tagebuch) und `ELEVENLABS_API_KEY` (Spracherkennung Scribe v3; die Funktion gibt nur Einmal-Schlüssel an die App). Aufgaben: `ping`, `recipe`, `diary`, `stt_token`. Ohne KI greifen die festen Regeln (`recipeFromText`, `parseDiary`). Änderungen an der Funktion müssen in Supabase neu deployt werden (bisher per Kopieren in den Dashboard-Editor; mit Supabase-CLI oder -Connector kann Claude Code das selbst).
- Kosten: Anthropic-Guthaben in der Claude Console (getrennt vom Claude-Abo), ElevenLabs Free-Plan.

## Gelernt auf dem iPhone (wichtig)

- iOS 26 färbt den Streifen hinter der Statusleiste mit der Hintergrundfarbe der Seite oder eines **fest positionierten Elements oben**. Ein durchsichtiges `position:fixed`-Element oben ergibt einen weißen Balken. Beim Öffnen von Sheets wird die Seitenfarbe mit abgedunkelt (`barColor()`).
- `backdrop-filter` auf Dingen, die sich bewegen oder über bewegtem Inhalt liegen, kostet pro Bild viel und ruckelt. Sparsam einsetzen.
- Seitenwechsel per Wischen: Transforms auf dem Inhalt wurden während `touchmove` auf iOS nicht zuverlässig gezeichnet, daher folgt ein Schnappschuss-Klon (`stageClone`) dem Finger; die neue Seite kommt aus einem Zwischenspeicher (`pageCache`) und wird erst nach der Animation neu aufgebaut.
- Elemente mit `position:fixed` innerhalb eines Containers mit Transform springen. Schwebende Bedienelemente (z. B. Vorschlags-Pille) außerhalb von `#stage` halten.
- Neu aufgebaute Umschalter-Marker sofort vor dem ersten Zeichnen setzen, sonst „ploppen“ sie auf.
- Beim offenen Sheet die Seite dahinter festhalten (`lockBody`), sonst lässt sie sich mitwischen.

## Arbeitsweise

- Nach jeder Änderung selbst Screenshots machen und ansehen: `python3 dev/screens.py` (nachgebautes Supabase in `dev/sbmock.js`, inkl. gespielter KI-Antworten). Erst dann committen.
- Commit + Push auf `main` nur, wenn es funktioniert. Danach Jakob in wenigen Sätzen sagen, was sich geändert hat und was nur im Browser, nicht auf dem iPhone getestet ist.
- Wenn Jakob Videos oder Screenshots schickt: Bild für Bild ansehen und alle Punkte der Reihe nach abarbeiten, nichts auslassen. Bei unklaren Punkten nachfragen statt raten.
- Kein Fachjargon gegenüber Jakob. Wenn er etwas einrichten muss: nummerierte Schritte mit genauen Namen und Links.
