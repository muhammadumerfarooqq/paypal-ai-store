# Deploy skeleton (Day 1)

Webhooks need a **public HTTPS URL**.

## Render (suggested)

1. New **Web Service** → connect repo → root directory `backend`.
2. Build: `npm install` · Start: `npm start`.
3. Environment: copy variables from `.env` (not committed).
4. After deploy, set `PUBLIC_BASE_URL` to the Render URL and redeploy.
5. PayPal Developer → your app → **Webhooks** → URL  
   `https://<your-host>/api/webhooks/paypal`  
   Events: `PAYMENT.CAPTURE.COMPLETED` (and order events if you add them).
6. Copy webhook ID into `PAYPAL_WEBHOOK_ID`.

## Local webhooks while developing

Use [ngrok](https://ngrok.com): `ngrok http 3001`, set `PUBLIC_BASE_URL` to the ngrok HTTPS URL, register that URL in PayPal.

`GET https://<host>/api/webhooks/paypal` should return JSON confirming the route is up.
