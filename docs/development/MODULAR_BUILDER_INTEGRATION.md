# Zentraler V2-Baukasten – Integrationsstand

Basis: PR 11, `5a609472b654a060b1b9c337c7388a91c2bf7b69`. Kein paralleles CMS, keine bestehenden Datenbanken verändert.

## Umsetzung

`block-registry.ts` registriert die 15 bestehenden Typen mit Identität, Version, redaktionellen Feldern, Medienvarianten, Rollen, geschützten Feldern und Renderer-Adaptern. Die bisherigen V2-Modelle, Formulare, öffentliche Komponenten und Übersetzungsverwaltung bleiben Grundlage. BENEFIT_ROW, INFO_GRID und FAQ teilen öffentliche Renderer mit der Abnahmevorschau; datengebundene oder animierte Typen behalten bestehende Adapter. Das ist keine frei ausführbare Plugin- oder HTML-Schnittstelle.

`RegisteredCards` unterstützt beliebige stabile Kartenkennungen, Sichtbarkeit, Reihenfolge, Icons, Texte, sichere Links, lokalisierte Alternativtexte und responsive Medien. `CardDesignControls` bearbeitet Farben, Rahmen, Rundungen, Icongrößen, Innenabstände, Abstände und Spalten je Gerät. Der tatsächliche Hero verwendet dieselben Karten ohne Beschränkung auf delivery/refund/setup. Maximal 30 Abschnitte und 30 Elemente je Abschnitt.

Türkisch bleibt Quelle. Die registrierten Felder fließen in die bestehende seitenweite Übersetzung ein. Manuelle Korrekturen werden weiterhin geschützt. Nur gekennzeichnete Offline-Fixtures, keine aktivierte kostenpflichtige Übersetzung.

Alte Versionen 0/1 erhalten ihre IDs und Inhalte; unbekannte Typen, zukünftige Versionen, doppelte Kennungen oder Überschreitungen sperren die Speicherung ausdrücklich. Keine automatische Ersetzung durch neue Defaults. Das bestehende Modell bleibt eine Allowlist: beliebige unbekannte Zusatzfelder sind keine zugesicherte Erweiterungsschnittstelle.

## Sicherheitsänderungen und Grenzen

- **HOCH:** Legacy-CMS-Schreiber konnte Entwurf und veröffentlichten Inhalt unsicher vermischen. Serverseitig nach Adminprüfung gesperrt (`E_LEGACY_CMS_WRITE_PAUSED`). Modul und bisherige Daten bleiben erhalten. Wiederaktivierung erst mit geprüftem getrenntem Speichermodell; V2-Entwurf über vorhandene sichere RPC-Grenze.
- **HOCH:** Neue SVG-Uploads gesperrt, Raster-MIME mit Signatur abgeglichen, Kategorien validiert und Dateiendung aus Inhalt abgeleitet. Bestehende Bilder unverändert. Kein Ersatz für vollständige Bilddekodierung, Malwareprüfung oder geprüfte Storage-Policies.
- **HOCH:** Veröffentlichung von BENEFIT_ROW und Sicherheitskarten verlangt serverseitig geprüften Inhaltsdigest mit HTTPS-Quelle und Prüfdatum (`CMS_APPROVED_CLAIM_DIGESTS`). Standardmäßig keine Freigaben. Redaktionelle Änderungen bleiben als Entwurf möglich. Kein frei editierbares verified-Feld als Nachweis. Betriebsprozess und echte Quellen müssen separat freigegeben werden.
- **KRITISCH vor öffentlichem Echtbetrieb:** Bereits bestätigte öffentliche Lesbarkeit von CMS-/Theme-Entwürfen ist ohne freigegebenes Datenbankupgrade nicht auf dem bestehenden Projekt behoben. Vorhandene SQL-Vorschläge werden ausschließlich isoliert getestet.
- **HOCH:** Die neun bekannten SQL-Suitefehler bleiben sichtbar. Keine Migration ausgeführt, kein Test abgeschwächt.
- Endgültige Medienlöschung bleibt serverseitig gesperrt. Keine Storage- oder Kundendaten gelöscht.

## Nachweisgrenzen

`admin-surface.test.ts` erstellt ein Inventar aller 46 Routendateien, zugehöriger Backend-Importe und vorhandener Guard-Marker. Dies beweist Erhalt und Codezuordnung, **nicht** die Ausführung jedes Formulars oder jeden Buttons.

`admin-permissions.integration.test.ts` ruft echte ausgewählte Serverhandler mit dem echten Admin-Rollenguard und synthetischen Clients auf. Anonym, Kunde und manipulierte Rolle dürfen keine Tabellenoperation erreichen. Autorisierte Lesevorgänge werden positiv geprüft. Der TanStack-Transport und die Auth-Middleware werden in diesem Harness simuliert; dies ersetzt keine Managed-Auth-Prüfung.

Der Browser verwendet Original-AdminShell und gemeinsame öffentliche Komponenten mit klar gekennzeichnetem synthetischem Speicher. Vollständiger Offline-Seitenaufbau vorhanden, aber Produkt-/Providerdaten werden nicht erfunden. Der optionale echte Webseiten-Frame benötigt eine korrekt konfigurierte Testintegration. Lokales Browser-Speichern ist keine Behauptung über produktives Supabase-Speichern.

Die PostgreSQL-/PostgREST-Prüfung verwendet nur einen frischen Wegwerfcontainer, künstliche JWT-Subjekte und synthetische Datensätze. Managed Supabase Auth/Storage/E-Mail und reale Integrationen bleiben ungeprüft.

## Freigaben vor Betrieb

1. SQL-Entwurfsschutz, atomare Speicherung und CAS nach separater Freigabe auf geeignetem Testprojekt installieren; zuvor aktueller Strukturabgleich, Sicherung, Rollback und Wartungsfenster.
2. Echte Admin-/Kunden-Auth, Storage-Uploadrechte, private Dokumente und Datenbankrollen testen.
3. Garantie-/Bewertungsquellen und Inhaltsfreigaben festlegen. Keine erfundenen Zertifizierungen oder Garantien.
4. Kritische Commerce-Aktionen nur in ausdrücklich freigegebenen Sandboxen prüfen. Keine echten Zahlungen, Erstattungen, Providerbestellungen oder QR-Auslieferungen in dieser Arbeit.
5. Draft-PR visuell prüfen, nicht automatisch mergen oder veröffentlichen.
