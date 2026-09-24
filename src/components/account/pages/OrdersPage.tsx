import { CLink as Link } from "@/components/design-v2/v2-context";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_COPY, formatDate, formatMoney } from "@/components/account/copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { getCustomerOrders } from "@/lib/customer-account.functions";


export function OrdersPage() {
  const { locale } = useI18n();
  const copy = ACCOUNT_COPY[locale];
  const orders = useQuery({
    queryKey: ["customer-orders"],
    queryFn: () => getCustomerOrders(),
    staleTime: 60_000,
  });
  const rows = orders.data?.orders ?? [];

  return (
    <AccountLayout active="orders" title={copy.orders.title}>
      {orders.isError && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {copy.loadError}
        </p>
      )}
      {!rows.length && !orders.isLoading ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/45 px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">{copy.emptyOrders}</p>
          <Button asChild variant="cta" className="mt-4">
            <Link to="/" search={{ service: "esim" }} hash="finder">
              {copy.findEsim}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">#{order.orderNumber}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(order.createdAt, locale)}
                  </p>
                  <p className="mt-2 truncate text-sm">
                    {order.items
                      .map((item) =>
                        [item.destination, item.name].filter(Boolean).join(" · "),
                      )
                      .join(" | ") || "—"}
                  </p>
                </div>
                <div className="grid justify-items-end gap-2">
                  <strong>{formatMoney(order.total, order.currency, locale)}</strong>
                  <Badge variant="outline">{order.fulfillmentStatus}</Badge>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" className="min-h-11">
                  <Link to="/account/orders/$id" params={{ id: order.id }}>
                    {copy.detail}
                    <ChevronRight />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AccountLayout>
  );
}
