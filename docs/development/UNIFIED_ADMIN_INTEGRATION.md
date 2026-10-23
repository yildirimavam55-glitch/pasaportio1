# Integrierter Admin — Issue 10

Ein Integrationsbranch von PR9. Keine bestehenden Datenbanken/Storage/Produktion geändert. SQL-Dateien unter pending enden absichtlich in ROLLBACK. Der CI-Runner ersetzt ausschließlich für die wegwerfbare Datenbank dieses Ende durch COMMIT.

## Vorhanden → verbunden
| Bereich | Vorhanden | Integration |
|---|---|---|
| Fachmodule | Produkte, Bestellungen, Kunden, Provider, Finanzen, Support, SEO, Legal, CMS | bestehende Routen und Berechtigungen erhalten, Baukasten-Navigation ergänzt |
| V2-Seiten | Registry, Abschnitte, Hero/NOTICE, MediaPicker, Icons, Übersetzungsprovenienz | gemeinsame redaktionelle Item-/Medienkontrollen, zusätzliche Design-Renderer, Grid/FAQ |
| Theme | validierte Tokens, Draft/Publish/Historie | gemeinsame Controls, explizite Dark-Anwendung, responsive Größen; lokale Overrides haben Vorrang |
| Menü/Footer | Global-CMS und Footer | zentrale Desktop-/Drawer-Links, sichere interne Ziele, geschützte Legal-Ziele, Gruppen und 14-Locale-Provenienz |
| Kundenkonto | geschützte Pflichtmodule und Kontentrennung | ausschließlich optionale Hilfekarte davor/danach; keine veränderbaren Rollen, QR, Bestellungen oder Kundendaten |
| CMS/Medien | Versionshistorie und Storage | PR3-Löschsperre/Referenzprüfung, Restore nur Draft, vorbereitete atomare RPCs und sichere öffentliche Projektion |

## Eine Vorschau bedienen
Branch-Vorschau im Draft-PR → `/builder-preview/`. Kein Admin-Login-Bypass: dies ist ein synthetischer Adapter für dieselben neuen Eingabekomponenten und Renderer; echte Adminseiten behalten AdminGate und serverseitige Rollenprüfung.
- Seiten: TR-Quelle, separate Vorschau in 14 Sprachen, gesamte Seite übersetzen, Abschnitte hinzufügen/verschieben/duplizieren/ausblenden/entfernen (Hero geschützt), Items/Icon/CTA/Alt und je Verwendung 3 Bilder/Crops/Zoom/Overlay.
- Design: vorhandene Theme-Tokens, Schriftfamilie und responsive Größen. Dark-Anwendung ist bewusst opt-in, um bestehende Defaultseiten nicht umzufärben.
- Medien: vorhandene Repo-Fotos in der synthetischen Vorschau; echter Admin nutzt weiter MediaPicker/Upload. Keine echten Storage-Uploads getestet/ausgeführt.
- Menü/Footer: gemeinsame sichere Links und TR-Labels; manuelle Zielsprachen bleiben erhalten, Übersetzung benutzt denselben Seitenplan. Beispieltexte sind als DEMO markiert, unbekannte Quellen bleiben offen.
- Kundenkonto: nur redaktionelle Hilfekarte; Vorschau zeigt keine synthetischen Bestellungen/QR/Identitäten. Authentifizierte Pflichtmodule bleiben unverändert.
- Versionen: explizites synthetisches Speichern/Laden in Browser-localStorage, Versions-Restore nur Entwurf, Testfreigabe nur innerhalb der Vorschau. Reload → Versionen → gespeicherten Entwurf laden. Reset löscht den synthetischen Speicher. Das ist kein Nachweis einer bestehenden Supabase-Persistenz.
- Fachmodule: Links öffnen den vorhandenen geschützten Admin; keine nachgebauten Finanz-/Bestellfunktionen.

## Datenbank-Cutover — separate Freigabe zwingend
Die bestätigte Leckage in bestehenden Projekten ist NICHT durch Rendererfilter behoben.
1. Wartungsfenster/Editor-Freeze, exakte Projektidentität/Schema-Fingerprints/Backup neu prüfen. Alle öffentlichen cms_documents-Leser inventarisieren, auch Legal/Legacy-CMS außerhalb dieses Branches.
2. PR3-Projektionsvorschlag, PR3-Revisions-/Atomaritätsvorschlag und unified_builder_storage.sql zusammen reviewen. Isolierte Tests verwenden eine minimale synthetische kompatible Struktur, kein vollständiges Managed-Supabase-Abbild.
3. Öffentliche Projektion backfillen, breite Tabellen- UND Spaltenrechte auf data/draft/history entfernen. RLS aktiv lassen. Theme-Verlauf/Draft/Published in bestehenden History-Dokument-Key backfillen. Kein Produkt-/Kunden-/Providerimport.
4. Authentifizierte Admin-RPCs builder_read/builder_write aktivieren: private SECURITY DEFINER mit leerem search_path + explizitem user_roles-Check, öffentliche SECURITY INVOKER-Wrapper. Keine user_metadata-Autorität.
5. Nur nach gesonderter Freigabe Backendflags CMS_PUBLIC_PROJECTION_ENABLED und CMS_ATOMIC_V1_ENABLED gemeinsam setzen. Echte V2-/Theme-/Navigation-Editoren liefern erwartete Revisionen; Konflikte brechen ab, kein Service-Rollen-Fallback. Alte Legacy-CMS-/Legal-Schreibpfade bleiben außerhalb der neuen Transaktion und müssen bei vollständigem Rollout gesondert inventarisiert werden.
6. Echte Supabase Auth/PostgREST/Storage/Provider-/Payment-Integration gesondert abnehmen. SQL und Flags hier NICHT auf bestehenden Projekten angewandt.

Rollback: Flags/Clientrelease nicht blind zurückdrehen! Öffentliche Projektion und restriktive Grants erhalten, Editoren stoppen, kompatiblen Read-Release verwenden. Kein Regrant von Entwürfen, kein DROP SCHEMA CASCADE, keine Löschung von Historie/Medien. Transaktionsfehler in isolierten Tests müssen Dokument/Version/Audit vollständig zurückrollen. Historische Versionen werden ausschließlich zu Entwürfen.

## Verbleibende externe Grenzen
- Lovable-Build-Preset wird bereits nicht benutzt; ungenutzte Lovable-Pakete bleiben in der unveränderten Lockdatei. Bestehende Review-/Trip-Planner-KI verwendet weiterhin Legacy-Lovable und ist kein Teil der neuen CMS-Übersetzung. Nicht aufgerufen/aktiviert, benötigt separate Anbieterumstellung.
- Historische .asset.json-Zeiger sind keine Originalbilder. Nicht portable /__l5e/-Pfade werden nicht angefordert; Originalzeiger/Versionsreferenzen bleiben erhalten. Nicht verfügbare Originale müssen vom Eigentümer als echte Medien nachgeliefert/zugeordnet werden; keine erfundenen Ersatzbilder.
- Keine echten Upload-/Admin-Login-/Managed-Auth-/Provider-/Payment-/QR-Abnahmen. Browser nutzt echte geteilte Eingabekomponenten, aber synthetische Persistenz. PostgreSQL/PostgREST prüfen getrennt reale Transaktionen/Rollen/HTTP auf künstlichen Daten.
- Übersetzungsadapter bleibt deaktiviert ohne explizite Backend-Konfiguration und Kostenfreigabe. Inhalte vor Veröffentlichung redaktionell prüfen. 14 Sprachen heute, 40 kein implementierter Umfang.

## Finale Prüfung
Ein gemeinsamer CI-Lauf: frozen install, TypeScript, Vercel-SSR-Build, gezielte Domain/Server/Design-Prüfungen, unveränderte 53 PR3-Sicherheitsassertionen, echte Chrome-Interaktion mit gemeinsamen Controls in 390/768/1440 und 14 Sprachen, synthetische PostgreSQL/PostgREST-Persistenz/Rollen/CAS/Rollback, volle unmaskierte Vitest-Suite. Neun bekannte SQL-Fehler bleiben gesonderte Freigabeblocker. Tatsächliche Ergebnisse, Artefakt und ein Preview-Link werden im Draft-PR ergänzt; dieses Dokument allein ist kein PASS-Nachweis.

## Visuelle Referenz: ursprünglicher Admin (4 Eigentümer-Screenshots)

Die grüne Navigation und hellen Karten sind die verbindliche Referenz. AdminGate und die isolierte Abnahme verwenden jetzt dieselbe `AdminWorkspaceShell`, dieselbe vollständige Modulnavigation und stabile Admin-Farben. Zugriffskontrollen verbleiben ausschließlich in AdminGate/Serverfunktionen; die geteilte Hülle erteilt keine Rechte. Die mobile Navigation ist ein schließbarer Drawer mit Escape/Tab-Fokus und gesperrtem Hintergrundscroll.

Die Abnahme lädt standardmäßig alle Abschnitte des vorhandenen `defaultV2Page('esim')` statt nur Hero/NOTICE. Bestehende versteckte Abschnitte bleiben versteckt und editierbar. Der komplette Aufbau einschließlich Header/Footer ist scrollbar. Datenabhängige Katalog-, Regionen-, Review-, Guide- und Promo-Slots bleiben ohne Verbindung ausdrücklich als nicht verfügbare Live-Inhalte markiert; keine erfundenen Produkte, Preise oder Bewertungen. Damit ist dies weiterhin keine pixelidentische, mit realem Inhalt befüllte Shop-Abnahme. Die echte vollständige Webseite verwendet weiterhin den vorhandenen V2-Renderer im authentifizierten Editor (`/admin/storefront/v2/esim`, Vorschau auf `/esim?country=`); keine zweite produktive Homepage.

Die alte isolierte Zwei-Abschnitt-Translation-Fixture bleibt nur unter `?fixture=translation` für ihre unveränderten detaillierten Regressionen verfügbar. Der normale Einstieg nutzt die vollständige Standardseite. Zusätzlich prüft der Browser echte Standardabschnitte, Modulnavigation, Drawer und die mobile Einpassung der Desktopvorschau.

`ResponsivePreview` misst die tatsächliche Containerbreite, erhält die gewählte CSS-Viewportbreite und skaliert den gesamten Frame. Diese Komponente wird auch im echten V2-Editor verwendet: kein festes 400px-Fenster, das rechts auf Mobilgeräten abgeschnitten wird. Öffentliche Kundenlayouts und Datenzugriffe werden dadurch nicht verändert.

Vorhandene Medien-/Design-/Übersetzungskontrollen bleiben eingebunden; synthetisches Speichern/Versionen und echte Datenbankabnahme bleiben klar getrennt. Nach dieser UI-Korrektur keine weitere Datenbankfreigabe erteilt oder angenommen.

Unter „Önizleme kaynağı“ lässt sich zusätzlich die **tatsächliche vollständige `/esim`-Webseite** auswählen. Sie lädt den unveränderten produktiven V2-Seitenrenderer auf dem Preview-Host (nicht der Produktionsdomain). Bestehende `v2-cms-preview`, `v2-theme-preview` und `v2-chrome-preview`-Nachrichten übertragen Entwurf/Theme/Menü ausschließlich in das gleichursprüngliche benannte Frame; Ready/Select prüfen zusätzlich die Frame-Identität. Diese Ansicht liest veröffentlichte Daten und benötigt funktionierende bestehende Server-/Public-Datenkonfiguration. Sie speichert nicht. Der isolierte Browser prüft dieses Protokoll mit einem ausdrücklich synthetischen HTTP-Empfänger, **nicht** als echten Supabase-Shop-E2E-Nachweis. Die Offline-Ansicht bleibt bewusst der sichere Standard ohne Datenverbindung.
