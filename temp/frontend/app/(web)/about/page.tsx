import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cxnext/ui";

const items = [
  "Single deployable backend with strict internal modules.",
  "Shared primitives for DDD, validation, events, config, and UI.",
  "AI governance rules for module boundaries and generated code.",
] as const;

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="text-3xl font-semibold tracking-normal">About cxnext</h1>
      <p className="mt-4 text-base leading-7 text-muted-foreground">
        cxnext is a platform foundation designed to let complex domains arrive later without
        reshaping the core.
      </p>
      <div className="mt-8 grid gap-4">
        {items.map((item) => (
          <Card key={item}>
            <CardHeader>
              <CardTitle className="text-base">{item}</CardTitle>
              <CardDescription>Foundation rule</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This rule keeps the repo scalable while business modules remain absent.
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
