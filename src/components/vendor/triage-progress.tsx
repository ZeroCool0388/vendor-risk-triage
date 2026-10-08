"use client";
import { Check, LoaderCircle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
const steps = [
  "Parsing documents",
  "Extracting controls",
  "Scoring risks",
  "Drafting follow-ups",
];
export function TriageProgress({ step }: { step: number }) {
  return (
    <section className="progress-card" role="status" aria-live="polite">
      <Card>
        <CardHeader>
          <CardTitle>Turning evidence into a clear assessment.</CardTitle>
          <CardDescription>
            {steps[step]}
            {step === 3 ? " · Finalizing the review…" : "…"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="progress-steps">
            {steps.map((s, i) => (
              <div
                key={s}
                className={cn("progress-step", i <= step && "active")}
              >
                <span className="step-dot">
                  {i < step ? (
                    <Check size={13} />
                  ) : i === step ? (
                    <LoaderCircle size={13} className="animate-spin" />
                  ) : (
                    i + 1
                  )}
                </span>
                {s}
              </div>
            ))}
          </div>
          <Progress
            value={Math.min(95, (step + 1) * 24)}
            aria-label="Triage progress"
          />
          <div className="skeleton-overview mt-6">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
          <div className="flex flex-col gap-3 mt-5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
