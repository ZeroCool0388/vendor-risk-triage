import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
import type { Assessment } from "../schema";
import { scoreAssessment, findingScore } from "../scoring";
Font.registerHyphenationCallback((word) => [word]);
const styles = StyleSheet.create({
  page: {
    padding: 38,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#253244",
    lineHeight: 1.4,
    paddingBottom: 55,
  },
  brand: { lineHeight: 1.4, fontSize: 10, color: "#087f72", marginBottom: 12 },
  title: {
    lineHeight: 1.2,
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  meta: { lineHeight: 1.4, fontSize: 9, color: "#596779", marginBottom: 8 },
  score: {
    lineHeight: 1.2,
    fontSize: 22,
    color: "#087f72",
    marginVertical: 12,
  },
  heading: {
    fontSize: 14,
    lineHeight: 1.3,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 8,
  },
  subheading: {
    lineHeight: 1.3,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  block: { marginBottom: 12 },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: "#087f72",
    paddingLeft: 10,
    marginTop: 6,
    marginBottom: 6,
    fontSize: 9,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#dce3e8",
    paddingVertical: 6,
    fontSize: 9,
  },
  id: { width: "12%" },
  finding: { width: "48%" },
  severity: { width: "14%" },
  status: { width: "26%" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 38,
    right: 38,
    lineHeight: 1.2,
    fontSize: 8,
    color: "#697586",
  },
});
export function RiskReport({ assessment }: { assessment: Assessment }) {
  const scored = scoreAssessment(assessment.findings);
  return (
    <Document
      title={`${assessment.vendorName} risk assessment`}
      author="Steve Grady"
      subject="Synthetic vendor risk assessment"
    >
      <Page size="A4" style={styles.page}>
        <Text fixed style={styles.footer}>
          Synthetic demo data. Fictional companies. Not an audit or
          certification.
        </Text>
        <Text style={styles.brand}>VendorRisk / Triage</Text>
        <Text style={styles.title}>{assessment.vendorName}</Text>
        <Text style={styles.meta}>
          Generated {new Date(assessment.generatedAt).toISOString()} |{" "}
          {assessment.mode.label}
        </Text>
        <Text style={styles.score}>
          {scored.score}/100 — {scored.rating} risk
        </Text>
        <Text style={styles.meta}>
          Original score: {assessment.baselineScore} | Synthetic demo data.
          Fictional company. Not real.
        </Text>
        <Text minPresenceAhead={60} style={styles.heading}>
          Executive summary
        </Text>
        <Text>{assessment.executiveSummary}</Text>
        <Text minPresenceAhead={60} style={styles.heading}>
          Risk by domain
        </Text>
        {scored.breakdown.map((d) => (
          <Text key={d.domain}>
            {d.domain}:{" "}
            {d.assessed ? `${Math.round(d.score)}/100` : "Unassessed"} (weight{" "}
            {Math.round(d.weight * 100)}%)
          </Text>
        ))}
        <Text minPresenceAhead={60} style={styles.heading}>
          Risk findings
        </Text>
        <View style={styles.row}>
          <Text style={styles.id}>ID</Text>
          <Text style={styles.finding}>Finding</Text>
          <Text style={styles.severity}>Severity</Text>
          <Text style={styles.status}>Score / Status</Text>
        </View>
        {assessment.findings.map((f) => (
          <View key={f.id} style={styles.row} wrap={false}>
            <Text style={styles.id}>{f.id}</Text>
            <Text style={styles.finding}>
              {f.finding}
              {f.isGap ? " (Gap)" : ""}
            </Text>
            <Text style={styles.severity}>{f.severity}</Text>
            <Text style={styles.status}>
              {Math.round(findingScore(f))} / {f.status}
            </Text>
          </View>
        ))}
        <Text minPresenceAhead={60} style={styles.heading}>
          Evidence and analyst decisions
        </Text>
        {assessment.findings.map((f) => (
          <View key={f.id} style={styles.block}>
            <Text minPresenceAhead={45} style={styles.subheading}>
              {f.id} — {f.finding}
            </Text>
            <Text>
              {f.domain} | {f.severity} | {f.likelihood} | {f.status} | Original
              severity: {f.originalSeverity}
            </Text>
            <Text>{f.description}</Text>
            <Text>Why it matters: {f.whyItMatters}</Text>
            {f.isGap && (
              <Text>
                Evidence gap: supporting control evidence is missing or
                incomplete.
              </Text>
            )}
            {f.evidence.map((e, i) => (
              <View key={i}>
                <Text style={styles.meta}>
                  {assessment.documents.find((d) => d.id === e.docId)?.name ??
                    e.docId}{" "}
                  / {e.matchedLocation ?? e.location} /{" "}
                  {e.verified
                    ? e.match + " match"
                    : "UNVERIFIED — passage not located"}
                </Text>
                <Text style={styles.quote}>{e.quote}</Text>
                {e.match === "fuzzy" && (
                  <Text>Matched source text: {e.matchedQuote}</Text>
                )}
              </View>
            ))}
            {f.note && <Text>Analyst note: {f.note}</Text>}
          </View>
        ))}
        <Text minPresenceAhead={60} style={styles.heading}>
          Follow-up questions
        </Text>
        {scored.breakdown.map((d) => {
          const qs = assessment.followUps.filter((q) => q.domain === d.domain);
          return qs.length ? (
            <View key={d.domain} style={styles.block}>
              <Text minPresenceAhead={45} style={styles.subheading}>
                {d.domain}
              </Text>
              {qs.map((q) => (
                <Text key={q.findingId}>
                  {q.findingId}: {q.question}
                </Text>
              ))}
            </View>
          ) : null;
        })}
        <Text minPresenceAhead={60} style={styles.heading}>
          Documents reviewed
        </Text>
        {assessment.documents.map((d) => (
          <Text key={d.id}>
            {d.name} — {d.type}, {d.wordCount} words
            {d.pages ? `, ${d.pages} pages` : ""}
          </Text>
        ))}
        <View wrap={false}>
          <Text style={styles.heading}>Scoring methodology</Text>
          <Text>
            Finding risk = severity (1–4) × likelihood (1–4) / 16 × 100. Domain
            risk is the mean of its findings; overall risk is the weighted mean
            across assessed domains. Low 0–24, Medium 25–49, High 50–79,
            Critical 80–100. Mitigated findings score zero. Accepted risks
            retain their score. Unassessed domains are not assumed safe. This
            report is review support, not a vendor approval decision.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
export async function buildPDF(assessment: Assessment) {
  return pdf(<RiskReport assessment={assessment} />).toBlob();
}
