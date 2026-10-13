import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Info, Lock } from "lucide-react";
import { PANEL_COPY } from "@/components/account/panel-copy";
import { toast } from "sonner";

import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_COPY, formatDate } from "@/components/account/copy";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n";
import {
  getAccountSettings,
  updateNotificationPreferences,
} from "@/lib/customer-account.functions";


export function NotificationsPage() {
  const { locale } = useI18n();
  const copy = ACCOUNT_COPY[locale];
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["account-settings"],
    queryFn: () => getAccountSettings(),
    staleTime: 30_000,
  });
  const [marketing, setMarketing] = useState(false);
  const [tips, setTips] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    setMarketing(settings.data.notifications.marketingEmail);
    setTips(settings.data.notifications.productTipsEmail);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      updateNotificationPreferences({
        data: { marketingEmail: marketing, productTipsEmail: tips, source: "account-settings" },
      }),
    onSuccess: () => {
      toast.success(copy.notifications.saved);
      void queryClient.invalidateQueries({ queryKey: ["account-settings"] });
    },
    onError: () => toast.error(copy.notifications.error),
  });

  return (
    <AccountLayout active="notifications" title={copy.notifications.title}>
      <div className="grid gap-5 lg:max-w-2xl">
        <section className="rounded-2xl border border-border bg-secondary/50 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Lock className="size-4 text-primary" />
            {copy.notifications.essential}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {copy.notifications.essentialText}
          </p>
        </section>

        <p role="status" className="flex gap-2 rounded-xl bg-secondary p-3 text-sm leading-6 text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{PANEL_COPY[locale].emailOff}</span>
        </p>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <Toggle
            title={copy.notifications.marketing}
            text={copy.notifications.marketingText}
            checked={marketing}
            onChange={setMarketing}
          />
          <div className="my-4 h-px bg-border" />
          <Toggle
            title={copy.notifications.tips}
            text={copy.notifications.tipsText}
            checked={tips}
            onChange={setTips}
          />
          <Button
            className="mt-5 min-h-11"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {copy.notifications.save}
          </Button>
          {settings.data?.notifications.consentUpdatedAt && (
            <p className="mt-3 text-xs text-muted-foreground">
              {copy.notifications.consent}:{" "}
              {formatDate(settings.data.notifications.consentUpdatedAt, locale)}
            </p>
          )}
        </section>
      </div>
    </AccountLayout>
  );
}

function Toggle({
  title,
  text,
  checked,
  onChange,
}: {
  title: string;
  text: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}
