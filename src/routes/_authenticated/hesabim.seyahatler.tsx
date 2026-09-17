import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, MapPin, PlaneTakeoff, Plus, Signal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/travel/PublicShell";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/hesabim/seyahatler")({ component: TripsPage });

const COPY = {
  tr: { eyebrow: "Hesabım", title: "Seyahatlerim", lead: "eSIM ve Lounge hizmetlerini seyahatlerine göre birlikte yönet.", newTrip: "Yeni seyahat planla", emptyTitle: "Henüz planlanmış bir seyahatin yok.", emptyText: "Bir destinasyon seçtiğinde eSIM ve Lounge hizmetlerini aynı seyahat altında takip edebilirsin.", start: "Planlamaya başla", side: "Seyahat kartında neler var?", items: ["Destinasyon ve rota", "Seyahat tarihleri", "eSIM hizmetleri", "Lounge rezervasyonları"] },
  de: { eyebrow: "Mein Konto", title: "Meine Reisen", lead: "Verwalte eSIM- und Lounge-Services gebündelt pro Reise.", newTrip: "Neue Reise planen", emptyTitle: "Du hast noch keine geplante Reise.", emptyText: "Sobald du ein Ziel wählst, siehst du eSIM und Lounge unter derselben Reise.", start: "Jetzt planen", side: "Was steht auf der Reisekarte?", items: ["Ziel und Route", "Reisedaten", "eSIM-Services", "Lounge-Buchungen"] },
  en: { eyebrow: "My account", title: "My trips", lead: "Manage eSIM and Lounge services together, trip by trip.", newTrip: "Plan a new trip", emptyTitle: "You have no planned trip yet.", emptyText: "Once you pick a destination, eSIM and Lounge services appear under the same trip.", start: "Start planning", side: "What is on a trip card?", items: ["Destination and route", "Travel dates", "eSIM services", "Lounge bookings"] },
} as const;

function TripsPage() {
  const { locale } = useI18n();
  const copy = COPY[locale];

  return (
    <PublicShell>
      <section className="mx-auto max-w-site px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-primary">{copy.eyebrow}</span>
            <h1 className="mt-2 font-display text-3xl font-bold">{copy.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{copy.lead}</p>
          </div>
          <Button asChild variant="cta">
            <Link to="/" search={{ service: "esim" }} hash="finder"><Plus /> {copy.newTrip}</Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="grid gap-4">
            <div className="rounded-card border border-dashed border-border bg-card p-8 text-center sm:p-12">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-soft text-primary"><PlaneTakeoff /></span>
              <h2 className="mt-5 font-display text-xl font-bold">{copy.emptyTitle}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{copy.emptyText}</p>
              <div className="mt-6 flex justify-center"><Button asChild><Link to="/" search={{ service: "esim" }} hash="finder">{copy.start} <ArrowRight /></Link></Button></div>
            </div>
          </div>
          <aside className="rounded-card bg-secondary p-5">
            <h2 className="font-bold">{copy.side}</h2>
            <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <li className="flex gap-2"><MapPin className="size-5 shrink-0 text-primary" />{copy.items[0]}</li>
              <li className="flex gap-2"><CalendarDays className="size-5 shrink-0 text-primary" />{copy.items[1]}</li>
              <li className="flex gap-2"><Signal className="size-5 shrink-0 text-primary" />{copy.items[2]}</li>
              <li className="flex gap-2"><PlaneTakeoff className="size-5 shrink-0 text-primary" />{copy.items[3]}</li>
            </ul>
          </aside>
        </div>
      </section>
    </PublicShell>
  );
}
