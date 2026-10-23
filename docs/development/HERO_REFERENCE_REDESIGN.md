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
