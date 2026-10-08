"use client";
import { useState, useRef, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { Info, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import type { Assessment } from "@/lib/schema";
import { scoreAssessment, rating, framework } from "@/lib/scoring";
function useAnimatedScore(target: number) {
  const [displayed, setDisplayed] = useState(target);
  const previous = useRef(target);
  useEffect(() => {
    if (previous.current === target) return;
    const from = previous.current;
    let frame: number;
    const started = performance.now();
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : 280;
    const tick = (now: number) => {
      const fraction = duration ? Math.min(1, (now - started) / duration) : 1;
      const next = Math.round(
        from + (target - from) * (1 - Math.pow(1 - fraction, 3)),
      );
      previous.current = next;
      setDisplayed(next);
      if (fraction < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return displayed;
}
export function Overview({ assessment }: { assessment: Assessment }) {
  const score = scoreAssessment(assessment.findings);
  const color = `var(--${score.rating.toLowerCase()}-signal)`;
  const displayedScore = useAnimatedScore(score.score);
  return (
    <div className="overview-grid">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Overall risk score
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="How is this scored?"
                >
                  <Info />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="score-explainer">
                  <h3>How is this scored?</h3>
                  <p>
                    Severity × likelihood ÷ 16 × 100 gives each finding a score.
                    Each scale runs from 1 to 4.
                  </p>
                  <p>
                    We average findings within each domain, then take a weighted
                    average across assessed domains.
                  </p>
                  <p>
                    Accepted risks stay in the score. Mitigated risks contribute
                    zero. An unassessed domain is not assumed safe.
                  </p>
                  <p>Low 0–24 · Medium 25–49 · High 50–79 · Critical 80–100.</p>
                  <p>
                    {framework.domains
                      .map((d) => `${d.name}: ${Math.round(d.weight * 100)}%`)
                      .join(" · ")}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gauge-layout">
            <div
              className="gauge-wrap"
              role="img"
              aria-label={`Overall risk score ${score.score} out of 100, ${score.rating}`}
            >
              <PieChart width={128} height={128}>
                <Pie
                  data={[{ value: score.score }, { value: 100 - score.score }]}
                  dataKey="value"
                  cx={59}
                  cy={59}
                  innerRadius={49}
                  outerRadius={57}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  isAnimationActive={false}
                  cornerRadius={5}
                >
                  <Cell fill={color} />
                  <Cell fill="var(--chart-track)" />
                </Pie>
              </PieChart>
              <span className="sr-only" role="status">
                Risk score {score.score} out of 100
              </span>
              <span
                className={`gauge-number risk-color-${score.rating.toLowerCase()}`}
                data-testid="overall-score"
                aria-hidden="true"
              >
                {displayedScore}
              </span>
            </div>
            <div>
              <p
                className={`risk-word risk-color-${score.rating.toLowerCase()}`}
              >
                {score.assessedDomains ? `${score.rating} risk` : "Unassessed"}
              </p>
              <p className="risk-description">
                {score.score >= 50
                  ? "Resolve material findings before approval."
                  : "Targeted follow-up and analyst review required."}
              </p>
            </div>
          </div>
          <p className="score-caption">
            {score.score !== assessment.baselineScore
              ? `Original ${assessment.baselineScore} → adjusted ${score.score}`
              : "0–100 · higher means more risk"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Executive summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="summary-copy">{assessment.executiveSummary}</p>
          <p className="summary-footer">
            <ShieldCheck size={13} />
            {assessment.findings.reduce(
              (n, f) => n + f.evidence.filter((e) => e.verified).length,
              0,
            )}{" "}
            source passages verified
          </p>
        </CardContent>
      </Card>
      <Card className="domain-card">
        <CardHeader>
          <CardTitle>Risk by domain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="domain-chart" aria-label="Risk breakdown by domain">
            {score.breakdown.map((d) => (
              <div key={d.domain} className="domain-row">
                <span className="domain-label" title={d.domain}>
                  {d.domain}
                </span>
                <span
                  className="domain-track"
                  role="meter"
                  aria-label={d.domain}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(d.score)}
                  aria-valuetext={
                    d.assessed
                      ? `${Math.round(d.score)} out of 100`
                      : "Unassessed"
                  }
                >
                  <ResponsiveContainer
                    width="100%"
                    height={7}
                    initialDimension={{ width: 100, height: 7 }}
                  >
                    <BarChart
                      data={[{ score: d.assessed ? d.score : 0 }]}
                      layout="vertical"
                      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                      accessibilityLayer={false}
                    >
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis type="category" hide />
                      <Bar
                        dataKey="score"
                        barSize={7}
                        radius={3}
                        fill={`var(--${rating(d.score).toLowerCase()}-signal)`}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </span>
                <span className="domain-number">
                  {d.assessed ? Math.round(d.score) : "—"}
                </span>
              </div>
            ))}
          </div>
          <p className="domain-footnote">
            {score.assessedDomains}/7 domains with findings · — unassessed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
