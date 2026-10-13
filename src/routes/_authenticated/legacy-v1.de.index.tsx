import { SITE_URL } from "@/domain/seo/paths";
import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { TravelExperience } from "@/components/travel/TravelExperience";
import { normalizeService } from "@/domain/experience/state";
import { useI18n } from "@/i18n";

const searchSchema = z.object({
  service: z.enum(["esim", "lounge"]).catch("esim").default("esim"),
});

export const Route = createFileRoute("/_authenticated/legacy-v1/de/")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Travely Deutschland | eSIM und Flughafen-Lounges" },
      {
        name: "description",
        content: "Entdecke eSIM-Tarife und Flughafen-Lounges für deine Reise.",
      },
      { property: "og:title", content: "Travely Deutschland | eSIM und Flughafen-Lounges" },
      {
        property: "og:description",
        content: "Entdecke eSIM-Tarife und Flughafen-Lounges für deine Reise.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/de` }],
  }),
  component: GermanHomepage,
});

function GermanHomepage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { locale, setLocale } = useI18n();
  const service = normalizeService(search.service);

  useEffect(() => {
    if (locale !== "de") setLocale("de");
  }, [locale, setLocale]);

  return (
    <TravelExperience
      service={service}
      onServiceChange={(next, options) => {
        if (options?.finderTarget) {
          void navigate({
            to: ".",
            search: { service: next },
            hash: "finder",
            resetScroll: false,
          });
          return;
        }
        void navigate({
          to: ".",
          search: { service: next },
          replace: true,
          resetScroll: false,
        });
      }}
    />
  );
}