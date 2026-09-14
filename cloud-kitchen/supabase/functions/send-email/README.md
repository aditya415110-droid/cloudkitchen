# send-email — SMTP relay Edge Function

Render's free web services block outbound traffic to SMTP ports 25, 465 and 587,
so the API server cannot reach Gmail directly. Supabase Edge Functions **do**
allow outbound SMTP on port 465, so this function accepts a message over HTTPS
(which Render permits) and performs the SMTP delivery itself.

```
Render API ──HTTPS──▶ this function ──SMTP:465──▶ Gmail ──▶ recipient
```

Port 465 only — 25 and 587 are blocked by the Deno runtime.

---

## Setup

Two routes: the Supabase dashboard (no CLI needed) or the CLI. Pick one.

### Dashboard route

1. Supabase dashboard → **Edge Functions** → **Deploy a new function** →
   *Via editor*. Name it exactly `send-email`.
2. Replace the template with the contents of `index.ts` from this folder, then
   **Deploy**.
3. Open the function → **Details/Settings** and turn **Verify JWT** *off*.
   Leaving it on also works: the API server sends the Supabase anon key as a
   bearer token, which satisfies verification. Either way the relay secret is
   what actually authorises the call.
4. **Project Settings → Edge Functions → Secrets** (or Edge Functions →
   Secrets): add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and
   `RELAY_SECRET` as in step 3 below.
5. Continue from "4. Point the API server at the relay".

### CLI route

Run everything from the `cloud-kitchen/` directory.

### 1. Sign in and link the project

```bash
npx supabase login
npx supabase link --project-ref mfkoksauazfzwfxcmknd
```

`link` prompts for the database password (Supabase dashboard → Settings →
Database). It is only used to link; the function itself never touches the DB.

### 2. Deploy

```bash
npx supabase functions deploy send-email
```

`verify_jwt = false` is already set for this function in `supabase/config.toml`,
because the caller is our API server, which has no end-user JWT to present. The
function authenticates callers with its own shared secret instead (step 3).

If the CLI asks for Docker, add `--use-api` to bundle remotely instead.

### 3. Set the function's secrets

```bash
npx supabase secrets set \
  SMTP_HOST=smtp.gmail.com \
  SMTP_PORT=465 \
  SMTP_USER=your-address@gmail.com \
  SMTP_PASSWORD=your16charapppassword \
  RELAY_SECRET=<long random string>
```

- `SMTP_PASSWORD` is a Gmail **App Password** (16 characters, no spaces), not
  the account password. Generate at <https://myaccount.google.com/apppasswords>.
- `RELAY_SECRET` is any long random string. Generate one with:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Verify they registered:

```bash
npx supabase secrets list
```

### 4. Point the API server at the relay

Set these on Render (and in `server/.env` for local use):

```
EMAIL_RELAY_URL=https://mfkoksauazfzwfxcmknd.supabase.co/functions/v1/send-email
EMAIL_RELAY_SECRET=<the same string as RELAY_SECRET>
EMAIL_FROM=CloudKitchen <your-address@gmail.com>
ADMIN_EMAILS=your-address@gmail.com
SERVER_URL=https://cloudkitchen-4zxz.onrender.com
```

`SERVER_URL` matters: order emails build the pickup-QR image URL from it.

The server picks the relay automatically when `EMAIL_RELAY_URL` and
`EMAIL_RELAY_SECRET` are both present. To force it, set `EMAIL_PROVIDER=relay`.

### 5. Test

Redeploy the API server, then open **Admin → Settings → Email Diagnostics** and
press **Send Test**. It reports the real outcome, including the raw error.

To test the function on its own:

```bash
curl -i -X POST \
  https://mfkoksauazfzwfxcmknd.supabase.co/functions/v1/send-email \
  -H "x-relay-secret: <RELAY_SECRET>" \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","subject":"Relay test","html":"<p>It works.</p>"}'
```

Expect `{"ok":true,"via":"smtp.gmail.com:465"}`.

---

## Security

The function is protected **only** by the `x-relay-secret` header, compared in
constant time. Anyone who learns both the URL and the secret can send mail as
your Gmail account, so treat `RELAY_SECRET` like a password and never commit it.

Rotate it by running `supabase secrets set RELAY_SECRET=<new>` and updating
`EMAIL_RELAY_SECRET` on Render — in that order, or sends fail in between.

## Request contract

```jsonc
{
  "to": "a@b.com",            // required; comma-separated for several
  "subject": "...",           // required
  "html": "...",              // required
  "from": "Name <a@b.com>",   // optional, defaults to SMTP_USER
  "replyTo": "c@d.com",       // optional
  "attachments": [            // optional
    { "filename": "qr.png", "contentType": "image/png", "contentBase64": "..." }
  ]
}
```

Responses: `200 {ok:true}`, `401` bad secret, `400` malformed body,
`500` function secrets missing, `502` SMTP delivery failed (`error` says why).

## Logs

```bash
npx supabase functions logs send-email
```

Or the dashboard: Edge Functions → send-email → Logs.

## Limits

Gmail allows roughly 500 messages/day and is not a transactional mail service,
so some mail to strangers may land in spam. Fine for launch; if volume grows,
switch to a real provider by setting `BREVO_API_KEY` or the Mailjet keys — the
server's provider abstraction handles the rest, no code change.
