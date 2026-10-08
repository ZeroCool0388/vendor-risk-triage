import { describe, it, expect, vi, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import { POST } from "../src/app/api/triage/route";
import { configuredMode } from "../src/lib/providers";
import { loadVendorIndex, loadMock } from "../src/lib/vendors";
import { AssessmentSchema } from "../src/lib/schema";
vi.mock("ai", () => ({ generateObject: vi.fn() }));
import { generateObject } from "ai";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
function demoEnv() {
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("LLM_PROVIDER", "openai");
}
function request(form: FormData) {
  return new Request("http://localhost/api/triage", {
    method: "POST",
    body: form,
  });
}
async function seeded(slug = "northwind-logistics") {
  const v = (await loadVendorIndex()).find((v) => v.slug === slug)!;
  const form = new FormData();
  form.set("vendorSlug", v.slug);
  form.set("vendorName", v.name);
  form.set("docIds", JSON.stringify(v.documents.map((d) => d.id)));
  return form;
}
describe("triage API", () => {
  it("runs all seeded vendors without keys", async () => {
    demoEnv();
    for (const slug of [
      "northwind-logistics",
      "apex-biolabs",
      "sterling-fintech",
    ]) {
      const res = await POST(request(await seeded(slug)));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.assessment.mode.kind).toBe("demo");
      expect(AssessmentSchema.safeParse(json.assessment).success).toBe(true);
    }
  });
  it("handles MD, TXT and genuine PDF uploads with real rule-based citations", async () => {
    demoEnv();
    const form = new FormData();
    form.set("vendorSlug", "custom-test");
    form.set("vendorName", "Fictional Test Ltd");
    form.set("docIds", "[]");
    form.append(
      "files",
      new File(["# Access\nMFA is optional for administrators."], "policy.md"),
    );
    form.append(
      "files",
      new File(
        ["RPO is 24 hours. The disaster recovery plan has never been tested."],
        "recovery.txt",
      ),
    );
    form.append(
      "files",
      new File(
        [
          await readFile(
            "data/vendors/apex-biolabs/security-questionnaire.pdf",
          ),
        ],
        "questionnaire.pdf",
      ),
    );
    const res = await POST(request(form));
    expect(res.status).toBe(200);
    const a = (await res.json()).assessment;
    expect(a.mode.kind).toBe("rule-based");
    expect(a.documents).toHaveLength(3);
    expect(
      a.findings.every((f: { evidence: { verified: boolean }[] }) =>
        f.evidence.every((e) => e.verified),
      ),
    ).toBe(true);
  });
  it("does not reuse full-pack fixtures after removing documents", async () => {
    demoEnv();
    const form = await seeded();
    form.set("docIds", JSON.stringify(["northwind-logistics-doc-1"]));
    const a = (await (await POST(request(form))).json()).assessment;
    expect(a.mode.kind).toBe("rule-based");
    expect(a.documents).toHaveLength(1);
  });
  it("rejects malformed IDs, no documents, extra documents and foreign IDs", async () => {
    demoEnv();
    for (const ids of [
      "not JSON",
      "[]",
      JSON.stringify(Array(6).fill("northwind-logistics-doc-1")),
      JSON.stringify(["../../etc/passwd"]),
    ]) {
      const form = await seeded();
      form.set("docIds", ids);
      expect((await POST(request(form))).status).toBeGreaterThanOrEqual(400);
    }
  });
  it.each(["openai", "anthropic"])(
    "exercises the %s live adapter with a controlled structured response",
    async (provider) => {
      demoEnv();
      vi.stubEnv("LLM_PROVIDER", provider);
      vi.stubEnv(
        provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY",
        "test-key-never-real",
      );
      vi.mocked(generateObject).mockResolvedValue({
        object: await loadMock("northwind-logistics"),
      } as never);
      const res = await POST(request(await seeded()));
      expect(res.status).toBe(200);
      const a = (await res.json()).assessment;
      expect(a.mode.kind).toBe("live");
      expect(a.mode.provider).toBe(provider);
      expect(generateObject).toHaveBeenCalledOnce();
      const args = vi.mocked(generateObject).mock.calls[0][0];
      expect(args.system).toContain("UNTRUSTED EVIDENCE");
      expect(args.abortSignal).toBeDefined();
    },
  );
  it("returns a safe provider error and offers explicit demo retry", async () => {
    demoEnv();
    vi.stubEnv("OPENAI_API_KEY", "test-key-never-real");
    vi.mocked(generateObject).mockRejectedValue(
      new Error("private-secret-request-details"),
    );
    const form = await seeded();
    const res = await POST(request(form));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error.canUseDemo).toBe(true);
    expect(JSON.stringify(json)).not.toContain("private-secret");
    form.set("forceDemo", "true");
    const retry = await POST(request(form));
    expect(retry.status).toBe(200);
    expect((await retry.json()).assessment.mode.kind).toBe("demo");
  });
  it("honors explicit provider selection and infers the configured key when unset", () => {
    expect(configuredMode({ ANTHROPIC_API_KEY: "fake" }).provider).toBe(
      "anthropic",
    );
    expect(
      configuredMode({ LLM_PROVIDER: "openai", ANTHROPIC_API_KEY: "fake" })
        .kind,
    ).toBe("demo");
    expect(() => configuredMode({ LLM_PROVIDER: "unsupported" })).toThrow(
      "LLM_PROVIDER",
    );
  });
});
