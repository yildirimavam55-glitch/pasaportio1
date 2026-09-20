import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TravelExperience } from "@/components/travel/TravelExperience";
import { normalizeService } from "@/domain/experience/state";

const searchSchema = z.object({
  service: z.enum(["esim", "lounge"]).catch("esim").default("esim"),
});

export const Route = createFileRoute("/")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "travely | eSIM & Airport Lounge" },
      {
        name: "description",
        content: "Seyahatiniz için eSIM ve havalimanı Lounge seçeneklerini tek yerde planlayın.",
      },
      { property: "og:title", content: "travely | eSIM & Airport Lounge" },
      {
        property: "og:description",
        content: "Seyahatiniz için eSIM ve Lounge seçeneklerini keşfedin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const service = normalizeService(search.service);

  return (
    <TravelExperience
      service={service}
      onServiceChange={(next, options) =>
        void navigate({
          to: ".",
          search: { service: next },
          hash: options?.finderTarget ? "finder" : undefined,
          replace: !options?.finderTarget,
          resetScroll: false,
        })
      }
    />
  );
}
