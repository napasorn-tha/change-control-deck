import { createFileRoute, Link } from "@tanstack/react-router";
import { FileStack, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { openStoredFile, useAllDocuments } from "@/lib/data";
import { DOC_TYPES, fmtDateTime, statusLabel } from "@/lib/cab";
import {
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  Pill,
} from "@/components/cab/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documents — CAB360" },
      {
        name: "description",
        content: "CAB360 document repository and submission status.",
      },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const documents = useAllDocuments();
  const [openingId, setOpeningId] = useState<string | null>(null);

  if (documents.isLoading) {
    return <Loading label="Loading documents…" />;
  }

  if (documents.error) {
    return <ErrorState error={documents.error} />;
  }

  const rows = documents.data ?? [];

  async function handleOpen(id: string, path: string | null) {
    if (!path) return;

    setOpeningId(id);

    try {
      await openStoredFile(path);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not open document",
      );
    } finally {
      setOpeningId(null);
    }
  }

  function documentLabel(value: string) {
    return DOC_TYPES.find((item) => item.value === value)?.label ?? value;
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={`${rows.length} document record(s) across CAB requests`}
      />

      {rows.length === 0 ? (
        <Empty
          title="No documents found"
          body="CAB documents will appear here after they are created or uploaded."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <FileStack className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">
                CAB Document Repository
              </h2>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Required submissions, review status and supporting files for CAB
              requests.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">CAB Request</th>
                  <th className="px-4 py-3">Topic</th>
                  <th className="px-4 py-3">Document Type</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Review Status</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3">Comment</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-border hover:bg-surface"
                  >
                    <td className="px-5 py-3">
                      {item.cab_requests?.request_code ? (
                        <Link
                          to="/requests/$id"
                          params={{ id: item.request_id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {item.cab_requests.request_code}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="max-w-xs px-4 py-3">
                      {item.cab_requests?.topic ?? "—"}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {documentLabel(item.doc_type)}
                    </td>

                    <td className="max-w-xs px-4 py-3">
                      {item.file_name ? (
                        <span className="break-all">{item.file_name}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          Not uploaded
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <Pill
                        tone={
                          item.review_status === "approved"
                            ? "success"
                            : item.review_status === "missing"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {item.review_status}
                      </Pill>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {item.uploaded_at
                        ? fmtDateTime(item.uploaded_at)
                        : "—"}
                    </td>

                    <td className="max-w-sm px-4 py-3 text-muted-foreground">
                      {item.comment ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      {item.file_path ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={openingId === item.id}
                          onClick={() =>
                            void handleOpen(item.id, item.file_path)
                          }
                        >
                          <ExternalLink className="mr-1.5 h-4 w-4" />
                          {openingId === item.id ? "Opening…" : "Open"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No file
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}