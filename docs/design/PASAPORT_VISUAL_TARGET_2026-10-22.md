# Pasaport.io — verbindliches UI-Zielbild (22.10.2026)

Status: **Designreferenz / Implementierungsauftrag**, nicht Fertigmeldung.
Quelle: fünf vom Projektinhaber bereitgestellte Konzept-Screenshots. Die binären Originale sind nur in der Chat-Konversation, **nicht** in diesem öffentlichen Repository hinterlegt (keine ungefragte Veröffentlichung von Entwürfen).
Reference filenames: `287662.png` (Home), `287685.png` (Länder-/Produktseite), `287691.png` (Produktseite, mobile Fortsetzung), `287656.png` (Desktop/Mobile Navigation Drawer), `287677.png` (FAQ/Footer).
**Ein späterer Codex-Auftrag muss diese fünf Bilder als visuelle Referenzen erhalten**; diese Textspezifikation ist der Fallback.

## Visuelle Leitlinie

- Ziel: hohe visuelle Übereinstimmung mit den Screenshots auf Desktop **und** Mobil; keine eigenständige Neugestaltung.
- Dunkles tiefes Petrol/Schwarz als Grundfläche, minimal hellere Petrol-Glasflächen, dünne subtile Konturen, deutlich leuchtende Mint-/Türkis-Akzente, weiße Headlines, abgetöntes hellgraues Sekundärtext.
- Breite Hero-Fotografie, atmosphärische Reisebilder, Bild-Gradient-Overlays für lesbare Texte.
- Abgerundete Karten (ca. 12–24px), elegante pillenförmige Suche/Buttons, grüne Kreis-Icons. Einheitliche Abstände, klare Informationshierarchie.
- Keine horizontal überlaufende Gesamtseite. Auf Smartphone kompakter Header, vertikaler Produkt-Flow und horizontal scrollbare, **erkennbare** Karussells.
- Screenshots sind Beispiele für **Layout, Bildsprache, Abstände und Farben**. Preiswerte, Netzbetreibernamen, Mengen, Länderzahlen, Lieferzeit und Versprechen sind **nicht** verifizierte Geschäftsdaten.

## A. Startseite — 287662.png

### Desktop
1. Schmale gläserne Kopfzeile: Pasaport.io-Marke links, Blog/Hilfe, kombinierte Sprache+Währung, Anmelden, Menü rechts.
2. Hoher, breiter Reise-Hero: Sonnenuntergang/Küstenlandschaft mit Reisender; Titel zweifarbig (weiß + Mint), knapper Nutzen-Satz links, darunter große weiße pillenförmige Ländersuche mit grünem Suchknopf.
3. Unmittelbar unter/über dem unteren Hero-Rand: dezente Glas-Vertrauensleiste mit 3 Icons (Support, Installation, Rückgabe). Nur nachgewiesene Aussagen/Links anzeigen.
4. `Beliebte Länder` mit „Alle Länder“-Link, **waagerechtes Foto-Karussell**. Karten: Foto füllt Karte, dunkel verlaufender unterer Rand, Länderflagge, Name, Einstiegspreis „ab“, kreisförmiger Pfeil. Etwa 5 Karten sichtbar, rechts Pfeil; Klick führt zur tatsächlichen Länder-/Produktseite.
5. `Regionale und globale Pakete` mit „Alle Pakete“-Link, 3 größere Foto-Overlay-Karten (Europa, Asien, Global), Scrollpfeil und echte „ab“-Preise.
6. Schlanker Gerätekombatibilitäts-CTA über volle Breite.
7. „eSIM in 3 Schritten“ als drei nebeneinander liegende Step-Karten mit grünen Nummern, klaren Icons und CTA zum echten Installationsguide.

### Mobile
- Header mit Logo, kompakter Sprache/Währung, Menü.
- Hero-Foto wird kontrolliert beschnitten, nicht verzerrt; Headline und Suche bleiben vollständig sichtbar. Die Trust-Leiste erscheint unterhalb des Heros.
- Länder-Karussell zeigt mehrere angeschnittene Karten als Wischhinweis (nicht alle Karten als lange vertikale Liste); regionale Karten ähnlich.
- Mobile Gerätekompatibilitätsleiste und drei kompakte Steps untereinander/nebeneinander gemäß Screenshot, ohne unlesbare Schrift.

## B. Länder-/Produktseite — 287685.png + 287691.png

### Hero
- Breites echtes Länder-Reisefoto mit starkem Gradient, Breadcrumb, gut sichtbarer Flagge, Headline z. B. „Türkiye eSIM“, kurze Subheadline.
- Vier kleine Vorteils-Icons mit labels. Aussagen nur wenn in realen Richtlinien/Produkteigenschaften gedeckt.

### Paket-Auswahl
- Tab-Umschaltung „Standard“ / „Unbegrenzt“ (bei nicht vorhandenen Unlimited-Produkten entsprechend leeres/ausgeblendetes Angebot, **nie falsche Unlimited-Zuordnung**).
- Gleichmäßige anklickbare **Zeilen-Karten** statt winziger und schwer vergleichbarer Kacheln: Radiokreis links, Datenmenge, Tage, nach realer Preisregel berechneter Preis, Chevron; ausgewählt mit Mint-Rand und „Beliebt“-Label nur aus Admin-Merchandising-Daten.
- Desktop: linke Spalte Paketliste, rechte Spalte sticky „Ausgewähltes Paket“ mit Flagge, GB, Laufzeit, unterstützten Betreibern sofern vorhanden, Gesamtbetrag und großer grüner Warenkorb-CTA.
- Mobile: Pakete unter Hero vertikal, ausgewähltes Paket als sichtbare, gut bedienbare Zusammenfassung **unter der Liste**, keine verdeckten Inhalte durch fixierte Leisten; CTA gut erreichbar.
- Nach dem Paketbereich: „Abdeckung & Betreiber“ (nur tatsächliche Daten), Gerätekombatibilität, Installationshilfe, FAQ-Akkordeon, Guides, Support, Vorteile.

### Datenvertrag
- Pakete, Preis/„ab“, Verfügbarkeit, Coverages und Betreiber: ausschließlich verifizierte veröffentlichte Katalog-/Supabase-Daten nach einer geprüften eSIM-Access-Synchronisation.
- eSIM Access `locationNetworkList/operatorList` sind Paket-bezogene Anbieterinformationen; **kein Beweis, in welchem Netz sich ein Kunde gerade live befindet**.
- Lieferanten-`locationLogo` ist Länderflagge/Logo, **kein Ersatz für große Länder-Reisefotos**.
- Fehlen reale Produkte/Preise: expliziter Leerzustand ohne Beispielpreise/Kaufknopf; die Gestaltung bleibt dennoch konsistent.
- Wo Produkt-/Netz- oder Unlimited-Informationen unbekannt sind, keine 5G-/Hotspot-/Aktivierungszusagen erfinden.

## C. Navigation/Drawer — 287656.png

- Mobile: linkes bzw. vorlagengetreues Einschubmenü auf abgedunkelter Seite, dunkler Hintergrund, Logo + X, markanter Anmelden/Registrieren-CTA.
- Navigationszeilen mit Icons und Rechtschevron: Startseite, Blog, Installationsanleitung, FAQ; getrennte Sprache und Währung (mit echten funktionierenden Pickern); danach Über uns, Datenschutz, Nutzungsbedingungen; unten WhatsApp-Support-CTA.
- Desktop: gleichartige elegante Seitenleiste mit gedimmtem Hintergrund, Fokusfalle/ESC/Backdrop/Scroll-Lock, richtige Links. Kein doppeltes/inertes Menü.
- Über alle 14 unterstützten UI-Sprachen und RTL testen, niemals türkische Navigationslabels außerhalb von Türkisch hart codieren.

## D. FAQ, Support und Footer — 287677.png

- FAQ als großzügiger zweispaltiger Desktop-Bereich: links Überschrift, Kurzbeschreibung, drei Häkchen-Vorteile; rechts atmosphärisches Reise-/Smartphone-Bild.
- Vier Akkordeon-Kategorien mit großen Symbolkreisen: Allgemeines, Installation, Nutzung im Ausland, Zahlung/Bestellung. Mobile kompakt vertikal.
- Mintfarbener Support-Banner mit freundlichem Teamfoto und funktionierendem Support-Link/WhatsApp.
- Dunkler Footer: Logo/Kurzversprechen, Services, Hilfe, Rechtliches, Social-Links, Sprache/Währung und **nur tatsächlich aktivierte** Zahlungsmittel; mobile Footergruppen einklappbar, klare Touchflächen.
- Keine erfundenen Sterne-/Bewertungszahlen und keine Logos nicht unterstützter Zahlungsverfahren.

## Bestehende Codebasis — wiederverwenden

- `src/components/design-v2/pages/EsimHomePage.tsx`: `Popular`, `RegionalDiscovery`, `Packages`, `CountryProductHero`, `V2SelectedProductSummary`.
- `src/components/design-v2/V2Shell.tsx`: `PhotoRail`, `PhotoCard`, Shell.
- `src/components/design-v2/V2Sections.tsx`: CMS-Abschnitts-Order, Hero/Carousel/FAQ/Installation.
- `src/components/design-v2/V2DiscoveryContent.tsx`: gruppierte FAQ, Support und Guide-Rail.
- `src/components/travel/PublicShell.tsx`: gemeinsamer Header, Drawer, Sprach-/Währungswahl und Footer.
- `src/components/design-v2/PasaportEsimHero.tsx`: Desktop-/Mobil-Hero.
- `src/components/design-v2/V2RegionCard.tsx`: regionale Foto-Overlay-Karte.
- Bilder: getrennt in CMS/Medien und echte Repo-/Storage-Dateien; historische Lovable-`*.asset.json`-Zeiger allein liefern keine portablen Originalfotos.
- Die dynamische Startseite bleibt CMS-konfigurierbar; bestehende Zuordnung von Bildern, Produkten, Marketing-Reihenfolge und echten „ab“-Preisen erhalten.

## Reihenfolge der Implementierung

1. **Designkonsolidierung:** Farben, Typografie, Karusselle, Menü/Drawer, Kartenabstände als gemeinsame Design-Tokens/Komponenten. Bestehende Funktion nicht entfernen.
2. **Home:** Hero, Trust-Strip, Popular/Regional/Global, Kompatibilität, 3-Step. Zunächst visuelle Komponententests mit vorhandenen echten Bildern; keine Fake-Preise.
3. **Länder-/Produktseite:** große Auswahlzeilen und responsiver ausgewählter Paketzusammenfassung; Kaufbutton immer an funktionierende, abgesicherte Bestelllogik gebunden.
4. **FAQ/Footer/Nav:** responsive Vorlage und aktiven Content übernehmen.
5. **Daten:** signierter eSIM-Access-Katalog-Leseabruf, Vergleich mit historischem Export, Freigabe/Preislogik, Bildmigration — erst dann automatische bepreiste Startseitenkarten.
6. **Tests:** 360/390/430px sowie 768/1280/1440px; TR/DE/EN + RTL, Screenreader, Tastatur, Scroll/Drawer, Preis-Konsistenz, Linkziele, Lade-/Fehler-/Leerstates, Lighthouse, E2E. Sicherheitsmigrationen/9 bekannte SQL-Testfehler müssen vor Livegang separat behoben werden.

## Definition of Done

- Visuell nah am Referenzbild, kein kaputter Hero, keine leeren Bildsymbole oder Layoutsprünge; Prüfung mit Screenshots Desktop+Mobile gegen die fünf Vorlagen.
- Jede sichtbare Paketkarte hat ein reales veröffentlichtes Produkt und einen aus dieser Quelle abgeleiteten korrekten Preis; Region-/Land-Zuordnung stimmt.
- Auswahl/Detail/Warenkorb/Zurücknavigation verlässlich; kein Fake-Checkout.
- Mobile Drawer/FAQ/Footer reagieren korrekt; keine nicht funktionierenden Controls.
- Build, TypeScript, relevante Unit-/Sicherheits-/Commerce-Tests und E2E sind bestanden. Kein Merge in Produktion ohne Nutzerfreigabe.
