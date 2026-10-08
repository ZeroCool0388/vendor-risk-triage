"use client";
import Link from "next/link";
import { ShieldCheck, Plus, Database, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkspaceVendor } from "@/lib/schema";
import { cn } from "@/lib/utils";
export function Sidebar({
  vendors,
  selected,
  onSelect,
  onNew,
  assessed,
}: {
  vendors: WorkspaceVendor[];
  selected: string;
  onSelect: (slug: string) => void;
  onNew: () => void;
  assessed: Set<string>;
}) {
  return (
    <aside className="vendor-sidebar" aria-label="Vendor workspace navigation">
      <Link href="/" className="brand" aria-label="VendorRisk Triage home">
        <span className="brand-mark">
          <ShieldCheck size={23} strokeWidth={1.8} />
        </span>
        <span>
          <span className="brand-name">VendorRisk</span>
          <span className="brand-subtitle block">Triage</span>
        </span>
      </Link>
      <div className="sidebar-heading">
        <span>VENDORS</span>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="New vendor"
          onClick={onNew}
        >
          <Plus />
        </Button>
      </div>
      <nav className="vendor-list">
        {vendors.map((v) => (
          <button
            key={v.slug}
            className={cn("vendor-option", v.slug === selected && "selected")}
            onClick={() => onSelect(v.slug)}
            aria-current={selected === v.slug ? "page" : undefined}
          >
            <span className="vendor-initials">
              {v.name
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")}
            </span>
            <span>
              <span className="vendor-option-name block">{v.name}</span>
              <span className="vendor-option-sector block">
                {v.sector.split(" / ")[0]}
              </span>
              <span className="vendor-option-status block">
                {assessed.has(v.slug)
                  ? "Assessed just now"
                  : v.preview
                    ? "Sample assessment ready"
                    : "Not assessed yet"}
              </span>
            </span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="synthetic-label">
          <Database size={14} />
          Synthetic demo data
        </div>
        <a
          href="https://github.com/ZeroCool0388"
          target="_blank"
          rel="noreferrer"
          className="portfolio-link"
        >
          <span className="vendor-initials">SG</span>
          <div>
            <strong>Steve Grady</strong>
            <span>Portfolio project</span>
          </div>
          <ArrowUpRight size={14} className="ml-auto" />
        </a>
      </div>
    </aside>
  );
}
