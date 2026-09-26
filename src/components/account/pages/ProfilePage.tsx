import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_COPY } from "@/components/account/copy";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOCALES, type Locale } from "@/domain/enums";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  getAccountSettings,
  requestAccountDeletion,
  updateCustomerProfile,
} from "@/lib/customer-account.functions";
import { localize } from "@/i18n/overlay";


const LOCALE_LABELS: Record<Locale, string> = localize({ tr: "Türkçe", de: "Deutsch", en: "English" });

export function ProfilePage() {
  const { locale, setLocale } = useI18n();
  const copy = ACCOUNT_COPY[locale];
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["account-settings"],
    queryFn: () => getAccountSettings(),
    staleTime: 30_000,
  });

  const [fullName, setFullName] = useState("");
  const [countryIso, setCountryIso] = useState("");
  const [preferred, setPreferred] = useState<Locale>(locale);
  const [newEmail, setNewEmail] = useState("");
  const [deleteStep, setDeleteStep] = useState(0);

  useEffect(() => {
    if (!settings.data) return;
    setFullName(settings.data.profile.fullName ?? "");
    setCountryIso(settings.data.profile.countryIso ?? "");
    setPreferred(settings.data.profile.preferredLocale as Locale);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      updateCustomerProfile({
        data: { fullName, countryIso: countryIso.toUpperCase(), preferredLocale: preferred },
      }),
    onSuccess: () => {
      toast.success(copy.profile.saved);
      setLocale(preferred);
      void queryClient.invalidateQueries({ queryKey: ["account-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["customer-account"] });
    },
    onError: () => toast.error(copy.profile.saveError),
  });

  const changeEmail = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(copy.profile.emailSent);
      setNewEmail("");
    },
    onError: (error: Error) => toast.error(error.message || copy.profile.saveError),
  });

  const deletion = useMutation({
    mutationFn: () => requestAccountDeletion({ data: {} }),
    onSuccess: (result) => {
      toast.success(result.alreadyRequested ? copy.profile.deletePending : copy.profile.deleteRequested);
      setDeleteStep(0);
      void queryClient.invalidateQueries({ queryKey: ["account-settings"] });
    },
    onError: () => toast.error(copy.profile.saveError),
  });

  const pendingDeletion = settings.data?.deletionRequest?.status;

  return (
    <AccountLayout active="profile" title={copy.nav.profile}>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">{copy.profile.title}</h2>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="fullName">{copy.profile.fullName}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="country">{copy.profile.country}</Label>
              <Input
                id="country"
                value={countryIso}
                maxLength={2}
                onChange={(event) => setCountryIso(event.target.value.toUpperCase())}
                autoComplete="country"
              />
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">{copy.profile.language}</span>
              <div className="grid grid-cols-3 gap-2">
                {LOCALES.map((code) => (
                  <Button
                    key={code}
                    type="button"
                    variant={preferred === code ? "default" : "outline"}
                    className="min-h-11"
                    aria-pressed={preferred === code}
                    onClick={() => setPreferred(code)}
                  >
                    {LOCALE_LABELS[code]}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              className="min-h-11"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              {copy.profile.save}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">{copy.profile.emailTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{copy.profile.emailText}</p>
          <p className="mt-4 text-sm">
            <span className="text-muted-foreground">{copy.profile.email}: </span>
            <strong className="break-all">{settings.data?.profile.email ?? "—"}</strong>
          </p>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="newEmail">{copy.profile.newEmail}</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={!newEmail.includes("@") || changeEmail.isPending}
              onClick={() => changeEmail.mutate()}
            >
              {copy.profile.sendVerification}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <h2 className="font-display text-lg font-bold">{copy.profile.manage}</h2>
          <h3 className="mt-4 text-xs font-bold uppercase text-muted-foreground">
            {copy.profile.privacy}
          </h3>
          <p className="mt-3 flex gap-2 rounded-xl bg-secondary p-3 text-xs leading-5 text-muted-foreground">
            <ShieldAlert className="size-4 shrink-0 text-primary" />
            {copy.profile.deleteText}
          </p>
          {pendingDeletion === "REQUESTED" || pendingDeletion === "IN_REVIEW" ? (
            <p className="mt-4 rounded-xl border border-warning/30 bg-accent-soft p-4 text-sm font-semibold">
              {copy.profile.deletePending}
            </p>
          ) : (
            <AlertDialog onOpenChange={(open) => !open && setDeleteStep(0)}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="mt-4 min-h-12 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 />
                  {copy.profile.deleteTitle}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="mx-4 w-[calc(100%-2rem)] rounded-2xl sm:mx-0 sm:w-full">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {deleteStep === 0 ? copy.profile.deleteLead : copy.profile.deleteFinal}
                  </AlertDialogTitle>
                  <AlertDialogDescription>{copy.profile.deleteText}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{copy.profile.cancel}</AlertDialogCancel>
                  {deleteStep === 0 ? (
                    <AlertDialogAction
                      onClick={(event) => {
                        event.preventDefault();
                        setDeleteStep(1);
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {copy.profile.deleteConfirm}
                    </AlertDialogAction>
                  ) : (
                    <AlertDialogAction
                      disabled={deletion.isPending}
                      onClick={(event) => {
                        event.preventDefault();
                        deletion.mutate();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {copy.profile.deleteConfirm}
                    </AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </section>
      </div>
    </AccountLayout>
  );
}
