# funsite123
photobooth

## Smile detection

Set `FACE_API_KEY` and `FACE_API_SECRET` as Vercel project environment variables for each deployment environment, then redeploy. The browser sends the captured image to `/api/detect-smile`; the Face++ credentials stay in the Vercel function.

For local testing, run `vercel env pull .env.local` and `vercel dev`. Do not commit `.env.local` or `keys.env`.
