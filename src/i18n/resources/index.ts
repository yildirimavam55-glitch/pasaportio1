// Static, versioned translation resources (English source string → translation).
import fr from "./fr.json";
import es from "./es.json";
import it from "./it.json";
import pt from "./pt.json";
import nl from "./nl.json";
import pl from "./pl.json";
import ar from "./ar.json";
import ru from "./ru.json";
import ja from "./ja.json";
import ko from "./ko.json";
import zh from "./zh.json";
import type { UiLocale } from "../locales";
export const RESOURCES: Partial<Record<UiLocale, Record<string, string>>> = { fr, es, it, pt, nl, pl, ar, ru, ja, ko, zh };
