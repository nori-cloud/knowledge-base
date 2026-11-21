---

title: "Extraction Job"
description: "Status: Draft"
---

Status: Draft

## What It Means

An extraction job turns an uploaded receipt image into structured data. It reads
the image, runs the brand's extraction prompt through a vision model, validates
the result, computes receipt totals, and stores everything as one job record.

Because the model output is best-effort, validation guarantees the shape of the
data, not its correctness. No human review is part of the MVP.

## Inputs

- Receipt image in S3, resolved by `receipt.s3_key`
- `brand.receiptExtractionPrompt` for the receipt's verified brand
- The versioned extraction schema

The prompt is brand-specific and dynamic. It is responsible for making the model
output conform to the schema, including pricing and tax handling.

## Output

Stored in `extraction_job.data` as JSON:

```text
{
  date: string (ISO) | null,
  merchant: {
    name: string,
    abn: string | null,
    address: string | null,
    contactDetail: string | null
  },
  lineItems: [
    {
      name: string,
      qty: number,
      size: number | null,
      sizeUnit: string | null,
      price: number,
      priceType: "standard" | "bundled" | "special",
      gstFree: boolean
    }
  ],
  total: number,
  gstTotal: number
}
```

`lineItems` follow `lineItemSchema` in
`packages/boubou-client/src/schemas/receipt.ts`.

## Computed Values

`total` and `gstTotal` are computed by the pipeline, not returned by the model.

- `total = sum(lineItems.price)`
- `gstTotal = sum(price where not gstFree) / 11`

This formula assumes the canonical pricing basis. The brand prompt is responsible
for normalizing prices to that basis, so the pipeline does not need a per-receipt
inclusive/exclusive flag.

## Lifecycle

```text
queued -> running -> completed
                  \-> failed
```

- A retry inserts a new row with the next `attempt` and marks the previous row
  `superseded`.
- The current job is the highest `attempt`.

## Failure Modes

| Failure                        | Behavior                                  |
| ------------------------------ | ----------------------------------------- |
| Brand has no extraction prompt | Fail the job; no model call               |
| S3 image missing or unreadable | Fail the job                              |
| Model call fails               | Fail the job; raw error retained          |
| Output fails schema validation | Fail the whole job; raw response retained |

A failed job emits nothing. It can be retried by creating a new attempt.

## Events

- Consumes `koukou.receipt.uploaded`
- Emits `koukou.receipt.extracted` on success

Events carry only identifiers such as `receiptId` and `jobId`. The payload lives
in `extraction_job.data`, not in the stream.

## Storage

- `extraction_job.data` holds the validated output and computed totals.
- `extraction_job.raw_response` holds the original model response for diagnosis.
- The receipt itself stays lean. `receipt.purchasedAt` is not populated by the
  pipeline; date, total, and GST live in the job.

## Deferred

- Linking extracted merchant identity to a `business` record.
- Human review of extraction output.
- Job input snapshots and prompt versioning.
- An `extraction-failed` event.
