import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TravelExperience } from "@/components/travel/TravelExperience";

export const Route = createFileRoute("/esim/")({
  head: () => ({
    meta: [
      { title: "Seyahat eSIM’i | travely" },
      {
        name: "description",
        content: "Tek destinasyon ve çoklu rota için eSIM ihtiyacınızı planlayın.",
      },
      { property: "og:title", content: "Seyahat eSIM’i | travely" },
      { property: "og:description", content: "Seyahatinize uygun eSIM seçimini planlayın." },
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
      service="esim"
      onServiceChange={(service) =>
        void navigate({
          to: service === "esim" ? "/esim" : "/lounge",
          resetScroll: false,
        })
      }
    />
  );
}
