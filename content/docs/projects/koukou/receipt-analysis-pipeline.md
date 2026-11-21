---

title: "Receipt Analysis Pipeline"
description: "Status: Draft"
---

Status: Draft

## What does the architecture look like?

```mermaid
flowchart LR
    Owner[Receipt owner]

    subgraph Koukou[Koukou web application]
        UI[Receipt UI]
        BFF[Authenticated BFF]
    end

    subgraph Boubou[Boubou NestJS application]
        subgraph Receipt[Receipt module]
            API[Receipt APIs]
            Extract[Receipt extraction]
        end
        Events[Events module]
        Files[Files library]
    end

    DB[(PostgreSQL)]
    S3[(S3 receipt images)]
    NATS[NATS JetStream]
    AI[AI image models]

    Owner --> UI
    UI --> BFF
    BFF -->|Receipt APIs| API

    UI -->|Upload image| S3
    API <--> DB
    Extract <--> DB
    API --> Files
    Extract --> Files
    Files --> S3
    Extract --> AI

    API --> Events
    Extract --> Events
    Events <--> NATS
    Events --> Extract
```

## What does the processing flow look like?

```mermaid
flowchart TD
    Create[Create receipt with a verified brand]
    Upload[Upload image and confirm]
    Uploaded[koukou.receipt.uploaded]
    CreateJob[Create extraction_job]
    LoadPrompt[Load brand.receiptExtractionPrompt]
    HasPrompt{prompt present?}
    Extract[Run AI extraction]
    Validate[Validate against schema]
    Store[Store data in extraction_job]
    Done[Emit koukou.receipt.extracted]
    Fail[Mark extraction_job failed]

    Create --> Upload
    Upload --> Uploaded
    Uploaded --> CreateJob
    CreateJob --> LoadPrompt
    LoadPrompt --> HasPrompt
    HasPrompt -->|No| Fail
    HasPrompt -->|Yes| Extract
    Extract --> Validate
    Validate -->|Invalid| Fail
    Validate -->|Valid| Store
    Store --> Done
```

The owner selects a verified brand when creating the receipt, so the pipeline
does not need to identify a brand. Upload confirmation emits
`koukou.receipt.uploaded`, which starts extraction. Extraction loads the brand's
`receiptExtractionPrompt`, runs the model, validates the output against the
extraction schema, computes receipt totals, and stores the result in its
`extraction_job`. See [extraction job](/docs/projects/koukou/extraction-job) for the contract.

Extraction fails when the brand has no configured extraction prompt or the model
output does not match the extraction schema. A failed run marks its
`extraction_job` as failed and emits nothing.

## What events are being emitted?

| Event                      | Producer                            | Consumer                    | When emitted                                                  |
| -------------------------- | ----------------------------------- | --------------------------- | ------------------------------------------------------------- |
| `koukou.receipt.uploaded`  | Receipt module (upload API)         | Receipt module (extraction) | The receipt image has been uploaded and confirmed.            |
| `koukou.receipt.extracted` | Receipt module (receipt extraction) | Future consumers            | Extraction succeeded and validated JSON is stored in its job. |

Events are thin notifications that carry only identifiers such as `receiptId` and
`jobId`. Payloads live in PostgreSQL job tables, not in the stream.

Automated brand detection is deferred. See
[automated brand detection](/docs/projects/koukou/backlog/overview).
