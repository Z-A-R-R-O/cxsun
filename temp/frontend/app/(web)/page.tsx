import Link from "next/link";
import { ArrowRight, Boxes, Network, ShieldCheck } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cxnext/ui";
import { SetupRedirect } from "../../features/setup/interface/components/setup-redirect";

const foundations = [
  { title: "Strict modules", detail: "Bounded contexts stay isolated and testable.", icon: Boxes },
  {
    title: "DDD ready",
    detail: "Domain, application, infrastructure, and interface layers are prepared.",
    icon: ShieldCheck,
  },
  {
    title: "Event-first",
    detail: "Internal events are in-process today and async-ready later.",
    icon: Network,
  },
] as const;

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
      <SetupRedirect />
      <section className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <p className="text-sm font-medium text-primary">cxnext foundation</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal md:text-5xl">
            Modular monolith platform shell for future domains.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            A production-grade starting point with governance, shared packages, and clean
            application surfaces.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/desk">
                Open desk
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/about">Architecture</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="grid gap-3">
            {foundations.map((item) => (
              <div key={item.title} className="flex gap-3 rounded-md bg-muted/50 p-4">
                <item.icon className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {foundations.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <item.icon className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
