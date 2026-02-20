
## Root Cause Analysis

### What's Breaking Everything

The build error is the **single root cause** for the 500 error. The edge function cannot compile and therefore cannot deploy, so **every action** (create, status, disconnect, send-message) returns 500.

The error is at line 430 of `supabase/functions/whatsapp/index.ts`:

```
TS2339: Property 'base64' does not exist on type
  '{ state?: string | undefined; qrcode?: { base64?: string | undefined; } | undefined; }'
```

The code reads:
```ts
const qrBase64 = data?.qrcode?.base64 || data?.base64 || null;
```

The `WebhookRequest` interface defines `data` as:
```ts
data: {
  state?: string;
  qrcode?: {
    base64?: string;
  };
};
```

`data.base64` does not exist on this type. TypeScript rejects it, the function fails to compile, and every request returns 500 — including the `create` action that should generate the QR code.

### Why This Regression Happened

A previous edit introduced `data?.base64` as a fallback to handle different response structures from the Evolution API, but forgot to update the `WebhookRequest` interface to include the `base64` field at the top level of `data`. The interface and the code fell out of sync.

### Full Flow After Fix (Confirmed Working Architecture)

```text
User clicks "Gerar QR Code"
        │
        ▼
Frontend calls action: 'create'
        │
        ▼
handleCreate:
  1. Check instance state via /instance/connectionState/
  2. If state != 'open' → logout + delete stale instance → wait 1s
  3. POST /instance/create with webhook URL configured
  4. Evolution API creates instance and responds
  5. If QR code present in response → return it immediately
  6. If not → return { waiting: true } → frontend starts polling
        │
        ▼ (async, via webhook)
Evolution API sends QRCODE_UPDATED to /functions/v1/whatsapp
        │
        ▼
handleWebhook saves QR base64 to profiles.whatsapp_qr_code
        │
        ▼
Frontend polling calls action: 'status'
        │
        ▼
handleStatus reads QR from DB → returns it → QR displayed
```

### The Fix — One Line Change

**File:** `supabase/functions/whatsapp/index.ts`

**What to change:** Expand the `WebhookRequest` interface's `data` type to include the optional `base64` field at the top level, which the Evolution API sometimes sends directly (not nested under `qrcode`):

```ts
// BEFORE (line 24-29):
interface WebhookRequest {
  action: 'webhook';
  event: string;
  instance: string;
  data: {
    state?: string;
    qrcode?: {
      base64?: string;
    };
  };
}

// AFTER:
interface WebhookRequest {
  action: 'webhook';
  event: string;
  instance: string;
  data: {
    state?: string;
    base64?: string;           // ← ADD THIS LINE
    qrcode?: {
      base64?: string;
    };
  };
}
```

This makes the TypeScript type match the actual runtime code. No logic changes, no database changes, no frontend changes — just aligning the type declaration with the code that was already written.

### Technical Details

- **File changed:** `supabase/functions/whatsapp/index.ts` (1 line added to the interface)
- **No database changes needed** — `whatsapp_qr_code` column was already added in the previous migration
- **No frontend changes needed** — `useWhatsAppConnection.ts` is already correctly handling `waiting: true` and polling
- **No RLS changes needed**
- After the fix, the function will compile and deploy successfully, restoring the webhook-driven QR code flow for both João Vitor and André
