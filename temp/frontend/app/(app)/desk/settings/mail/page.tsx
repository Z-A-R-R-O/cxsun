import dynamic from "next/dynamic";

const MailSettingsPage = dynamic(
  () =>
    import("../../../../../features/mail/interface/pages/mail-settings-page").then(
      (module) => module.MailSettingsPage,
    ),
  {
    loading: () => (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/95 px-4 py-3 text-sm text-muted-foreground shadow-lg shadow-black/5">
          <span className="size-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
          <span>Loading mail settings...</span>
        </div>
      </div>
    ),
  },
);

export default function SettingsMailPage() {
  return <MailSettingsPage />;
}
