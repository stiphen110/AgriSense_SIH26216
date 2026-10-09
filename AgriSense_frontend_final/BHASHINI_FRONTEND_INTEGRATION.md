# AgriSense frontend – Bhashini integration

The frontend calls the AgriSense backend, not Bhashini directly.

Backend base URL is configured in `src/lib/agrisense.ts`:
`http://127.0.0.1:8000`

Bhashini client:
- `src/lib/bhashini.ts`
- `POST /bhashini/speak`
- Sends `text`, `source_language`, `target_language`, `gender` as form data.
- Receives `translated_text` and `audio_base64`.
- Converts the base64 WAV to a browser Blob URL.

Audio is wired into:
1. Farmer IPM / Recommended Action Plan
2. Farmer final report / Report Details

The Bhashini API key is NOT stored in the frontend.
