import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, Headphones, PackageCheck, Signal, WifiOff } from "lucide-react";

import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_COPY } from "@/components/account/copy";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { getCustomerAccount } from "@/lib/customer-account.functions";

export const Route = createFileRoute("/_authenticated/account/support")({
  head: () => ({
    meta: [
      { title: "Destek — Travely" },
      { name: "description", content: "eSIM kurulumu, bağlantı ve sipariş konularında yardım al." },
      { property: "og:title", content: "Destek — Travely" },
      {
        property: "og:description",
        content: "eSIM kurulumu, bağlantı ve sipariş konularında yardım al.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

type Topic = "install" | "connection" | "order" | "other";

function SupportPage() {
  const { locale } = useI18n();
  const copy = ACCOUNT_COPY[locale];
  const [topic, setTopic] = useState<Topic | null>(null);
  const account = useQuery({
    queryKey: ["customer-account"],
    queryFn: () => getCustomerAccount(),
    staleTime: 60_000,
  });

  const esim = account.data?.esims[0];
  const order = account.data?.orders[0];
  const reference = [
    order ? `#${order.order_number}` : null,
    esim ? esim.packageLabel || esim.destinationLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const topics: Array<{ key: Topic; label: string; icon: typeof BookOpen }> = [
    { key: "install", label: copy.support.install, icon: BookOpen },
    { key: "connection", label: copy.support.connection, icon: WifiOff },
    { key: "order", label: copy.support.order, icon: PackageCheck },
    { key: "other", label: copy.support.other, icon: Headphones },
  ];

  return (
    <AccountLayout active="support" title={copy.support.title} lead={copy.support.lead}>
      <div className="grid gap-5 lg:max-w-2xl">
        <div className="grid gap-2 sm:grid-cols-2">
          {topics.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              type="button"
              variant={topic === key ? "default" : "outline"}
              className="min-h-14 justify-start"
              aria-pressed={topic === key}
              onClick={() => setTopic(key)}
            >
              <Icon />
              {label}
            </Button>
          ))}
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-xs font-bold uppercase text-muted-foreground">
            {copy.support.reference}
          </h2>
          <p className="mt-2 text-sm font-semibold">{reference || copy.support.noReference}</p>

          {topic === "install" && esim && (
            <Button asChild variant="outline" className="mt-4 min-h-11">
              <Link to="/account/esims/$id" params={{ id: esim.id }}>
                <Signal />
                {copy.guide.title}
              </Link>
            </Button>
          )}
          {topic === "order" && order && (
            <Button asChild variant="outline" className="mt-4 min-h-11">
              <Link to="/account/orders/$id" params={{ id: order.id }}>
                <PackageCheck />
                {copy.detail}
              </Link>
            </Button>
          )}

          <Button asChild variant="cta" className="mt-4 min-h-11">
            <Link to="/" search={{ service: "esim" }} hash="support">
              <Headphones />
              {copy.support.contact}
            </Link>
          </Button>
        </section>
      </div>
    </AccountLayout>
  );
}
