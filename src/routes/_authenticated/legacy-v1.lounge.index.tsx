import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TravelExperience } from "@/components/travel/TravelExperience";

export const Route = createFileRoute("/_authenticated/legacy-v1/lounge/")({
  head: () => ({
    meta: [
      { title: "Airport Lounge | travely" },
      {
        name: "description",
        content: "Havalimanı, tarih ve uçuş durumuna göre Lounge seçiminizi planlayın.",
      },
      { property: "og:title", content: "Airport Lounge | travely" },
      { property: "og:description", content: "Uçuşunuza uygun Lounge seçeneklerini planlayın." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  return (
    <TravelExperience
      service="lounge"
      onServiceChange={(service) =>
        void navigate({
          to: service === "esim" ? "/esim" : "/lounge",
          resetScroll: false,
        })
      }
    />
  );
}
