import type { Locale } from "@/domain/enums";
import { flagOf, foldText } from "./countries";

export type Airport = {
  id: string;
  iata: string;
  countryIso: string;
  flag: string;
  city: Record<Locale, string>;
  airport: Record<Locale, string>;
  aliases: string[];
};

type Row = [iata: string, countryIso: string, city: string, airport: string, cityTr?: string, airportTr?: string];

const ROWS: Row[] = [
  ["IST", "TR", "Istanbul", "Istanbul Airport", "İstanbul", "İstanbul Havalimanı"],
  ["SAW", "TR", "Istanbul", "Sabiha Gökçen", "İstanbul", "Sabiha Gökçen Havalimanı"],
  ["AYT", "TR", "Antalya", "Antalya Airport", "Antalya", "Antalya Havalimanı"],
  ["ESB", "TR", "Ankara", "Esenboğa Airport", "Ankara", "Esenboğa Havalimanı"],
  ["ADB", "TR", "Izmir", "Adnan Menderes Airport", "İzmir", "Adnan Menderes Havalimanı"],
  ["FRA", "DE", "Frankfurt", "Frankfurt Airport", "Frankfurt", "Frankfurt Havalimanı"],
  ["MUC", "DE", "Munich", "Munich Airport", "Münih", "Münih Havalimanı"],
  ["DUS", "DE", "Dusseldorf", "Düsseldorf Airport", "Düsseldorf", "Düsseldorf Havalimanı"],
  ["BER", "DE", "Berlin", "Berlin Brandenburg", "Berlin", "Berlin Brandenburg Havalimanı"],
  ["HAM", "DE", "Hamburg", "Hamburg Airport", "Hamburg", "Hamburg Havalimanı"],
  ["STR", "DE", "Stuttgart", "Stuttgart Airport", "Stuttgart", "Stuttgart Havalimanı"],
  ["CGN", "DE", "Cologne", "Cologne Bonn Airport", "Köln", "Köln Bonn Havalimanı"],
  ["VIE", "AT", "Vienna", "Vienna Airport", "Viyana", "Viyana Havalimanı"],
  ["ZRH", "CH", "Zurich", "Zurich Airport", "Zürih", "Zürih Havalimanı"],
  ["AMS", "NL", "Amsterdam", "Schiphol Airport", "Amsterdam", "Schiphol Havalimanı"],
  ["BRU", "BE", "Brussels", "Brussels Airport", "Brüksel", "Brüksel Havalimanı"],
  ["CDG", "FR", "Paris", "Charles de Gaulle", "Paris", "Charles de Gaulle Havalimanı"],
  ["LHR", "GB", "London", "Heathrow Airport", "Londra", "Heathrow Havalimanı"],
  ["MAD", "ES", "Madrid", "Barajas Airport", "Madrid", "Barajas Havalimanı"],
  ["BCN", "ES", "Barcelona", "El Prat Airport", "Barselona", "El Prat Havalimanı"],
  ["FCO", "IT", "Rome", "Fiumicino Airport", "Roma", "Fiumicino Havalimanı"],
  ["MXP", "IT", "Milan", "Malpensa Airport", "Milano", "Malpensa Havalimanı"],
  ["ATH", "GR", "Athens", "Athens Airport", "Atina", "Atina Havalimanı"],
  ["CPH", "DK", "Copenhagen", "Copenhagen Airport", "Kopenhag", "Kopenhag Havalimanı"],
  ["ARN", "SE", "Stockholm", "Arlanda Airport", "Stockholm", "Arlanda Havalimanı"],
  ["WAW", "PL", "Warsaw", "Chopin Airport", "Varşova", "Chopin Havalimanı"],
  ["PRG", "CZ", "Prague", "Václav Havel Airport", "Prag", "Václav Havel Havalimanı"],
  ["BUD", "HU", "Budapest", "Ferenc Liszt Airport", "Budapeşte", "Ferenc Liszt Havalimanı"],
  ["BEG", "RS", "Belgrade", "Nikola Tesla Airport", "Belgrad", "Nikola Tesla Havalimanı"],
  ["SOF", "BG", "Sofia", "Sofia Airport", "Sofya", "Sofya Havalimanı"],
  ["ZAG", "HR", "Zagreb", "Franjo Tuđman Airport", "Zagreb", "Franjo Tuđman Havalimanı"],
  ["DXB", "AE", "Dubai", "Dubai International", "Dubai", "Dubai Uluslararası Havalimanı"],
  ["DOH", "QA", "Doha", "Hamad International", "Doha", "Hamad Uluslararası Havalimanı"],
  ["JFK", "US", "New York", "John F. Kennedy", "New York", "John F. Kennedy Havalimanı"],
  ["LAX", "US", "Los Angeles", "Los Angeles International", "Los Angeles", "Los Angeles Havalimanı"],
  ["SIN", "SG", "Singapore", "Changi Airport", "Singapur", "Changi Havalimanı"],
  ["BKK", "TH", "Bangkok", "Suvarnabhumi Airport", "Bangkok", "Suvarnabhumi Havalimanı"],
  ["NRT", "JP", "Tokyo", "Narita Airport", "Tokyo", "Narita Havalimanı"],
  ["CAI", "EG", "Cairo", "Cairo International", "Kahire", "Kahire Havalimanı"],
  ["CMN", "MA", "Casablanca", "Mohammed V Airport", "Kazablanka", "Mohammed V Havalimanı"],
];

export const AIRPORTS: Airport[] = ROWS.map(([iata, countryIso, city, airport, cityTr, airportTr]) => ({
  id: `airport-${iata.toLowerCase()}`,
  iata,
  countryIso,
  flag: flagOf(countryIso),
  city: { tr: cityTr ?? city, de: city, en: city },
  airport: { tr: airportTr ?? airport, de: airport, en: airport },
  aliases: [iata, city, airport, cityTr ?? "", airportTr ?? "", countryIso].filter(Boolean).map(foldText),
}));

const BY_ID = new Map(AIRPORTS.map((airport) => [airport.id, airport]));

export function getAirport(id: string | null | undefined): Airport | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function getAirportByIata(iata: string | null | undefined): Airport | undefined {
  return iata ? BY_ID.get(`airport-${iata.toLowerCase()}`) : undefined;
}

export function searchAirports(query: string, limit = 40): Airport[] {
  const needle = foldText(query);
  if (!needle) return AIRPORTS.slice(0, limit);
  const scored: Array<{ airport: Airport; score: number }> = [];
  for (const airport of AIRPORTS) {
    let score = Infinity;
    for (const alias of airport.aliases) {
      if (alias === needle) score = Math.min(score, 0);
      else if (alias.startsWith(needle)) score = Math.min(score, 1);
      else if (alias.includes(needle)) score = Math.min(score, 2);
    }
    if (score !== Infinity) scored.push({ airport, score });
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((entry) => entry.airport);
}

export const POPULAR_AIRPORT_IDS = ["airport-ist", "airport-fra", "airport-dus", "airport-muc", "airport-ayt", "airport-vie"];
