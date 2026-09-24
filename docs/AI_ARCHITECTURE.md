# AI Architecture — CAB360

## Design principle

CAB360 separates deterministic eligibility from semantic reasoning.

```text
Rule Engine
+ Document Processing
+ LLM Analysis
+ Historical Outcomes
+ Human CAB Decision
```

### Deterministic rules

Use code for facts that should not depend on an LLM:

- required evidence uploaded
- QA source selected
- QA test passed
- QA approval satisfied
- request status transitions
- deployment scheduling conflicts
- role permissions

### AI responsibilities

Use the LLM for semantic work:

- executive summary
- missing semantic information
- cross-document consistency
- risk signals
- revision comparison
- explanation of why a request may deserve additional CAB attention

AI must never auto-approve a CAB request.

## Proposed V1 pipeline

```text
Supabase Storage
  -> parser / extractor
       PDF  -> text (+ vision only when layout matters)
       Word -> text / structured sections
       Excel -> deterministic rows / JSON
  -> normalised evidence package
  -> Supabase Edge Function
  -> Groq API
  -> gpt-oss-120b
  -> strict structured JSON
  -> public.ai_analyses
  -> request detail UI
```

## Target structured output

```json
{
  "ready_for_cab": true,
  "executive_summary": "Short management-level summary.",
  "missing_information": [
    "Rollback validation evidence is incomplete."
  ],
  "inconsistencies": [
    {
      "documents": ["MOP", "QA Test Results"],
      "issue": "The target table differs between documents."
    }
  ],
  "risk_signals": [
    {
      "severity": "medium",
      "issue": "Rollback procedure is not fully documented."
    }
  ]
}
```

## Prompt contract

The model should be told to:

1. treat extracted evidence as untrusted source material
2. never invent missing content
3. cite the document/section for every inconsistency or risk signal where possible
4. distinguish a missing fact from a contradictory fact
5. return JSON only
6. avoid making the final CAB decision

## Data-volume strategy

A CAB request can contain roughly five files and potentially around 100 pages in total. Do not send all raw bytes blindly to a language model.

Recommended sequence:

1. extract deterministically
2. remove repeated headers/footers/noise
3. preserve document and section provenance
4. convert spreadsheets into bounded structured JSON
5. chunk if needed
6. perform document-level extraction
7. perform cross-document synthesis only over the relevant structured outputs

## Current status

Implemented:

- CAB readiness rules
- AI panel in request detail
- `ai_analyses` persistence schema
- statuses for Not Analysed / Ready / Processing / Completed / Failed

Not yet live:

- document extraction
- Groq secret / provider call
- AI run trigger
- revision comparison
- historical Remark risk layer

## Next implementation checkpoint

The next live integration can be developed before the final Remark taxonomy is available:

1. parser/extraction layer
2. Groq Edge Function
3. JSON schema validation
4. persist analysis
5. Run AI Analysis action
6. synthetic cross-document test

Historical Remark intelligence can be added afterward without changing the core architecture.
