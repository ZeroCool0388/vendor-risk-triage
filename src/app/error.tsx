"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">
          The workspace could not load.
        </h1>
        <p className="text-muted-foreground">
          Please retry. If this continues, check the server configuration and
          confirm that the sample document pack is available.
        </p>
        <Button onClick={reset}>Reload workspace</Button>
      </div>
    </main>
  );
}
