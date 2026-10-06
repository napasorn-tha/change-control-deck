import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpenCheck, Search } from "lucide-react";
import { PageHeader, Pill } from "@/components/cab/primitives";
import {
  DATA_TYPE_STANDARD_RULES,
  compareStandardType,
  findDataTypeStandards,
} from "@/lib/deployment-intelligence";

export const Route = createFileRoute("/_authenticated/standards")({
  head: () => ({
    meta: [
      { title: "Standards Knowledge — CAB360" },
      { name: "description", content: "Deterministic CAB reference checks for data type conventions." },
    ],
  }),
  component: StandardsPage,
});

function StandardsPage() {
  const [column, setColumn] = useState("");
  const [blendata, setBlendata] = useState("");
  const [vertica, setVertica] = useState("");
  const matches = useMemo(() => findDataTypeStandards(column), [column]);
  const primary = matches[0];

  return <div className="space-y-5">
    <PageHeader
      title="Standards Knowledge"
      subtitle="Deterministic reference rules from the CAB owner’s Data Type Quick Reference. AI may explain these rules, but does not redefine them."
    />

    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Quick standards check</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Enter a column name and, optionally, its current type. This is a prototype rule lookup—not a parser of SQL/DDL yet.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-xs font-medium">Column name
          <input className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={column} onChange={(e) => setColumn(e.target.value)} placeholder="e.g. TM_KEY_DAY" />
        </label>
        <label className="text-xs font-medium">Current Blendata type
          <input className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={blendata} onChange={(e) => setBlendata(e.target.value)} placeholder="e.g. INT" />
        </label>
        <label className="text-xs font-medium">Current Vertica type
          <input className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={vertica} onChange={(e) => setVertica(e.target.value)} placeholder="e.g. INT" />
        </label>
      </div>

      {!column.trim() ? (
        <p className="mt-4 text-sm text-muted-foreground">Type a column name to look up a deterministic reference.</p>
      ) : !primary ? (
        <div className="mt-4 rounded-md border border-warning/35 bg-warning/10 p-3 text-sm">
          No direct rule matched. Route this field to human review instead of letting AI invent a standard.
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{primary.label}</p>
            <Pill tone={blendata ? (compareStandardType(blendata, primary.blendata) === "match" ? "success" : "warning") : "neutral"}>
              Blendata {blendata ? compareStandardType(blendata, primary.blendata) : "reference"}
            </Pill>
            <Pill tone={vertica ? (compareStandardType(vertica, primary.vertica) === "match" ? "success" : "warning") : "neutral"}>
              Vertica {vertica ? compareStandardType(vertica, primary.vertica) : "reference"}
            </Pill>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
            <div><span className="text-xs text-muted-foreground">Blendata</span><p className="font-medium">{primary.blendata}</p></div>
            <div><span className="text-xs text-muted-foreground">Vertica</span><p className="font-medium">{primary.vertica}</p></div>
            <div><span className="text-xs text-muted-foreground">Oracle</span><p className="font-medium">{primary.oracle}</p></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{primary.characteristic}{primary.notes ? " · " + primary.notes : ""}</p>
          {matches.length > 1 && <p className="mt-2 text-xs text-muted-foreground">
            Multiple patterns matched: {matches.map((x) => x.label).join(", ")}. Human review wins if rules conflict.
          </p>}
        </div>
      )}
    </section>

    <section className="rounded-lg border border-border bg-card shadow-card">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Data Type Quick Reference</h2></div>
        <p className="mt-1 text-xs text-muted-foreground">Versioned reference used by the prototype rule layer. It is separate from CAB issue taxonomy and DEP issue taxonomy.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-5 py-3">Rule</th><th className="px-4 py-3">Characteristic</th><th className="px-4 py-3">Blendata</th><th className="px-4 py-3">Vertica</th><th className="px-4 py-3">Oracle</th></tr>
          </thead>
          <tbody>{DATA_TYPE_STANDARD_RULES.map((r) => <tr key={r.id} className="border-t border-border align-top">
            <td className="px-5 py-3 font-medium">{r.label}{r.notes && <p className="mt-1 max-w-xs text-xs font-normal text-muted-foreground">{r.notes}</p>}</td>
            <td className="px-4 py-3">{r.characteristic}</td>
            <td className="px-4 py-3 font-mono text-xs">{r.blendata}</td>
            <td className="px-4 py-3 font-mono text-xs">{r.vertica}</td>
            <td className="px-4 py-3 font-mono text-xs">{r.oracle}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </div>;
}
