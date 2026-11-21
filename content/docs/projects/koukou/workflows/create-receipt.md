---

title: "Create a Receipt"
description: "Create a receipt and upload its document."
---

## What am I looking at?

This workflow creates a receipt, uploads its document to storage, and emits an
event after the upload is confirmed.

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant DB
    participant Storage

    Client->>Server: Create receipt
    Server->>DB: Insert receipt (status: created)
    DB-->>Server: receipt.id
    Server->>Storage: Request presigned upload URL for receipts/{id}
    Storage-->>Server: Presigned upload URL
    Server-->>Client: receipt.id and presigned URL

    Client->>Storage: Upload document to receipts/{id}
    Storage-->>Client: Upload response
    Client->>Server: Confirm document upload
    Server->>Storage: Check document exists

    alt Document exists
        Storage-->>Server: Document found
        Server->>DB: Set documentUri and status: uploaded
        Server-->>Client: Upload confirmed
        Server-->>Server: Emit koukou.receipt.uploaded
    else Document does not exist
        Storage-->>Server: Document not found
        Server->>DB: Set status: not-found
        Server-->>Client: Upload not found
    end
```

The upload confirmation is idempotent. Repeating it after the receipt is
`uploaded` or `not-found` does not create another state transition.

The `documentUri` stores the provider-neutral object key `receipts/{id}`. The
event contains the `receiptId`; processing the event is handled by a separate
workflow.
