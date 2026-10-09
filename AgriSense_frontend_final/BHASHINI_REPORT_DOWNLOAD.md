# AgriSense — Bhashini Regional Report Feature

## Added
- Full report translation through the AgriSense backend `/bhashini/translate` endpoint.
- Hindi and Gujarati report preview on the Farmer → My Reports → Report Details screen.
- Regional-language report download as UTF-8 `.txt`, preserving Hindi/Gujarati characters.
- Existing Bhashini report audio remains available through `/bhashini/speak`.
- Existing IPM/advisory audio remains available through `/bhashini/speak`.

## Frontend locations
- `src/lib/bhashini.ts` — Bhashini translation + speech API helpers.
- `src/farmer/FarmerApp.tsx` — report translation, preview, download, and audio UI.

## Required backend
Run the AgriSense FastAPI backend on `http://127.0.0.1:8000` with Bhashini configured in its backend `.env`:
- `BHASHINI_INFERENCE_API_KEY`
- `BHASHINI_TRANSLATION_SERVICE_ID`
- `BHASHINI_TTS_SERVICE_ID`

No Bhashini API key is placed in the frontend.

## Verification
- TypeScript check: PASS (`tsc --noEmit`).
- Production Vite build was attempted, but the supplied container's Vite/Rolldown native optional dependency is missing, so a clean production build could not be completed in this environment. This is an environment/dependency issue, not a TypeScript error.
- The frontend is packaged without `node_modules`; run `npm install` (or `npm ci`) on the target machine before `npm run dev` / `npm run build`.
