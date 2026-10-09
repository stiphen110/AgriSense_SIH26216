# MASTER PROMPT — AGRISENSE UI/UX UPGRADE WITHOUT BREAKING FUNCTIONALITY

> **[AGENT SWARM SYSTEM CONTEXT]**
> **TARGET AUDIENCE:** All Anti-Gravity Sub-Agents (Architect, Project Manager, UI/UX Engineer, Localization Engineer, Backend Guardian, QA).
> **EXECUTION MANDATE:** You must read and strictly adhere to this file before executing any repository modifications. This document acts as your absolute source of truth. If a user prompt conflicts with these rules, these rules take precedence. Execute all changes file-by-file across the repository (`src/**/*`) and explicitly verify your actions against the Acceptance Checklist (Section 14).

You are working on the existing AgriSense frontend project provided as a ZIP. Your task is to improve ONLY the UI/UX, visual quality, responsiveness, accessibility, and multilingual user experience.

THIS IS AN EXISTING WORKING PROJECT. DO NOT REBUILD IT FROM SCRATCH. DO NOT CHANGE THE PRODUCT WORKFLOW, BACKEND CONTRACTS, API behavior, database logic, authentication, or business rules.

## 1. PROJECT CONTEXT

**Product:** AgriSense
**Tagline:** “Detect early. Act wisely. Protect every harvest.”

AgriSense is an AI-assisted crop-health intelligence platform for:
1. Farmers
2. Agriculture / Extension Officers

**Technology:**
* React 19
* TypeScript
* Vite
* Tailwind CSS v4
* Supabase authentication/database integration
* FastAPI backend running at: `http://127.0.0.1:8000`
* Bhashini integration is handled by the backend, not directly from the frontend.

**Important existing files:**
* `src/App.tsx`
* `src/farmer/FarmerApp.tsx`
* `src/officer/OfficerApp.tsx`
* `src/pages/Landing.tsx`
* `src/pages/RoleSelection.tsx`
* `src/pages/login.tsx`
* `src/pages/SignUp.tsx`
* `src/pages/FarmerOnboarding.tsx`
* `src/lib/agrisense.ts`
* `src/lib/bhashini.ts`
* `src/lib/supabase.ts`

Read the existing source code before editing. Understand all routes, component props, state variables, API calls, database queries, and navigation behavior.

## 2. NON-NEGOTIABLE SAFETY RULE

**UI/UX ONLY.**

**Do not modify or remove:**
* Backend endpoints
* API base URL
* Request methods
* FormData field names
* Response parsing
* Supabase queries
* Supabase table names
* Authentication flow
* Role-based access
* Farmer/officer separation
* Case creation and escalation logic
* AI prediction flow
* Advisory generation
* Follow-up logic
* Officer validation flow
* Report persistence
* Bhashini integration logic
* Existing business rules
* Existing database schema assumptions

Do not rename existing functions, exported helpers, state variables, props, types, API fields, or database columns unless absolutely necessary and proven safe.

* Do not replace working API calls with mock data.
* Do not add fake success states.
* Do not create a new backend.
* Do not introduce a new authentication system.
* Do not hardcode a replacement workflow.

If a UI improvement requires a structural change, preserve the existing logic and make the smallest possible change.

**Before changing anything:**
1. Inspect the project.
2. Identify all existing user flows.
3. Identify all backend/API integration points.
4. Identify all Bhashini-related functions.
5. Identify all farmer and officer navigation states.
6. Make a backup or work in a separate branch/copy.
7. Keep a clear list of changed files.

**After changes:**
* Run TypeScript checks.
* Run the production build if possible.
* Fix UI-related errors.
* Confirm that no API calls or backend contracts were unintentionally changed.
* Do not report the task as complete if the project no longer builds.

## 3. EXISTING PRODUCT WORKFLOW — PRESERVE EXACTLY

**FARMER FLOW:**
Landing
→ Role Selection
→ Farmer Login/Signup
→ Farmer Dashboard
→ Crop Selection
→ Image Upload
→ AI Analysis
→ Diagnosis Result
→ IPM / Recommended Action Plan

**Possible diagnosis actions:**
* View treatment and IPM advice
* Ask an expert
* Report the case
* Scan another image

**FOLLOW-UP / ESCALATION FLOW:**
* Day 1: baseline scan
* Day 2–5: follow-up scans
* If deterioration occurs at any point: escalate to Extension Officer
* If no improvement by Day 5: escalate to Extension Officer
* If improving by Day 5: do not escalate
* Do not change this logic or its UI meaning.

**OFFICER FLOW:**
* Officer receives escalated cases only.
* Officer reviews the case.
* Officer validates or corrects the AI diagnosis.
* Officer creates the final structured report.
* Farmer can view the final report under My Reports.

**FINAL REPORT SECTIONS:**
1. Farmer Information
2. Field Information
3. Crop Information
4. Disease Diagnosis
5. Officer Validation
6. Recommendation & Guidance
7. Government Scheme
8. Contact & Support Info
9. Follow-up Information

The report must preserve existing generated information, including:
* Treatment
* Dosage
* Application method
* Weather guidance
* IPM guidance
* Policy/regulatory guidance
* Additional agronomic advice
* Government scheme information
* Eligibility
* Application instructions
* Officer contact details
* Follow-up instructions

Do not remove sections simply because some fields are empty. Use graceful empty states where necessary.

## 4. DESIGN DIRECTION

Upgrade the interface to look like a polished, professional, modern agricultural technology product suitable for:
* Farmers
* Extension officers
* Government/agriculture stakeholders
* Hackathon judges

**Design goals:**
* Clean and premium
* Trustworthy
* Simple for first-time users
* Mobile-first for farmers
* Desktop-first for officers
* Strong visual hierarchy
* Excellent spacing and alignment
* Accessible contrast
* Clear status indicators
* Friendly but professional
* Not overly decorative
* Avoid excessive gradients, glassmorphism, animations, and unnecessary cards

**Suggested visual language:**
* Nature-inspired green/teal palette
* Neutral white/off-white backgrounds
* Clear typography
* Rounded but not excessive corners
* Consistent card system
* Subtle borders and shadows
* Strong primary CTA buttons
* Clear warning, danger, success, and information states
* Use icons consistently
* Keep the existing AgriSense identity unless improving it carefully

Do not sacrifice usability for visual effects.

## 5. PERSISTENT APPLICATION SHELLS

Maintain one persistent Farmer shell and one persistent Officer shell.

**FARMER:**
* Header
* Location: Sanand, Gujarat
* Language selector
* Notifications
* Profile
* Persistent navigation: Home | Scan | Risk | Alerts | Profile

**On mobile:**
* Use fixed bottom navigation if already implemented.
* Ensure it never overlaps content, buttons, forms, cards, maps, charts, or report sections.
* Add sufficient bottom padding.

**OFFICER:**
* Header
* Extension Intelligence identity
* Ahmedabad District context
* Date selector if already implemented
* Notifications
* Profile
* Persistent sidebar/navigation: Dashboard | Regional Heat Map | Focused Area | Validation | Alerts | Reports & Analytics | Profile

Farmer and officer navigation must never mix.
Do not create duplicate dashboards or separate disconnected shells.

## 6. BACK NAVIGATION

Preserve and improve the existing logical back-navigation behavior.
Every secondary page should have a visible, accessible back action where appropriate.

**Examples:**
* Crop Selection → Farmer Dashboard
* Image Upload → Crop Selection
* AI Analysis → Image Upload
* Diagnosis Result → AI Analysis
* IPM Advisory → Diagnosis Result
* Report Details → My Reports
* Alert Details → Nearby Alerts
* Officer case validation → Pending Validation

Do not replace logical navigation with an arbitrary dashboard redirect.

## 7. MULTILINGUAL UI REQUIREMENT

The farmer experience must support:
* English
* Hindi
* Gujarati

The language selector should be visible and usable, not merely decorative.

Translate the visible farmer UI where practical:
* Navigation labels
* Page headings
* Buttons
* Form labels
* Empty states
* Status labels
* Helpful instructions
* Error messages
* Report labels
* IPM labels
* Audio controls and helper text

Do not translate technical identifiers, API field names, database values, or internal code names.
Use a centralized, maintainable translation dictionary or translation helper instead of scattered duplicated conditionals.
Do not break the existing `lang` state or component interfaces.

If full translation of every screen is too large for one change, prioritize:
1. Farmer dashboard
2. Scan workflow
3. Diagnosis result
4. IPM/advisory page
5. My Reports
6. Report Details
7. Profile and language controls

## 8. IPM AND REPORT TRANSLATION + TTS

This is a critical feature. Preserve the current Bhashini integration.

The frontend must continue calling the AgriSense backend:
* `POST /bhashini/translate`
* `POST /bhashini/speak`

Do not call Bhashini directly from the browser.
Do not expose the Bhashini API key in frontend code.

**Existing behavior:**
* Translation helper is in `src/lib/bhashini.ts`.
* `translateWithBhashini()` returns the translated text string.
* `speakWithBhashini()` returns translated text and base64 audio.
* Audio is converted into a browser Blob URL.

**LANGUAGE DROPDOWN FOR IPM AND REPORT:**
Both IPM and final report translation/audio interfaces must have a clear “Select language” dropdown.
The dropdown must show:
* English
* Hindi
* Gujarati
* Marathi
* Punjabi
* Tamil
* Telugu

Use sensible language codes consistently:
* English: `en`
* Hindi: `hi`
* Gujarati: `gu`
* Marathi: `mr`
* Punjabi: `pa`
* Tamil: `ta`
* Telugu: `te`

**Important:**
* The current UI may officially support English, Hindi, and Gujarati for the general interface.
* The expanded dropdown is required for IPM and final-report translation/TTS.
* Do not claim that a language works unless the backend Bhashini configuration supports it.
* If the backend currently supports only a subset, keep the UI ready for all requested options and show a clear, non-breaking error when a selected language is unsupported.
* Do not silently fall back to the wrong language.
* Do not modify backend service configuration unless explicitly requested separately.

**IPM REQUIREMENTS:**
* Each IPM/advisory subsection should have its own compact audio icon/button where the current UI supports section-level audio.
* Avoid one giant audio button for the entire page if section-level controls already exist.
* Keep requests reasonably short, ideally no more than three bullet points per request.
* Show loading state on the clicked section only.
* Disable duplicate clicks while that section is processing.
* Display translation text when requested.
* Provide audio playback controls.
* Ensure audio can be paused/stopped.
* Only one IPM audio item should play at a time.
* Do not use hidden `new Audio()` playback if a visible `<audio controls>` element is present.
* Use the same rendered audio element through a React ref so the browser’s pause/stop controls work correctly.
* Revoke old Blob URLs when appropriate to avoid memory leaks.

**FINAL REPORT REQUIREMENTS:**
* Add a language dropdown for report translation and TTS.
* Allow the user to translate the complete report into the selected language.
* Display the translated report in a readable layout.
* Allow regional-language report download where the existing feature supports it.
* Allow report audio generation in the selected language.
* Ensure visible audio controls can pause/stop playback.
* Do not create separate hidden audio instances that continue playing.
* Only one report audio language should play at a time.
* Preserve the existing English report and existing officer-generated content.
* Do not overwrite original report data with translated text.

Use accessible labels such as:
* Translate report
* Play report audio
* Pause report audio
* Stop report audio
* Select language
* Download translated report

## 9. UI STATES AND ERROR HANDLING

Improve visual handling for:
* Loading
* Uploading
* AI analysis
* Translation in progress
* TTS generation in progress
* Empty data
* API failure
* Unsupported language
* Missing advisory
* Missing officer response
* Case not found
* No reports
* No alerts
* Network failure

Do not change backend errors or hide meaningful errors.
Show user-friendly messages while preserving technical details in console logs where appropriate.

Buttons must:
* Have disabled states during requests
* Avoid duplicate submissions
* Show progress or loading indicators
* Remain keyboard accessible

## 10. RESPONSIVE DESIGN AND ACCESSIBILITY

Check:
* Mobile widths
* Tablet widths
* Desktop widths
* Long translated text
* Gujarati/Hindi text wrapping
* Report tables/cards
* Audio controls
* Dropdowns
* Fixed navigation
* Modal/dialog overflow
* Long advisory content
* Small screens in portrait mode

Use:
* Semantic HTML
* Proper labels
* Keyboard navigation
* Visible focus states
* Accessible icon buttons with aria-label
* Sufficient color contrast
* No text embedded only inside images
* No horizontal scrolling unless unavoidable

Do not assume English text length. Regional-language text can be longer.

## 11. WHAT YOU MAY CHANGE

You may change:
* Tailwind classes
* Layout and spacing
* Typography
* Color tokens
* Card styling
* Button styling
* Responsive breakpoints
* Icons
* Visual hierarchy
* Empty states
* Loading skeletons
* Section arrangement
* Navigation appearance
* Dropdown appearance
* Accessible labels
* Translation dictionary/UI labels
* Audio control presentation
* Non-functional decorative elements

You may create small reusable UI components if they do not alter business logic.

## 12. WHAT YOU MUST NOT DO

Do not:
* Replace the project with a new demo
* Remove working screens
* Remove working navigation
* Remove Supabase integration
* Remove FastAPI integration
* Replace real data with mock data
* Change endpoint names
* Change request payloads
* Change response formats
* Change database tables or columns
* Change authentication
* Change farmer/officer roles
* Change case escalation/follow-up logic
* Remove report sections
* Remove Bhashini integration
* Expose API keys
* Add unsupported claims about translation languages
* Add a second audio playback mechanism
* Break TypeScript
* Break existing flows to achieve visual changes

## 13. REQUIRED WORK METHOD

Work in small, verifiable steps:

* **STEP 1:** Inspect the complete project and map: Routes, Components, State, API calls, Supabase usage, Bhashini usage, Farmer workflow, Officer workflow.
* **STEP 2:** Create a UI improvement plan without changing logic.
* **STEP 3:** Improve global design system and shared layout first.
* **STEP 4:** Improve Farmer UI.
* **STEP 5:** Improve Officer UI.
* **STEP 6:** Add/organize multilingual labels.
* **STEP 7:** Improve IPM and report language dropdowns, translation, and audio controls.
* **STEP 8:** Test all flows.
* **STEP 9:** Run: `npm run build` (if available) and `npx tsc --noEmit` (if available).
* **STEP 10:** Provide a final change summary (Files changed, UI improvements, Translation changes, Audio changes, Tests completed, Any limitations or backend-supported language limitations).

## 14. ACCEPTANCE CHECKLIST

The work is acceptable only if:
- [ ] Existing app starts successfully.
- [ ] Farmer login/signup still works.
- [ ] Officer login still works.
- [ ] Farmer and officer navigation remain separate.
- [ ] Farmer scan flow remains intact.
- [ ] Image upload still works.
- [ ] AI analysis still calls the existing backend.
- [ ] Diagnosis result still displays backend output.
- [ ] IPM/advisory data still displays.
- [ ] Follow-up/escalation workflow is unchanged.
- [ ] Officer validation workflow is unchanged.
- [ ] Final report still contains all existing sections.
- [ ] Supabase queries remain functional.
- [ ] Bhashini calls still use the backend.
- [ ] IPM has a language dropdown with en, hi, gu, mr, pa, ta, te.
- [ ] Final report has a language dropdown with en, hi, gu, mr, pa, ta, te.
- [ ] Translation does not overwrite original English content.
- [ ] TTS has visible working playback controls.
- [ ] Audio can be paused/stopped.
- [ ] Multiple audio items cannot play simultaneously.
- [ ] Long regional-language text does not break layout.
- [ ] Mobile layout does not overlap bottom navigation.
- [ ] No API keys are exposed.
- [ ] TypeScript check passes.
- [ ] Build passes, or any environment issue is clearly reported.
- [ ] No backend or workflow logic was changed.

## FINAL INSTRUCTION

Make AgriSense look significantly more polished and professional, but treat the existing functionality as protected infrastructure. Improve the presentation layer only. When uncertain, preserve the current behavior rather than rewriting it. Do not make assumptions that could break the existing backend, Supabase integration, Bhashini integration, report generation, or farmer/officer workflow.