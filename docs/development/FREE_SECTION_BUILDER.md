# Freier V2-Abschnitt – Bedienung und Sicherheitsgrenzen

PR #12 ergänzt die 15 vorhandenen Typen um EDITORIAL_SECTION. Keine neue Adminverwaltung und keine Datenbankmigration.

## Ausprobieren

1. **Seiten / Bölümler → + Yeni bölüm ekle**. Die Bibliothek ist auch direkt an der Abschnittsliste des echten V2-Editors verfügbar.
2. **Boş bölüm** wählen oder eine der elf kontrollierten Layoutvorlagen verwenden.
3. **Öğe ekle**: Überschrift, Unterüberschrift, Text, Bild, Bildgruppe, Icon, Vorteils-/Sicherheitskarte, Button, Rastergruppe, Trennlinie, Abstand, FAQ oder CTA wählen.
4. Türkische Texte direkt eingeben. Bilder aus der vorhandenen Medienbibliothek wählen; in der Offline-Vorschau nur die zwei vorhandenen, gekennzeichneten Fotos.
5. **Bölüm düzeni · 3 cihaz**: etwa Desktop Bild links, Tablet Bild rechts und Mobil Bild oben. Schriftgröße, Farben, Größen, Position/Spaltenbreite, Abstände und Iconeinstellungen unter **Tasarım** je Element bearbeiten. Bilder haben weiterhin je Gerät Ausschnitt/Zoom/Position, Overlay und lokalisierte Beschreibungen.
6. Elemente mit ↑/↓ verschieben, duplizieren, verstecken oder entfernen. Abschnittsreihenfolge und Duplizieren über die vorhandenen Abschnittsaktionen.
7. **Şablon adı → Kendi şablonum olarak kaydet**. Vorlage über dieselbe Bibliothek wieder einfügen. Jede Kopie erhält neue Abschnitts- und Element-IDs; Text-/Medienverwendungsdaten werden tief kopiert, die vorhandene Bilddatei bleibt wiederverwendet.
8. **Tüm sayfayı 13 dile çevir** verarbeitet auch Gruppenkinder. Türkisch bleibt Quelle, manuelle Korrekturen bleiben geschützt. In der Demo werden ausschließlich vorhandene Beispielübersetzungen verwendet. Beliebige neue Texte ohne Fixture werden als fehlend gemeldet, niemals als echte KI-Übersetzung ausgegeben.
9. In **Versionen** synthetisch speichern, neu laden und wiederherstellen. Echter Admin verwendet weiterhin seinen vorhandenen authentifizierten Speicherpfad und dessen gesondert freizugebende SQL-Vorschläge.

## Vorlagen: bewusst gerätelokal

Die Vorlagenbibliothek wird im Browser dieses Geräts gespeichert, nicht in einem öffentlich lesbaren CMS-Dokument. JSON-Export/-Import ermöglicht Übernahme in andere Browser oder V2-Seiten. Import ergänzt die Bibliothek mit frischen Kennungen und ersetzt keine bestehenden Vorlagen. Zentral synchronisierte Teamvorlagen sind ohne zusätzlich freigegebenen privaten Speicher **nicht** Bestandteil dieser Umsetzung. Exportdateien können redaktionelle Entwürfe enthalten und sollen entsprechend privat behandelt werden.

## Sichere Grenzen

- 30 Abschnitte pro Seite; 30 Elemente pro freiem Abschnitt, inklusive Gruppenkinder; 20 Vorlagen, maximal 1 MiB Import. Werte werden sichtbar angezeigt. Keine stille Kürzung bei Übergröße, ungültigen IDs, unbekannten Elementtypen, Zukunftsversionen oder unzulässiger Verschachtelung.
- Gruppen nur auf der ersten Ebene, keine Gruppen in Gruppen. Bildgruppen enthalten ausschließlich Bilder. Rastergruppen nehmen kontrollierte redaktionelle Elemente auf.
- Keine HTML-/JS-/CSS-Felder, Formulare, dynamischen Provideraktionen oder frei ausführbaren externen URLs. Buttons verwenden bestehende interne Link-Allowlist.
- Preise, Kundenrechte, Bestellungen, Zahlungszustände, QR-Daten und Providerfunktionen gehören nicht zum redaktionellen Modell.
- Alle CARD-/TRUST_CARD-Elemente des neuen Typs, auch innerhalb sichtbarer Gruppen, benötigen weiterhin serverseitige Inhaltsfreigaben vor Veröffentlichung. Imported verified-Felder erteilen keine Berechtigung. Redaktionelle Freitexte benötigen weiterhin menschliche Quellenprüfung; kein automatischer Faktencheck.
- Bestehender Medienlöschschutz, Legacy-CMS-Schreibschutz und Entwurfsschutzvorschläge bleiben erhalten. Keine bestehenden Medien gelöscht, keine bestehenden Datenbanken verändert.

## Nachweisgrenzen

Vorschau und öffentlicher V2-Renderer verwenden EditorialSection identisch, mit einem DOM-Element pro Inhalt. Der komplette Offline-Seitenaufbau enthält weiterhin explizite Datenplatzhalter für nicht angebundene echte Katalog-/Bewertungsdaten. Die Browserpersistenz ist ein synthetischer Adapter. PostgreSQL-/PostgREST-Tests prüfen separat einen wegwerfbaren künstlichen Datenbestand. Managed Supabase Auth/Storage und reale Publikation bleiben ungeprüft und benötigen Freigaben.

Die neun bekannten SQL-Sicherheitsfehler bleiben separat sichtbar. Keine Produktionsfreigabe, kein Merge und keine kostenpflichtige KI-Aktivierung.
