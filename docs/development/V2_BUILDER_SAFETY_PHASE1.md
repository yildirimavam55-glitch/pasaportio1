# Issue #2 / Draft-PR #3 — Sicherheitsphase 1

## Aktueller Stand nach der erneuten Prüfung

Branch: `fix/v2-builder-safety-phase1`, Ziel: `chore/launch-readiness-2026-10-22`.
Keine Veröffentlichung, kein Merge und keine Datenbank-/Storage-Änderung freigegeben.
Dieser Bericht ersetzt die frühere Einschätzung einer direkt nutzbaren Medienlöschung.

### Entwurfsschutz: bestätigter Befund, noch keine Datenbankkorrektur

Der Auftraggeber hat im Testprojekt `pizilqgxgfaszhgdtdys` lesend bestätigt:
`anon` darf `cms_documents.data` und `theme_settings.draft` lesen, soweit die öffentliche
Zeilenpolicy die jeweilige Zeile zulässt. Ein veröffentlichtes Dokument kann weiterhin
`data.draft` enthalten. Diese Bestätigung stammt vom Auftraggeber, nicht aus einem neuen
Datenbankzugriff dieses Arbeitslaufs. Angemeldete Nicht-Admins müssen ebenfalls geprüft
und geschützt werden; die Rolle `authenticated` allein ist keine Adminberechtigung.

**Vorschlag A:** `docs/migration/pending/v2_publication_boundary_proposal.sql`.
- CMS erhält eine eigene, vom Datenbanktrigger gepflegte `public_data`-Spalte. Nur der
  explizit veröffentlichte Teil freigegebener Dokumenttypen gelangt dort hinein.
- Beide Browserrollen verlieren Tabellen-SELECT und vorhandene Spalten-SELECT-Grants
  auf die sensiblen CMS-/Theme-/Übersetzungs-/Versionsfelder. Erst danach werden sichere
  Spalten ausdrücklich freigegeben; ein bloßes REVOKE auf `draft` reicht nicht.
- `anon` und angemeldete Nicht-Admins können sichere CMS-Projektionen und veröffentlichte
  Theme-Einstellungen lesen, aber weder `data`, `draft` noch Versionssnapshots.
- Bestehende Zeilenpolicies bleiben aktiv. Ein `SELECT *` muss wegen privater Spalten
  fehlschlagen; öffentliche Leser müssen explizite sichere Spalten auswählen.
- Adminoberflächen greifen bereits nach serverseitiger Rollenprüfung privilegiert auf
  Entwürfe zu. Ein direkter Browser-SELECT auf Entwürfe wird auch für Admin-JWTs gesperrt;
  das ist beabsichtigt und verlangt die Prüfung aller Admin-Lesewege.
- Originaldaten, Entwürfe und Historie werden nicht gelöscht. Die Projektion ersetzt keine
  Publikationsvalidierung: absichtlich veröffentlichte Inhalte sind weiterhin öffentlich.

**Noch nicht angebunden:** Öffentliche SELECTs in `v2-storefront.functions.ts`,
`storefront.functions.ts` und `legal-center.functions.ts` müssten bei gesondert genehmigter
Umstellung `data:public_data` lesen. Das vorhandene `{ published: ... }`-Antwortformat bleibt
so erhalten. `admin-theme.functions.ts` liest öffentlich bereits nur `published`.
Navigation/Footer über `storefront_global` und Rechtsdokumente über `legal_center` gehören
explizit zum Testumfang. Weitere Verbraucher und Views/RPCs müssen vollständig inventarisiert
werden. Ein Invoker-View über weiterhin lesbares Roh-JSON löst das Problem nicht.

### Medien: endgültige Löschung geschlossen

`deleteMedia` prüft weiterhin Anmeldung und Adminrolle und bricht danach bedingungslos mit
`E_MEDIA_FINAL_DELETE_DISABLED` ab. Es gibt keinen Schalter oder Requestparameter zum
Aktivieren des alten unsicheren Löschpfads. Die Adminoberfläche zeigt einen deaktivierten
Löschknopf und erklärt, dass Bilder an ihrer Verwendung ausgetauscht werden können.
Upload, Metadatenbearbeitung, Auswahl und Verwendungsprüfung bleiben erhalten.

Damit führen auch ein früherer leerer Referenzscan, eine später hinzugefügte Referenz oder
ein direkter Endpoint-Aufruf zu keiner Löschung. Es wird keine Storage-Datei entfernt und
kein Medien-Datensatz verändert. Das vermeidet auch den Fall "Storage entfernt, DB fehlgeschlagen".

Die früheren 37 Prüfungen bleiben unverändert. Darin enthaltene Prüfungen des alten
`removeUnusedMedia`-Primitivs belegen nur dessen Fehlerbehandlung; dieses Primitiv ist nicht
mehr an den produktiven Lösch-Endpoint angeschlossen und bedeutet keine Löschfreigabe.
Referenzscanner und vollständige Historienprüfung bleiben zur Auskunft erhalten.

Eine spätere sichere Löschung benötigt ein gesondertes Protokoll: zunächst nicht mehr
referenzierbarer Status, konsistente Referenzprüfung unter koordinierten Writer-Sperren,
Versionierung/Soft-Delete und ein wiederholbarer Aufräumauftrag mit nachgewiesenem Zustand.
Storage und PostgreSQL bilden keine gemeinsame Transaktion. Ein Metadaten-Tombstone muss
bei Fehlern erhalten bleiben; weder eine umgekehrte Reihenfolge noch ein zweiter Scan
lösen die Race Condition. Keine Aktivierung und keine solchen Schemaänderungen in diesem PR.

### Restore und CMS-Speicherung

Restore bleibt ausschließlich ein Entwurf. Dokumentzugehörigkeit, PageId, Adminrolle und
sein Lese-/Schreibkonflikt werden geprüft. Publizierter Inhalt, Status und Zeitpunkt bleiben
unverändert, auch wenn anschließend Historie/Audit fehlschlagen. Solche Teilerfolge werden
als Fehler gemeldet; es wird kein automatischer Rollback behauptet.

Aktuelles Save ist weiterhin nicht atomar und besitzt noch keinen Editor-Revisionsvertrag.
Ein gezielter Handler-Test dokumentiert, dass eine veraltete zweite Admin-Sitzung den Entwurf
überschreiben kann. Dieser Test ist ein Gegenbeispiel und kein Sicherheitsnachweis für Save.

**Überarbeiteter Vorschlag B:** `docs/migration/pending/v2_builder_atomicity_proposal.sql`.
- `builder_revision bigint` statt Zeitstempel. Jeder UPDATE erhöht die Revision durch
  einen Trigger, auch bei alten Server-Schreibwegen. Ein UPDATE kann sie nicht zurücksetzen.
- Bestehendes Dokument: exakte erwartete Revision erforderlich; NULL bedeutet ausschließlich
  "Dokument war noch nicht vorhanden". Veraltete Werte scheitern mit SQLSTATE 40001.
- Row Lock schützt bestehende Zeilen, Advisory Lock serialisiert RPC-Erstanlagen.
  Konkurrierender Legacy-INSERT kann eine Unique-Verletzung auslösen: kompletter Abbruch,
  niemals blinder Retry oder stilles Überschreiben.
- Dokument, Revision, Projektion, Versionssnapshot und Audit liegen in einer Transaktion.
  Fehler werden nicht verschluckt. Nur ausdrückliches `publish` verändert die Veröffentlichung.
- Der alte reine SECURITY-INVOKER-Entwurf wäre nach Vorschlag A nicht lauffähig: selbst
  Admin-JWTs besitzen dann kein direktes Rohdaten-SELECT. Dies wurde ausdrücklich korrigiert.
- Vorgeschlagen ist eine eng begrenzte private SECURITY-DEFINER-Funktion mit leerem
  search_path, festem V2-Schlüsselraum und einer Adminprüfung gegen `user_roles` anhand
  `auth.uid()` VOR jedem Entwurfszugriff. Öffentliche Invoker-Hülle, kein anonymer EXECUTE,
  keine frei übergebene Actor-ID, keine Benutzermetadaten und kein Rohdaten-Rückgabewert.
  Das ist eine ausdrückliche privilegierte API-Grenze, keine stillschweigende RLS-Umgehung.

**Nicht ausführungsreif:** Vertrauenswürdiger Funktionsowner (`postgres`), nicht exponiertes
privates Schema, Rollen-/Auditfunktionen, sämtliche Grants und Abhängigkeiten müssen isoliert
geprüft werden. Bestehende Anwendungssanitizer bleiben erforderlich. Alle V2-Schreibwege,
einschließlich Discard/Restore, müssen auf den Revisionsvertrag umgestellt werden; derzeit
ist keine neue RPC angebunden. Die neun bestehenden SQL-Testblocker werden dadurch nicht behoben.

## Tests und eindeutige Grenzen

- Unveränderte 37 Offline-Prüfungen: weiterhin lokal bestanden.
- Weitere 16 Prüfungen: echte Server-Handler mit In-Memory-Transport und tatsächlicher
  Admin-Prüffunktion integriert; Auth-Transport und Sanitizer sind Test-Doubles. Keine
  echten Supabase-/PostgREST-/Storage-Zugriffe und keine RPC-Ausführung.
- Darunter: anon/Nicht-Admin/Admin-Löschsperre, nachträglich eingeführte Referenz,
  Restore-Veröffentlichungsinvarianz, konkurrierender Restore-Write, Save-/Audit-Teilfehler,
  öffentliches Server-Ergebnis sowie statische Verträge der beiden SQL-Vorschläge.
- SQL-Textprüfungen beweisen weder PostgreSQL-Syntax noch echte Grants/Isolation/Locks.
  Keine Datenbankfunktion und keine Migration wurde ausgeführt. Eine wirkliche DB-Abnahme
  folgt ausschließlich nach separater Freigabe gemäß dem unten verlinkten Plan.
- GitHub Actions führt die 37 und 16 Prüfungen, unveränderte Installation, TypeScript,
  Produktions-Build und vollständige Vitest-Suite aus. Aktuelle Ergebnisse stehen im PR.
- Die neun bisherigen SQL-Fehler bleiben getrennte Blocker: Produktkostenrechte,
  Refund-Bestätigung, zwei has_role-Prüfungen, zwei platform_settings-Prüfungen,
  Admin-RPC-Rechte sowie historische E-Mail-/PDF-Migrationen 0006/0007. Keine Tests geändert
  oder zusätzlich übersprungen; vorheriger Lauf: 1.348 bestanden, 9 fehlgeschlagen, 6 übersprungen.

Freigabe-/Rollback-/Testmatrix: `docs/migration/pending/V2_DATABASE_APPROVAL_AND_TEST_PLAN.md`.
Bis zur getrennten Genehmigung und wirklichen DB-Abnahme: kein Merge/Deployment, keine
Behauptung, dass der bestätigte Entwurfsschutzfehler in Supabase bereits behoben sei.
