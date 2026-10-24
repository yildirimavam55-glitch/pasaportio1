# Header / Hero / Vertrauensleiste — Referenz 287662

Basis: PR #12, `733bf8ddbe692efe71c51d9d12165e97c1242f80`. Separater Branch `feat/header-hero-reference`, Draft-PR #13. Kein Merge und keine Änderung an bestehenden Datenbanken.

## Umfang und Bedienung

- Vorhandener V2-Admin → eSIM-Startseite → SEARCH_HERO. Türkische Haupttexte einschließlich optionaler **Vurgulu ikinci satır** bearbeiten; manuelle Zielübersetzungen wie bisher separat korrigieren. Das neue Feld ist in der zentralen Registrierung enthalten und wird von der bestehenden seitenweiten Übersetzung erfasst. Keine KI aktiviert.
- Vorhandene Schrift-, Farb- und Gerätegrößenkontrollen bleiben zuständig. `HeroHeading` wird von echter Startseite und synthetischer Editorvorschau gemeinsam verwendet. Alte Titel und Übersetzungen werden nicht umgeschrieben; ohne neue Akzentzeile bleiben benutzerdefinierte Titel vollständig erhalten.
- Bilder für Desktop/Tablet/Mobil, Ausschnitt, Zoom, Position, Overlay und lokalisierte Alternativtexte verwenden weiterhin SEARCH_HERO und den bestehenden Medienresolver. Keine neue Medienquelle und keine Rastertexte.
- BENEFIT_ROW ist die einzige Quelle der Vertrauenskarten: Anzahl, Reihenfolge, Sichtbarkeit, Icon, Texte, sichere Links und geräteabhängige Gestaltung. Keine Auswahl nach drei festen IDs. Vorhandene vier Standardkarten bleiben vier Karten. Verlinkte Titel vermeiden doppelte CTA-Beschriftungen; abweichende eigene CTA-Texte bleiben sichtbar.
- `PublicHeaderFrame` übernimmt ausschließlich Präsentation; `PublicShell` behält das unveränderte Brand-Markup und bestehende Cart-, Auth-, Menü-, Sprach-/Währungs- und Optional-Service-Handler. Keine neue Konten- oder Suchlogik.
- Die Komponenten und Datenabfragen ab Popüler Ülkeler wurden nicht verändert. Das gemeinsame RegisteredCards-Verhalten bleibt ohne das ausdrücklich gesetzte `linkedTitle` unverändert.

## Vorschau und Prüfgrenzen

`/builder-preview/?reference=1` öffnet den bestehenden V2-Baukasten mit synthetischen zweifarbigen Hero-Titeln in 14 Sprachen. `/builder-preview/?canvas=1&reference=1` zeigt die vollständige datenbankfreie Darstellung. Diese Fixture schreibt keine gespeicherten Dokumente um. Header nutzt denselben Präsentationsrahmen, aber bewusst keine echten Auth-/Pickeraktionen; Suche und Menü sind in dieser Offline-Designansicht deaktiviert. Echte Funktionen bleiben in PublicShell und EsimHomePage erhalten. Keine Behauptung eines betrieblichen Auth-/Supabase-End-to-End-Tests.

Die bestehende Datenbankfreigabe für atomare Speicherung/Entwurfsschutz ist hiervon getrennt. Synthetische Speicherung oder Layoutprüfung ist kein Nachweis einer behobenen RLS-Konfiguration.

## Soll / Ist

|Referenz|Implementierung / bewusste Abweichung|
|---|---|
|Dunkler Petrol-Header, helle Texte, Mint|Nur Header/Hero lokal eingefärbt; globale Theme- und Folgeabschnitte bleiben erhalten.|
|Zweizeilige weiße/mintfarbene Überschrift|Getrennte editierbare Felder, responsiv; vorhandene individuelle CMS-Texte werden nicht durch Screenshot-Texte ersetzt.|
|Küstenfoto bei Sonnenuntergang|Vorhandene textfreie Tageslicht-Küstenfotos mit Reisender weiterverwendet. Das exakte Sonnenuntergangsoriginal liegt nicht separat vor; keine Gleichheit behauptet.|
|Kompakte weiße Suche|44px Inhaltsfläche plus 3px Rahmenpadding; tatsächlicher Suchslot bleibt bestehen.|
|Drei kompakte Trust-Einträge|Alle sichtbaren gespeicherten Einträge. Standardinhalt hat vier; der Eigentümer kann Reihenfolge/Sichtbarkeit im bestehenden Admin bearbeiten. Keine erfundenen Liefer-, Support- oder Garantieaussagen.|
|P-Logo und wenige Navigationslinks|Bestehendes Logo unverändert; dessen konfigurierte Variante kann von der Referenz abweichen. Vorhandene zentrale Navigation wird erhalten.|
|Bepreiste Länder- und Regionskarten|Diese Abschnitte unverändert. Datenbankfreie Vorschau zeigt deren bestehenden Leerzustand ohne erfundene Preise.|

## Verifikation

Automatisierte CI: eingefrorene Installation, TypeScript, Produktions-/Vercel-SSR-Build, vorhandene Builder-/Sicherheitsregressionen, isolierte PostgreSQL-/PostgREST-Prüfungen und komplette Vitest-Suite. Neue Hero-Tests prüfen alle 14 Locales, manuelle Inhalte/Provenienz, das registrierte Akzentfeld und mehr als drei Trust-Einträge. Browser: 390/768/1440, Bildladung, kompakte Suche, Breite/Höhe der Trust-Leiste, Admin-Akzent/Farbe → gemeinsamer Renderer, 14-Sprachen-Umschaltung inklusive RTL/CJK und horizontales Überlaufen.

Bekannte neun SQL-Fehler werden weiterhin unverändert separat ausgewiesen: Produktkostenrechte, Refund-Guard, has_role-Aufrufer und EXECUTE, platform_settings-Policy und Allowlist, Admin-RPC-EXECUTE sowie fehlende historische E-Mail-/PDF-Migrationsnachweise. Kein Test entfernt, abgeschwächt oder zusätzlich übersprungen.

Screenshots liegen im CI-Artefakt unter `artifacts/builder-preview/hero-reference-390.png`, `hero-reference-768.png`, `hero-reference-1440.png` und den DE/FR/AR/JA/ZH-Ansichten. Der finale PR-Bericht nennt den tatsächlich geprüften Commit und Ergebnisse; diese Datei allein erklärt keinen noch laufenden Test für erfolgreich.


## Korrekturauftrag 24.10.2026 — direkte Hero-Vertrauensbearbeitung

Die bisherige Gestaltung wurde nicht visuell abgenommen. Im bestehenden SEARCH_HERO-Editor und in derselben Offline-Vorschau steht jetzt **Hero → Vertrauensmerkmale / Güven unsurları**. Dieser Bereich bearbeitet ausschließlich die bereits vorhandene BENEFIT_ROW-Sektion in derselben V2-Seite; keine Kopie im Hero-JSON und keine neue Tabelle.

Die Referenz-Fixture blendet den vorhandenen Lieferungseintrag aus und ordnet Support, Installation und Rückgabebedingungen. Alle vier Einträge bleiben gespeichert. Die neutralen Rückgabebedingungen der Fixture liegen in 14 Sprachen vor; eine konkrete Frist wird dort nicht zugesagt. Bestehende Datenbankinhalte werden nicht geändert.

Pro Karte: vorhandener IconPicker, türkische Titel/Beschreibungen mit geschützten manuellen Zielübersetzungen, Reihenfolge, Hinzufügen, unabhängiges Duplizieren, Ausblenden und Entfernen aus dem Entwurf. Die bisherigen Bild-/Linkfelder bleiben erhalten. Unter Kart tasarımı stehen getrennte Schriftfamilien, Schriftgrößen, Gewichte und Zeilenhöhen für Titel/Beschreibung sowie Text-/Icon-/Kreisfarben, Kreisgröße, Icongröße, Hintergrund, Innenabstand und Icon-Text-Abstand bereit. Desktop/Tablet/Mobil haben eigene Überschreibungen. Leere Werte erben; Sichtbarkeit und Beschreibungssichtbarkeit sind gerätebezogen und wandern nicht versehentlich von Mobil auf Desktop.

Vorrang: semantische Theme-Defaults → BENEFIT_ROW-Abschnitt → individuelle Karte → gerätespezifische Kartenwerte. Die zentralen Sanitizer erhalten bestehende erlaubte Benutzerwerte und begrenzen zusätzliche Werte. Schriftfamilien sind eine Allowlist, Farben Hexwerte; keine freien CSS-, HTML- oder Skripteingaben. Komponenten-CSS konsumiert ausschließlich die aufgelösten Variablen. Die gezielten !important-Regeln für Kartentypografie sind erforderlich gegen generische Theme-Überschriftenregeln und enthalten keine festen Größen, die gewählte Adminwerte überschreiben.

Mobile Beschreibungen sind ohne explizite Einstellung ausgeblendet, Desktop/Tablet zeigen sie. Die Hauptüberschrift bleibt ein echtes H1 im normalen Dokumentfluss. Die echte Hero-Suche in EsimHomePage nutzt jetzt Search statt ArrowRight; Picker, Klickhandler und Auswahlweg bleiben unverändert. Länder-/Regions-/Produktbereiche bleiben unverändert.

Browsernachweise: Iconwechsel, Schriftfamilie und drei gemessene Schriftgrößen, Beschreibung ein/aus, gerätebezogene Sichtbarkeit, vierte Karte hinzufügen/ausblenden, Reihenfolge, TR/DE/RTL und manuelle Übersetzungen. Zusätzlich vorhandene Sicherheits- und vollständige Testsuite. Ergebnisse werden nach tatsächlichem Abschluss im PR aktualisiert.

Die zweite im Auftrag erwähnte neue Fehlerbild-Datei war nicht als zugänglicher Anhang vorhanden. Vergleichsgrundlage sind die ursprüngliche Chat-Referenz und die tatsächlich gerenderten CI-Screenshots. Das exakte Sonnenuntergangsfoto fehlt weiterhin als Einzeldatei. Es werden keine neuen Originalbilder oder eingebrannten Texte erfunden. Reale Auth-/Speichertests und offene Datenbank-Sicherheitsfreigaben bleiben getrennt.
