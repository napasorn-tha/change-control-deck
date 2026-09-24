# AI Edge Function Scaffold

Function: `analyze-cab`

This function is intentionally separated from file parsing.

It expects normalised evidence text:

```json
{
  "request_id": "uuid",
  "evidence": [
    {
      "document_type": "mop_document",
      "file_name": "MOP.pdf",
      "text": "extracted text..."
    }
  ]
}
```

It then:

1. marks `ai_analyses.status = PROCESSING`
2. sends the normalised evidence package to Groq
3. requests strict JSON
4. persists executive summary, missing information, inconsistencies and risk signals
5. marks the row `COMPLETED` or `FAILED`

## Required secret

```text
GROQ_API_KEY
```

Optional:

```text
GROQ_MODEL=gpt-oss-120b
```

## Important

This scaffold is **not yet wired to raw CAB files**.

A parser/extraction layer still needs to convert PDF / Word / Excel files into bounded, provenance-preserving text/JSON before calling the function.

Do not upload real company documents to an external AI provider unless that use has been approved.
