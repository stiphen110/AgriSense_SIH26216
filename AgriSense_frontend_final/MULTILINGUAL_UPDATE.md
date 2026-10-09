# AgriSense multilingual frontend update

The frontend UI now supports a shared, switchable language state for:

- English
- Hindi (हिंदी)
- Gujarati (ગુજરાતી)

## What was changed

- Added shared `LanguageSwitcher` component.
- Connected public screens, Farmer App and Officer App to the same global language state.
- Added static UI translation coverage for the existing hard-coded Farmer/Officer/onboarding UI.
- Preserved backend/API values, crop names, disease names, pest names, medicine names and IDs so changing language does not alter application logic or database values.
- Preserved existing Bhashini translation/TTS flows for advisory/report content.
- Preserved existing scan, pest/disease/both, officer validation, reports, follow-up, Supabase and navigation flows.
- Preserved translated labels already present in `src/lib/i18n.ts`.

## Important

`node_modules` is intentionally excluded from this delivery archive. Run `npm install` in the project root before starting the Vite app.

The available uploaded dependency directory was incomplete in the working environment, so a full Vite production build could not be executed here. TypeScript syntax/static parsing was checked with the global compiler; remaining diagnostics were from the missing React/Node dependency type packages and pre-existing project typing issues, not syntax errors introduced by the multilingual changes.
