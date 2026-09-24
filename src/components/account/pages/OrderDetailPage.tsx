import { CLink as Link } from "@/components/design-v2/v2-context";
import { useQuery } from "@tanstack/react-query";

import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_COPY, formatDate, formatMoney } from "@/components/account/copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { getCustomerOrderDetail } from "@/lib/customer-account.functions";


export function OrderDetailPage({ id }: { id: string }) {
  const { locale } = useI18n();
  const copy = ACCOUNT_COPY[locale];
  const detail = useQuery({
    queryKey: ["customer-order-detail", id],
    queryFn: () => getCustomerOrderDetail({ data: { orderId: id } }),
    staleTime: 30_000,
  });

  if (detail.isLoading) {
    return (
      <AccountLayout active="orders" title={copy.orders.title}>
        <div className="h-48 animate-pulse rounded-2xl bg-secondary" />
      </AccountLayout>
    );
  }

  const order = detail.data?.order;
  if (!order) {
    return (
      <AccountLayout active="orders" title={copy.orders.title}>
        <div className="rounded-2xl border border-dashed border-border bg-secondary/45 px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">{copy.notFound}</p>
          <Button asChild className="mt-4">
            <Link to="/account/orders">{copy.orders.title}</Link>
          </Button>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout
      active="orders"
      title={`#${order.orderNumber}`}
      lead={formatDate(order.createdAt, locale)}
      actions={<Badge variant="outline">{order.status}</Badge>}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">{copy.orders.items}</h2>
          <ul className="mt-4 grid gap-3">
            {order.items.map((item) => (
              <li key={item.id} className="grid gap-1 border-b border-border/60 pb-3 last:border-b-0">
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[item.destination, `${copy.orders.quantity}: ${item.quantity}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="text-sm">
                  {formatMoney(item.salePrice, item.currency, locale)}
                  {item.discount > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {copy.orders.discount}: {formatMoney(item.discount, item.currency, locale)}
                    </span>
                  )}
                </p>
                <p className="text-xs font-semibold text-primary">{item.fulfillmentStatus}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside className="grid gap-4">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <dl className="grid gap-3 text-sm">
              <Row label={copy.orders.payment} value={order.paymentStatus} />
              <Row label={copy.orders.delivery} value={order.fulfillmentStatus} />
              {order.discountTotal > 0 && (
                <Row
                  label={copy.orders.discount}
                  value={formatMoney(order.discountTotal, order.currency, locale)}
                />
              )}
              <Row
                label={copy.orders.total}
                value={formatMoney(order.total, order.currency, locale)}
              />
            </dl>
          </section>
          {detail.data?.esims.length ? (
            <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-display text-lg font-bold">{copy.orders.esims}</h2>
              <div className="mt-3 grid gap-2">
                {detail.data.esims.map((esim) => (
                  <Button key={esim.id} asChild variant="outline" className="min-h-11 justify-start">
                    <Link to="/account/esims/$id" params={{ id: esim.id }}>
                      {esim.label || copy.viewEsim}
                    </Link>
                  </Button>
                ))}
              </div>
            </section>
          ) : null}
          <p className="px-1 text-xs text-muted-foreground">{copy.orders.noInvoice}</p>
        </aside>
      </div>
    </AccountLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <dt className="text-xs font-bold uppercase text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
