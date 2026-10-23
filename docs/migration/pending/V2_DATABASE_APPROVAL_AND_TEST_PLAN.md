# Separater Freigabe- und Datenbank-Testplan für Draft-PR #3

Status: Vorschlag. Kein SQL, keine RPC, kein Testkonto und keine Migration ausgeführt.
Einziges später genehmigbares bestehendes Ziel: `pizilqgxgfaszhgdtdys`.
Die vorliegenden Review-SQL-Dateien enden bewusst in ROLLBACK und gehören nicht in aktive
Migrationen. Sie dürfen nicht ohne verifizierte Projektidentität, Schemafingerprints und
separate Freigabe als Upgrade ausgeführt werden. Der aktuelle Branch benutzt keine neue RPC.

## A. Inventar vor jeder Anwendung (lesend)

- Tabellen-/Spaltengrant UND geerbte Rollen/PUBLIC-Grants inventarisieren. SELECT-Rechte
  auf Tabelle und einzelne Spalten getrennt prüfen, insbesondere anon/authenticated.
- RLS-/Policydefinitionen, Tabellenowner, Funktionsowner, EXECUTE-Grants, search_path,
  Trigger und projektexponierte Schemas erfassen. Bestehende Definer-Views/RPCs prüfen:
  Eine direkte Tabellensperre hilft nicht, wenn eine öffentlich ausführbare Funktion
  dieselben Rohdaten zurückgibt. Funktionen/Views nicht pauschal ändern oder löschen.
- Private Vorschlags-Schemanamen dürfen nicht existieren oder als API-Schema exponiert sein.
- Alle CMS-Verbraucher inventarisieren: V2, Legacy-Storefront, globale Navigation/Footer,
  Rechtsseiten, Theme, Admineditor, Medien-Verwendungen, Vorschau, Versionierung.
- Tatsächliche Rollen-/Auditfunktionen prüfen; bekannte SQL-Testfehler nicht als erledigt
  behandeln. Der privilegierte RPC-Owner verlangt eine eigene Sicherheitsprüfung.

## B. Veröffentlichungsgrenze — isolierte Fixtures, keine echten Inhalte

Vor Freigabe ist eine wegwerfbare Umgebung mit passenden Auth-JWT-Claims/Rollen nötig.
Nur synthetische Dokumente und Inhalte verwenden; keine realen Accounts kopieren/anlegen.
Fixtures: öffentliches V2-Dokument mit PUBLIC_MARKER in published und DRAFT_ONLY_MARKER in
seinem Entwurf; unveröffentlichtes Dokument; unsichtbares Dokument; Theme mit verschiedenen
Published-/Draft-Markern; Versionssnapshot und CMS-Übersetzung mit weiteren Entwurfsmarkern;
Legal-Center sowie Legacy/global-Dokumente für Navigation/Footer.

| Probe | anon | angemeldeter Nicht-Admin | Admin über autorisierten Server |
|---|---|---|---|
| explizite public_data-Spalten veröffentlichter sichtbarer CMS-Zeile | PUBLIC_MARKER | PUBLIC_MARKER | gleiches öffentliches Ergebnis |
| direkter SELECT cms_documents.data oder JSON-Pfad data->draft | verweigert | verweigert | nur privilegierter, rollenprüfender Server-Leseweg |
| direkter SELECT theme_settings.draft | verweigert | verweigert | nur privilegierter, rollenprüfender Server-Leseweg |
| Theme published | veröffentlichtes Theme | veröffentlichtes Theme | veröffentlichtes Theme |
| cms_versions.snapshot / cms_translations.data | verweigert | verweigert | nach Adminprüfung lesbar |
| versteckte/unveröffentlichte CMS-Zeile | keine Zeile | keine Zeile | Editor darf sie sehen |
| Wildcard-/Join-/Embedded-/RPC-/View-Abfrage | niemals Entwurfsmarker | niemals Entwurfsmarker | nur zulässige Adminwege |

Nicht-Admin-JWT mit selbst gesetztem user_metadata.admin=true muss unverändert scheitern.
Ein direkter Admin-Browser-SELECT auf rohe Entwurfsspalten bleibt ebenfalls gesperrt;
der bestehende Servereditor und seine Vorschau müssen trotzdem funktionieren.
Mutationstests: published ändern, draft ändern, sichtbar/unsichtbar setzen, Status ändern,
public_data direkt überschreiben versuchen. Projektion darf nie auf draft ausweichen.
Bestehende public_data-/published-Rückgaben dürfen Entwurfsmarker niemals enthalten.

## C. Atomare Speicherung — echte PostgreSQL-Prüfungen nach separater Freigabe

1. Zwei unabhängig angemeldete synthetische Adminidentitäten und einen Nicht-Admin über
   Test-JWT-Claims simulieren. Kein realer Benutzer in einem bestehenden Projekt nötig.
2. Admin A und B laden dieselbe Revision r. A speichert: r+1 und genau eine neue Version/
   Auditzeile. B speichert mit r: SQLSTATE 40001, keinerlei weitere Änderung.
3. Bestehendes Dokument plus expected_revision=NULL wird abgewiesen. Fehlendes Dokument
   plus nicht-NULL wird abgewiesen. Zwei gleichzeitige Erstanlagen: maximal eine Anlage,
   zweite Anfrage Konflikt/Unique-Verletzung ohne Teilerfolg.
4. Gleicher Zeitstempel mehrerer Writes beeinflusst den Bigint-Vertrag nicht. Legacy-UPDATE
   erhöht ebenfalls die Revision. Negative/ungültige Revision und Überlauf schlagen fehl.
5. Fehlende Version, falsche PageId, fremde document_id und ungültige Config werden vor
   jeder Änderung abgewiesen. Restore verändert nie Published/Status/Veröffentlichungszeit.
6. Versionierungs-, Audit-, Projektions- oder Triggerfehler künstlich injizieren: gesamte
   Transaktion unverändert, einschließlich Revision. Fehlgeschlagene Antwort niemals
   automatisch mit neuer Revision wiederholen. Netzwerkfehler nach möglichem Commit
   verlangen erneutes Lesen von Revision/Version/Audit statt blindem Wiederholen.
7. anon und Nicht-Admin dürfen weder Wrapper noch private Funktion zum Schreiben nutzen;
   gefälschte Actor-/Metadaten dürfen keine Rolle spielen. Rohdatenrechte bleiben entzogen.
8. Privater Definer: geprüfter Owner, keine benutzerkontrollierten Suchpfade/dynamischen
   Objektpfade, keine Rohdaten als Antwort. Den kompletten Aufrufgraphen separat prüfen.
9. Alle aktuellen V2-Writer (Save, Publish, Restore, Discard) auf Revisionstoken umstellen
   und UI-Konfliktmeldung ohne Entwurfsverlust testen. Alte konkurrierende Serverwriter
   dürfen nicht als vollständig transaktional bezeichnet werden.

Diese Prüfungen sind vorbereitet, aber NICHT ausgeführt. Die Node-Handler-Integration
prüft bestehenden Anwendungscode mit Test-Doubles, nicht die SQL-Transaktionsgarantien.

## D. Medien

Endgültige Löschung bleibt serverseitig bedingungslos gesperrt, auch für Admins und direkt
konstruierte Requests. Datei-/Medien-/Versionsbestand bleibt erhalten. Upload und Ersetzen
von Referenzen bleiben möglich. Reaktivierung benötigt einen neuen, separat genehmigten
Entwurf mit Writer-Koordination, Soft-Delete/Tombstones und wiederholbarem Storage-Cleanup.
Kein Environment-Schalter darf das frühere Race-anfällige Verfahren wieder einschalten.

## E. Anwendung, Sperrzeit und Rollback

- Erst isolierte SQL-/PostgREST-Abnahme; dann gesonderte Genehmigung einer exakten finalen
  Upgrade-Datei für das Testprojekt. Beide Review-Dateien sind dafür noch kein fertiges Paket.
- Editor-Schreibpause während Backfill und Umstellung. ALTER TABLE/Trigger/Grant können
  Locks benötigen; Dauer/Tabellenumfang erst lesend ermitteln. lock_timeout/statement_timeout
  und Abbruchplan vor Ausführung festlegen, nicht schätzen.
- Kompatible öffentliche Leser (data:public_data) und Admin-RPC-Anbindung zusammen mit den
  Rechten umstellen. Nicht mitten in einer Freigabe auf den alten SELECT data zurückfallen.
- Nachprüfung der oben genannten Rollenmatrix und aller Seiten vor Ende der Schreibpause.
- Fehler vor Commit: tatsächliches PostgreSQL-ROLLBACK, keine manuellen Gegenwrites.
- Fehler nach Commit: Schreibpause/geschützte Wartungsansicht erhalten; kompatiblen
  Anwendungsstand zurücknehmen oder vorwärts korrigieren. Keine erneuten öffentlichen
  Rohdaten-/Draft-Grants. Revisionen, Originalinhalte und Audit/Versionen erhalten.
- Keine DROP SCHEMA CASCADE- oder pauschalen GRANT ALL-Rollbacks. Abhängigkeiten prüfen;
  neue Funktionen/Trigger erst entfernen, wenn kein Leser/Writer mehr darauf angewiesen ist.

## Freigaben ausdrücklich getrennt

1. Sichere Codeänderung: Löschsperre und Tests im Draft prüfen.
2. Isolierte echte Datenbank-/PostgREST-Tests des zusammengesetzten Vorschlags genehmigen.
3. Erst nach deren Nachweis konkretes Testprojekt-Upgrade und kompatible App-Umstellung
   separat genehmigen. Keine Produktions-, Account-, Produkt-, Zahlungs- oder Deploymentfreigabe.
