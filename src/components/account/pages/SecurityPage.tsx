import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Info, KeyRound, LogOut, Mail } from "lucide-react";
import { toast } from "sonner";

import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_COPY } from "@/components/account/copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";


export function SecurityPage() {
  const { locale } = useI18n();
  const copy = ACCOUNT_COPY[locale];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");

  const identity = useQuery({
    queryKey: ["auth-identity"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const providers = (data.user?.app_metadata?.["providers"] as string[] | undefined) ?? [];
      return { providers, email: data.user?.email ?? null };
    },
    staleTime: 60_000,
  });
  const providers = identity.data?.providers ?? [];
  const hasPassword = providers.length === 0 || providers.includes("email");

  const update = useMutation({
    mutationFn: async () => {
      if (next.length < 8) throw new Error(copy.security.tooShort);
      if (next !== repeat) throw new Error(copy.security.mismatch);
      const { error } = await supabase.auth.updateUser({
        password: next,
        // Signed-in changes may require the current password.
        ...(current ? { current_password: current } : {}),
      } as Parameters<typeof supabase.auth.updateUser>[0]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(copy.security.updated);
      setCurrent("");
      setNext("");
      setRepeat("");
    },
    onError: (error: Error) => toast.error(error.message || copy.security.error),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/", search: { service: "esim" }, replace: true });
  }

  return (
    <AccountLayout active="security" title={copy.nav.security}>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">{copy.security.title}</h2>
          {hasPassword ? (
            <div className="mt-4 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="current">{copy.security.current}</Label>
                <Input
                  id="current"
                  type="password"
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="next">{copy.security.next}</Label>
                <Input
                  id="next"
                  type="password"
                  value={next}
                  onChange={(event) => setNext(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="repeat">{copy.security.repeat}</Label>
                <Input
                  id="repeat"
                  type="password"
                  value={repeat}
                  onChange={(event) => setRepeat(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button
                className="min-h-11"
                disabled={update.isPending || !next || !repeat}
                onClick={() => update.mutate()}
              >
                <KeyRound />
                {copy.security.update}
              </Button>
            </div>
          ) : (
            <p className="mt-3 flex gap-2 rounded-xl bg-secondary p-3 text-sm leading-6 text-muted-foreground">
              <Info className="size-4 shrink-0 text-primary" />
              {copy.security.socialOnly}
            </p>
          )}
        </section>

        <section className="grid gap-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">{copy.security.methods}</h2>
            <ul className="mt-4 grid gap-2 text-sm">
              {providers.includes("google") && (
                <li className="flex min-h-11 items-center gap-3 rounded-xl bg-secondary px-3 font-semibold">
                  <span aria-hidden="true">G</span>
                  {copy.security.google}
                </li>
              )}
              {hasPassword && (
                <li className="flex min-h-11 items-center gap-3 rounded-xl bg-secondary px-3 font-semibold">
                  <Mail className="size-4 text-primary" />
                  {copy.security.emailMethod}
                </li>
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">{copy.security.sessionsTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.security.sessionsText}
            </p>
            <Button
              variant="ghost"
              className="mt-3 min-h-12 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void signOut()}
            >
              <LogOut />
              {copy.signOut}
            </Button>
          </div>
        </section>
      </div>
    </AccountLayout>
  );
}
