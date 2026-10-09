import { createFileRoute } from "@tanstack/react-router";
import { V2Shell, V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { CartContents } from "@/components/design-v2/CartContents";

export const Route = createFileRoute("/sepet")({
  head: () => ({ meta: [{ title: "Sepet | Pasaport.io" }, { name: "description", content: "Pasaport.io eSIM sepetiniz, paket adetleri ve doğrulanmış kupon özeti." }, { property: "og:title", content: "Sepet | Pasaport.io" }, { property: "og:description", content: "eSIM paketlerinizi ve sepet toplamınızı gözden geçirin." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: () => <V2Shell level="transaction" nav="cart"><CartContents /></V2Shell>,
});
