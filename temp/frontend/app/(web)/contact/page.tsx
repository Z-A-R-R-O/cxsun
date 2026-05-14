import { Mail, MessageSquare } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@cxnext/ui";

export default function ContactPage() {
  return (
    <section className="mx-auto grid max-w-5xl gap-6 px-5 py-12 md:grid-cols-[0.8fr_1.2fr]">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Contact</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Use this sample surface to validate the web layout. No message handling is wired yet.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Foundation inquiry</CardTitle>
          <CardDescription>Static form for layout readiness.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" type="email" placeholder="you@company.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact-message">Message</Label>
            <Input id="contact-message" placeholder="How can cxnext help?" />
          </div>
          <Button type="button" className="w-fit">
            <Mail />
            Send
          </Button>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Sample only. Add a module before real submission logic.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
