"use client";
import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Link as LinkIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Choice, SeverityBadge } from "./controls";
import { domains, severities, type AssessedFinding } from "@/lib/schema";
import { findingScore, framework } from "@/lib/scoring";
export function FindingsTable({
  findings,
  onOpen,
}: {
  findings: AssessedFinding[];
  onOpen: (id: string) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const columns = useMemo<ColumnDef<AssessedFinding>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: (i) => (
          <span className="text-muted-foreground">{i.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "domain",
        header: "Domain",
        cell: (i) => (
          <span className="domain-cell block">{i.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "finding",
        header: "Finding",
        cell: (i) => (
          <span className="finding-cell block">
            <Button
              variant="finding"
              size="row"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(i.row.original.id);
              }}
            >
              {i.getValue<string>()}
            </Button>
            {i.row.original.isGap && (
              <Badge variant="outline" className="gap-tag">
                Gap
              </Badge>
            )}
          </span>
        ),
      },
      {
        accessorKey: "severity",
        header: "Severity",
        sortingFn: (a, b) =>
          framework.severity[a.original.severity] -
          framework.severity[b.original.severity],
        cell: (i) => <SeverityBadge severity={i.row.original.severity} />,
      },
      {
        accessorKey: "likelihood",
        header: "Likelihood",
        sortingFn: (a, b) =>
          framework.likelihood[a.original.likelihood] -
          framework.likelihood[b.original.likelihood],
        cell: (i) => (
          <span className="text-muted-foreground">{i.getValue<string>()}</span>
        ),
      },
      {
        id: "score",
        accessorFn: (f) => findingScore(f),
        header: "Score",
        cell: (i) => (
          <span className="font-medium tabular-nums">
            {Math.round(i.getValue<number>())}
          </span>
        ),
      },
      {
        id: "evidence",
        header: "Evidence",
        enableSorting: false,
        cell: (i) => {
          const f = i.row.original;
          const verified =
            f.evidence.length > 0 && f.evidence.every((e) => e.verified);
          return (
            <span
              className={
                verified ? "evidence-label" : "evidence-label unverified"
              }
            >
              {verified ? <LinkIcon size={12} /> : <AlertCircle size={12} />}{" "}
              {verified
                ? `${f.evidence.length} verified`
                : f.evidence.length
                  ? "Unverified"
                  : "Gap"}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (i) => (
          <span className="status-label">
            {i.row.original.status === "Mitigated" ? (
              <CheckCircle2 size={12} />
            ) : (
              <Clock size={12} />
            )}{" "}
            {i.getValue<string>()}
          </span>
        ),
      },
    ],
    [onOpen],
  );
  // TanStack Table v8 intentionally stays outside React Compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: findings,
    columns,
    state: { sorting, columnFilters: filters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  return (
    <section className="finding-panel" aria-label="Risk findings">
      <div className="findings-toolbar">
        <h2>
          Risk findings<span>{findings.length} findings</span>
        </h2>
        <div className="table-filters">
          <Choice
            label="Filter by severity"
            value={String(
              table.getColumn("severity")?.getFilterValue() ?? "all",
            )}
            onChange={(v) =>
              table
                .getColumn("severity")
                ?.setFilterValue(v === "all" ? undefined : v)
            }
            options={[
              { value: "all", label: "All severities" },
              ...severities.map((s) => ({ value: s, label: s })),
            ]}
          />
          <Choice
            label="Filter by domain"
            value={String(table.getColumn("domain")?.getFilterValue() ?? "all")}
            onChange={(v) =>
              table
                .getColumn("domain")
                ?.setFilterValue(v === "all" ? undefined : v)
            }
            options={[
              { value: "all", label: "All domains" },
              ...domains.map((d) => ({ value: d, label: d })),
            ]}
          />
        </div>
      </div>
      <div
        className="table-container"
        tabIndex={0}
        role="region"
        aria-label="Scrollable risk findings table"
      >
        <table className="risk-table">
          <thead>
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => (
                  <th
                    key={h.id}
                    scope="col"
                    aria-sort={
                      h.column.getIsSorted() === "asc"
                        ? "ascending"
                        : h.column.getIsSorted() === "desc"
                          ? "descending"
                          : "none"
                    }
                  >
                    {h.column.getCanSort() ? (
                      <button
                        onClick={h.column.getToggleSortingHandler()}
                        className="sort-control"
                        aria-label={`Sort by ${h.column.columnDef.header}`}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <ArrowUpDown size={9} />
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={() => onOpen(row.original.id)}>
                {row.getVisibleCells().map((c) => (
                  <td key={c.id}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {table.getRowModel().rows.length === 0 && (
          <p className="no-results">
            No findings match these filters. Choose all severities or all
            domains.
          </p>
        )}
      </div>
      <div className="table-footer">
        <span>
          {table.getRowModel().rows.length} of {findings.length} findings ·
          Select a finding to review evidence
        </span>
        <span>Analyst decisions stay in this browser</span>
      </div>
    </section>
  );
}
