# AGRISENSE — COMPLETE RESPONSIVE WEB APPLICATION PROTOTYPE

Build a polished, professional, responsive web application called **AgriSense** from scratch.

Product tagline:

**"Detect early. Act wisely. Protect every harvest."**

AgriSense is an AI-assisted agricultural crop-health intelligence platform designed for:

1. Farmers
2. Agriculture / Extension Officers

The final result must feel like **ONE COMPLETE, COHERENT APPLICATION**, not a collection of disconnected screens.

This is a UI/UX prototype using realistic mock data and simulated interactions.

Do NOT implement:

* Real machine-learning models
* Firebase
* Backend APIs
* Authentication
* Sensors
* External databases
* Real-time APIs

==================================================

# 1. MOST IMPORTANT REQUIREMENT — PERSISTENT DASHBOARD

==================================================

The entire application must use a **persistent dashboard/application shell**.

This is the most important navigation requirement.

Once the user enters either the Farmer or Officer application:

**THE DASHBOARD STRUCTURE MUST REMAIN VISIBLE ON EVERY PAGE.**

Do NOT create standalone pages that remove the main application navigation.

Instead, use this architecture:

**PERSISTENT APPLICATION SHELL**
+
**PERSISTENT NAVIGATION**
+
**DYNAMIC MAIN CONTENT**

When the user navigates to another page:

* Header stays
* Navigation stays
* Dashboard/application structure stays
* Only the main content area changes

For example:

Farmer Dashboard
→ Crop Selection
→ Image Upload
→ AI Analysis
→ Diagnosis Result
→ IPM Advisory

All of these pages must appear INSIDE THE SAME FARMER APPLICATION SHELL.

The user should never feel that they have left the application.

==================================================

# 2. DO NOT DUPLICATE THE DASHBOARD

==================================================

There must be:

**ONE Farmer application shell**

and

**ONE Officer application shell**

Reuse these shells throughout the respective applications.

Do NOT create:

* Dashboard Copy
* Dashboard 2
* Dashboard New
* Separate dashboard for Risk
* Separate dashboard for Scan
* Separate dashboard for Alerts
* Separate dashboard for Reports

Instead:

**ONE persistent shell → different main content**

The dashboard navigation should remain persistent.

However, do NOT repeat the entire dashboard's content on every page.

For example, when the user opens Diagnosis Result:

KEEP:

* Header
* Navigation
* Active navigation state

SHOW:

* Diagnosis Result content

DO NOT repeat:

* Full dashboard greeting
* Scan card
* Weather cards
* Dashboard quick actions
* Dashboard KPIs

The **dashboard shell is persistent; dashboard content is not duplicated.**

==================================================

# 3. FARMER APPLICATION SHELL

==================================================

Create a mobile-first Farmer application.

### Persistent Header

The following must remain visible across every Farmer page:

**AgriSense**

Location:

**Sanand, Gujarat**

Language:

**EN | हिंदी | ગુજરાતી**

Notifications

Profile

### Persistent Farmer Navigation

Desktop/tablet:

Use a clean persistent navigation structure appropriate for the available screen width.

Mobile:

Use a fixed bottom navigation bar:

**Home | Scan | Risk | Alerts | Profile**

The navigation must remain visible while the user moves between Farmer pages.

The active navigation item must update automatically.

Examples:

Home → Home active

Scan/Crop Selection/Image Analysis → Scan active

Risk Forecast → Risk active

Nearby Alerts → Alerts active

Profile → Profile active

The bottom navigation must:

* Remain inside the viewport
* Never overlap content
* Never cover buttons
* Never cover cards
* Never cover maps
* Never cover forms
* Never cover charts

Add sufficient bottom padding to every mobile page.

==================================================

# 4. OFFICER APPLICATION SHELL

==================================================

Create a separate desktop-first Officer application.

### Persistent Header

AgriSense | Extension Intelligence

Location:

Ahmedabad District

Date Selector

Notifications

Profile

### Persistent Officer Sidebar

The sidebar must remain visible across ALL Officer pages on desktop.

Navigation:

Dashboard
Regional Heat Map
Focused Area
Validation
Alerts
Reports & Analytics
Profile

The currently active section must always be highlighted.

On tablet/mobile, collapse the sidebar into a clean navigation menu.

Do NOT recreate the sidebar independently on every Officer page.

==================================================

# 5. FARMER AND OFFICER MUST NEVER MIX

==================================================

After role selection, maintain completely separate application navigation.

### FARMER

Home
Scan
Risk
Alerts
Profile

### OFFICER

Dashboard
Regional Heat Map
Focused Area
Validation
Alerts
Reports & Analytics
Profile

The following pages are Officer-only:

* Regional Heat Map
* Focused Area Intelligence
* Pending Validation
* Case Validation
* Officer Alerts
* Officer Reports & Analytics

These pages must NEVER appear in Farmer navigation.

The Farmer nearby-alert map is separate from the Officer Regional Heat Map.

==================================================

# 6. BACK ARROW SYSTEM — MANDATORY

==================================================

Every secondary/child page must contain a clearly visible and functional:

**← Back**

arrow in the main content header.

The back arrow must return to the **logical parent page**.

It must NOT simply return to the dashboard unless the dashboard is actually the parent.

The persistent dashboard navigation remains visible at the same time.

Therefore, every child page has TWO navigation mechanisms:

### PRIMARY NAVIGATION

Persistent dashboard navigation.

### SECONDARY NAVIGATION

Functional back arrow.

Example:

Farmer Dashboard
↓
Crop Selection
↓
Image Upload
↓
AI Analysis
↓
Diagnosis Result

Navigation:

Crop Selection
**← Back to Farmer Dashboard**

Image Upload
**← Back to Crop Selection**

AI Analysis
**← Back to Image Upload**

Diagnosis Result
**← Back to AI Analysis**

IPM Advisory
**← Back to Diagnosis Result**

Expert Consultation
**← Back to Diagnosis Result**

Report Case
**← Back to Diagnosis Result**

Report Details
**← Back to My Reports**

Alert Details
**← Back to Nearby Alerts**

Officer:

Regional Heat Map
**← Back to Officer Dashboard**

Focused Area Intelligence
**← Back to Regional Heat Map**

Pending Validation
**← Back to Officer Dashboard**

Case Validation
**← Back to Pending Validation**

Officer Alert Detail
**← Back to Officer Alerts**

The back arrow must be a real clickable interaction.

Do NOT rely only on browser back navigation.

==================================================

# 7. LANDING PAGE

==================================================

Create a polished agricultural technology landing page.

Hero heading:

**"Protect your crop before the damage spreads."**

Supporting text:

"AI-assisted crop health detection, local risk forecasting and actionable agricultural guidance for farmers and extension workers."

Primary CTA:

**Scan My Crop**

Secondary CTA:

**Explore Risk Map**

Capability cards:

AI Crop Diagnosis
Risk Forecasting
Smart Advisories
Field Intelligence

Trust section:

Built for farmers • Extension teams • Agricultural authorities

Navigation:

Scan My Crop → Role Selection

Explore Risk Map → Role Selection

The landing page does not need the Farmer/Officer application shell.

==================================================

# 8. ROLE SELECTION

==================================================

Title:

**"How will you use AgriSense?"**

Create two large cards.

### FARMER

"Scan your crop, understand the risk and get actionable guidance."

Button:

**Continue as Farmer**

→ Farmer Dashboard

### OFFICER

"Monitor reports, validate diagnoses and identify emerging hotspots."

Button:

**Continue as Officer**

→ Officer Dashboard

After this point, keep the two navigation systems completely separate.

==================================================

# 9. FARMER DASHBOARD

==================================================

Create the main Farmer Dashboard inside the persistent Farmer shell.

Greeting:

**"Good morning, Farmer 👋"**

"Let's keep your crop healthy today."

Main card:

**SCAN YOUR CROP**

"Take or upload a photo of an affected leaf, fruit or plant."

Buttons:

Take Photo
Upload Image

Quick actions:

Check Risk
Nearby Alerts
My Reports

Weather:

**Today's Field Conditions**

Temperature: 29°C

Humidity: 78%

Rainfall Probability: 65%

Wind: 12 km/h

Disease/Pest Risk:

**MODERATE**

"Warm and humid conditions may increase fungal disease risk."

The Scan Your Crop card must be completely visible.

Quick actions must never overlap it.

==================================================

# 10. FARMER SCAN FLOW

==================================================

Create ONE connected scan workflow.

Farmer Dashboard
↓
Crop Selection
↓
Image Upload
↓
AI Analysis
↓
Diagnosis Result

### CROP SELECTION

Title:

**"What crop are you checking?"**

Search crop

Cards:

Rice
Wheat
Cotton
Maize
Potato
Tomato
Chilli
Groundnut
I don't know

Every crop card is clickable.

Rice → Image Upload.

Back:

**← Back to Farmer Dashboard**

Keep the Farmer application shell visible.

### IMAGE UPLOAD

Title:

**"Capture the affected area"**

Show camera/image area.

Instruction:

"Take a clear photo of the affected leaf or plant part in good lighting."

Tips:

✓ Keep the affected area in focus

✓ Avoid blurry images

✓ Capture one affected leaf clearly

✓ Avoid very dark images

Buttons:

Take Photo

Upload from Gallery

After selection:

Show uploaded image.

Buttons:

Analyze Crop

Retake Photo

Back:

**← Back to Crop Selection**

Analyze Crop → AI Analysis.

### AI ANALYSIS

Title:

**"Analyzing your crop..."**

Show uploaded image.

Progress:

✓ Image quality checked

✓ Crop identified

● Analyzing symptoms

○ Estimating severity

○ Checking local risk

Use a subtle scanning animation.

Do NOT use a generic loading spinner.

Back:

**← Back to Image Upload**

### DIAGNOSIS RESULT

Title:

**"Crop Health Assessment"**

Show uploaded image.

Possible Rice Leaf Blast

Confidence:

**87%**

Status:

**HIGH ATTENTION**

Severity:

**72%**

Explanation:

"Visible lesions are consistent with symptoms commonly associated with rice blast. The result is an AI-assisted assessment and should be confirmed if symptoms are severe or uncertain."

Explainability:

**Why was this detected?**

* Leaf lesion pattern
* Discoloration
* Symptom distribution

**What should you do now?**

1. Inspect nearby plants for similar symptoms.
2. Avoid practices that may increase disease pressure.
3. Follow recommended IPM measures.
4. Contact an extension worker if the condition is spreading.

Buttons:

View Treatment & IPM Advice
Ask an Expert
Report This Case
Scan Another Image

Back:

**← Back to AI Analysis**

Every button must navigate to an existing logical page.

==================================================

# 11. FARMER RISK

==================================================

Dashboard navigation:

Risk

Main content:

**Crop Health Risk**

Location:

Sanand, Gujarat

Risk:

**MODERATE RISK**

Score:

**68 / 100**

Show a clean visual gauge.

Text:

"Current conditions indicate a moderate risk of disease/pest spread over the next 3–5 days."

Factors:

Weather
Temperature: 29°C
Humidity: 78%
Rain probability: 65%

Crop Stage:

Flowering

Recent Field Reports:

12 nearby reports

Pest Activity:

Moderate

5-day trend:

Today — Moderate
Tomorrow — High
Day 3 — High
Day 4 — Moderate
Day 5 — Moderate

Button:

View Preventive Actions

Back:

**← Back to Farmer Dashboard**

Keep the complete Farmer shell visible.

==================================================

# 12. IPM ADVISORY

==================================================

Title:

**"Recommended Action Plan"**

Disease:

Rice Leaf Blast

Risk:

High

Sections:

01 — Monitor

02 — Cultural Practices

03 — Biological / Low-risk Options

04 — Chemical Intervention

Safety card:

**Safe Input Use**

"Do not exceed the recommended dose. Avoid unnecessary pesticide application. Use appropriate protective equipment and follow local agricultural guidance."

Do NOT invent pesticide brands or unsafe dosage instructions.

Button:

Contact Extension Expert

Back:

**← Back to Diagnosis Result**

Keep the Farmer shell visible.

==================================================

# 13. EXPERT CONSULTATION

==================================================

Title:

**"Get Expert Validation"**

Current case:

Rice • Possible Leaf Blast • 87% AI confidence

Options:

Submit for Expert Review
Find Nearby Extension Support
Refer for Laboratory Diagnosis

Timeline:

Pending → Under Review → Validated

Back:

**← Back to Diagnosis Result**

==================================================

# 14. REPORT CASE

==================================================

Title:

**"Report Crop Condition"**

Fields:

Crop
Location
Observed Symptoms
Severity
Date Observed
Photo Attachment
Optional Pest Trap Count

Location:

Sanand, Gujarat

Button:

Submit Field Report

After submission:

**Report Submitted ✓**

"Your observation has been added to the local crop-health monitoring system."

Back:

**← Back to Diagnosis Result**

==================================================

# 15. FARMER ALERTS

==================================================

Farmer navigation:

Alerts

Title:

**"Crop Health Alerts Near You"**

Show an actual visual map.

Markers:

Red = High Risk

Orange = Moderate Risk

Green = Low Risk

Filters:

Crop
Disease/Pest
Risk Level
Date Range

Nearby Alerts:

High Risk
Cotton pest activity
4.2 km away

Moderate Risk
Rice disease reports
7.8 km away

Moderate Risk
Vegetable pest reports
10.4 km away

Clicking an alert → Alert Details.

Alert Details must contain:

**← Back to Nearby Alerts**

This map is ONLY the Farmer nearby-alert map.

Do not confuse it with the Officer Regional Heat Map.

==================================================

# 16. FARMER MY REPORTS

==================================================

Title:

**"My Crop Health History"**

Show:

Date
Crop
Diagnosis
Confidence
Risk
Status

Examples:

Rice — Leaf Blast — 87% — High — Expert Review Pending

Cotton — Healthy — 93% — Low — Confirmed

Clicking a report → Report Details.

Report Details:

**← Back to My Reports**

Do NOT create another My Reports page.

==================================================

# 17. FARMER NOTIFICATIONS

==================================================

Examples:

High-risk alert:

"High disease activity detected near your location."

Weather alert:

"Humidity and rainfall conditions may increase disease risk."

Expert update:

"Your submitted crop report has been reviewed."

Notifications must be accessible from the persistent header.

==================================================

# 18. FARMER PROFILE

==================================================

Create one Farmer Profile page.

Information:

Name
Location
Preferred Language
Crop Preferences
Notification Settings

Back:

**← Back to Farmer Dashboard**

Keep Farmer navigation visible.

==================================================

# 19. OFFICER DASHBOARD

==================================================

Create the Officer Dashboard inside the persistent Officer shell.

KPI cards:

Total Field Reports
1,284

High-Risk Areas
24

Pending Validation
67

Cases Confirmed
892

Main section:

**REGIONAL CROP HEALTH OVERVIEW**

Show a visual map summary and regional indicators.

Top Emerging Threats:

Rice Blast ↑ 18%

Pink Bollworm ↑ 14%

Wheat Rust ↑ 9%

Leaf Spot ↓ 4%

Disease/Pest Reports — Last 30 Days

Crop-wise distribution:

Rice
Cotton
Wheat
Maize
Vegetables

==================================================

# 20. OFFICER REGIONAL HEAT MAP

==================================================

Officer navigation:

Regional Heat Map

Create a dedicated Officer-only page.

The Officer shell MUST remain visible.

Show an actual visual Gujarat regional heat map.

Risk colors:

Red = High Risk

Orange = Moderate Risk

Yellow = Emerging

Green = Low Risk

Regions:

Ahmedabad
Sanand
Kheda
Anand
Vadodara
Surat
Rajkot
Mehsana

Filters:

Crop
Disease/Pest
Risk Level
Time Period
District
Report Status

Map controls:

Zoom In
Zoom Out
Reset View

Clicking a hotspot opens a detail panel:

Region
Primary Threat
Risk Level
Number of Reports
Confirmed Cases
Recent Trend
Last Updated

Example:

Sanand

Primary Threat:

Rice Leaf Blast

Risk:

High

Reports:

48

Confirmed:

31

Trend:

↑ 18%

Back:

**← Back to Officer Dashboard**

This page MUST NOT appear in Farmer navigation.

==================================================

# 21. FOCUSED AREA INTELLIGENCE

==================================================

This is a CHILD PAGE of Regional Heat Map.

Flow:

Regional Heat Map
↓
Select hotspot
↓
Focused Area Intelligence

The complete Officer shell remains visible.

Header:

**← Back to Regional Heat Map**

Title:

**Sanand Agricultural Zone**

Risk:

HIGH

Overall Risk Score:

78 / 100

Show a detailed local-area map:

Disease hotspots
Pest hotspots
Field reports
Confirmed cases
Extension visits
Crop distribution

Analytics:

Total Reports — 48

Confirmed Cases — 31

Pending Validation — 9

High-Risk Clusters — 6

Affected Area — 1,240 hectares

Top Threat:

Rice Leaf Blast

Secondary Threat:

Stem Borer

Trend chart:

Local Disease Activity — Last 14 Days

Crop distribution:

Rice
Cotton
Wheat
Vegetables

Why is this area at risk?

High humidity
Recent rainfall
Increasing field reports
Favorable crop stage

Officer Actions:

Review Pending Cases
Assign Extension Visit
Notify Farmers
View Reports
Mark Area Under Surveillance

Every button must lead to an existing relevant page/action.

Do NOT create duplicate screens.

==================================================

# 22. OFFICER VALIDATION

==================================================

Officer navigation:

Validation

Create Pending Validation.

Professional table:

Case ID
Location
Crop
AI Assessment
Confidence
Severity
Submitted
Action

Example:

AG-1024
Sanand
Cotton
Pink Bollworm
76%
High
2 hrs ago

Actions:

Review
Confirm
Correct
Refer to Lab

Review → Case Validation.

Back:

**← Back to Officer Dashboard**

### CASE VALIDATION

Title:

**"Expert Validation"**

AI Assessment:

Possible Pink Bollworm

AI Confidence:

76%

Show submitted image.

Options:

Confirm Diagnosis
Correct Diagnosis

If correcting:

Select confirmed pest/disease

Add notes.

Button:

Submit Validation

After submission:

"Case confirmed and added to regional surveillance."

Back:

**← Back to Pending Validation**

==================================================

# 23. OFFICER ALERT CENTER

==================================================

Title:

**"Emerging Risk Alerts"**

Examples:

High Priority:

"Cluster of cotton pest reports detected in 3 nearby areas."

Monitor:

"Rice disease reports increasing over the last 7 days."

Actions:

View Cluster
Assign Extension Visit
Notify Farmers

View Cluster → relevant Regional Heat Map / Focused Area Intelligence.

Back on alert detail:

**← Back to Officer Alerts**

==================================================

# 24. OFFICER REPORTS & ANALYTICS

==================================================

Create one professional analytics page.

Include:

Disease trends
Crop-wise reports
District-wise risk
Confirmed vs unconfirmed cases
Response time
Hotspot growth
Preventive intervention status

Use a limited number of meaningful charts.

Do not overcrowd the page.

Back:

**← Back to Officer Dashboard**

==================================================

# 25. PROFILE

==================================================

Farmer Profile:

Name
Location
Preferred Language
Crop Preferences
Notification Settings

Officer Profile:

Officer Information
District
Department/Role
Notification Settings
Language

Both must retain their respective application navigation.

==================================================

# 26. GLOBAL LANGUAGE SYSTEM

==================================================

The Farmer application must always provide:

**EN | हिंदी | ગુજરાતી**

Place it in the persistent application header.

Use a compact dropdown if necessary.

Changing language must not break the layout.

Design layouts to accommodate longer translated text.

==================================================

# 27. RESPONSIVE DESIGN

==================================================

The website MUST work correctly on:

### MOBILE

* Farmer optimized
* Persistent bottom navigation
* No horizontal scrolling
* No overlapping elements
* Content scrolls above bottom navigation
* Buttons remain accessible
* Cards remain readable

### TABLET

* Adaptive layout
* Navigation remains accessible
* Cards resize appropriately
* Officer sidebar may collapse

### DESKTOP

* Spacious professional layout
* Farmer and Officer layouts optimized appropriately
* Officer sidebar remains persistent
* Charts and maps use available screen space

Never allow:

* Horizontal overflow
* Clipped cards
* Text outside containers
* Buttons outside containers
* Navigation covering content
* Charts extending outside containers
* Maps extending outside containers

==================================================

# 28. VISUAL DESIGN

==================================================

Use a professional agricultural technology identity.

Primary palette:

* Earthy agricultural green
* Dark green
* Warm off-white
* White
* Amber/orange for warnings
* Red only for high/critical risk

Use:

* Clean typography
* Strong hierarchy
* Accessible contrast
* Meaningful agricultural icons
* Subtle borders
* Restrained shadows
* Moderate corner radius
* Generous whitespace

Avoid:

* Excessive gradients
* Excessive glassmorphism
* Neon colors
* Generic SaaS styling
* Excessive rounded cards
* Clutter
* Tiny text
* Excessive animation

The website should look like a real, professional agricultural technology platform.

==================================================

# 29. NAVIGATION ARCHITECTURE

==================================================

The final architecture must follow this exact principle:

### LEVEL 1 — GLOBAL

Landing
↓
Role Selection

### LEVEL 2 — APPLICATION

Role Selection
↓
Farmer Dashboard

OR

Role Selection
↓
Officer Dashboard

### LEVEL 3 — PERSISTENT APPLICATION SHELL

Once inside the application:

HEADER = persistent

PRIMARY NAVIGATION = persistent

MAIN CONTENT = dynamic

### LEVEL 4 — CHILD PAGES

Child pages appear inside the same shell.

Example:

Farmer Shell
├── Home
├── Scan
│   ├── Crop Selection
│   ├── Image Upload
│   ├── AI Analysis
│   └── Diagnosis Result
├── Risk
│   └── Risk Forecast
├── Alerts
│   └── Alert Details
├── Reports
│   └── Report Details
└── Profile

Officer Shell
├── Dashboard
├── Regional Heat Map
│   └── Focused Area Intelligence
├── Validation
│   └── Case Validation
├── Alerts
│   └── Alert Details
├── Reports & Analytics
└── Profile

==================================================

# 30. IMPORTANT — NO UNNECESSARY REPETITION

==================================================

The website should be easy to navigate WITHOUT repeating information unnecessarily.

Keep:

✓ Persistent header

✓ Persistent navigation

✓ Persistent application structure

But DO NOT repeat:

✗ Entire dashboard content

✗ Same KPI cards on every page

✗ Same weather section on every page

✗ Same scan card on every page

✗ Same map on every page

✗ Same explanatory text on multiple pages

✗ Multiple versions of the same destination

Each page should have ONE clear purpose.

==================================================

# 31. INTERACTION REQUIREMENTS

==================================================

Every important UI element must work.

Clickable:

* Navigation items
* Buttons
* Cards
* CTAs
* Back arrows
* Map hotspots
* Filters
* Tabs
* Reports
* Alerts
* Notifications
* Profile
* Language selector

Do NOT create dead buttons.

Do NOT create fake clickable elements.

Do NOT connect an action to the wrong page.

If a destination already exists, navigate to the existing destination.

Never create another version of the same destination.

==================================================

# 32. BACK NAVIGATION TABLE

==================================================

Implement these exact parent-child relationships.

### FARMER

Farmer Dashboard
→ Crop Selection

Crop Selection
← Farmer Dashboard

Crop Selection
→ Image Upload

Image Upload
← Crop Selection

Image Upload
→ AI Analysis

AI Analysis
← Image Upload

AI Analysis
→ Diagnosis Result

Diagnosis Result
← AI Analysis

Diagnosis Result
→ IPM Advisory

IPM Advisory
← Diagnosis Result

Diagnosis Result
→ Expert Consultation

Expert Consultation
← Diagnosis Result

Diagnosis Result
→ Report Case

Report Case
← Diagnosis Result

Farmer Dashboard
→ Risk Forecast

Risk Forecast
← Farmer Dashboard

Farmer Dashboard
→ Nearby Alerts

Nearby Alerts
→ Alert Details

Alert Details
← Nearby Alerts

Farmer Dashboard
→ My Reports

My Reports
→ Report Details

Report Details
← My Reports

### OFFICER

Officer Dashboard
→ Regional Heat Map

Regional Heat Map
← Officer Dashboard

Regional Heat Map
→ Focused Area Intelligence

Focused Area Intelligence
← Regional Heat Map

Officer Dashboard
→ Pending Validation

Pending Validation
← Officer Dashboard

Pending Validation
→ Case Validation

Case Validation
← Pending Validation

Officer Dashboard
→ Officer Alerts

Officer Alerts
→ Focused Area Intelligence

Officer Dashboard
→ Reports & Analytics

Reports & Analytics
← Officer Dashboard

Officer Dashboard
→ Profile

Profile
← Officer Dashboard

==================================================

# 33. NO DEAD-END PAGES

==================================================

Every page must have:

* Persistent application navigation
* Clear page title
* Clear purpose
* Functional actions
* Functional back arrow where applicable

A user should never reach a page and have no obvious way to continue or return.

==================================================

# 34. NO DUPLICATE SCREENS

==================================================

Before generating a screen, determine whether that destination already exists.

If it exists:

**REUSE THE EXISTING SCREEN.**

Do NOT create duplicate versions.

There must only be:

ONE Farmer Dashboard

ONE Officer Dashboard

ONE Risk page

ONE Farmer Alert page

ONE Officer Regional Heat Map

ONE Focused Area Intelligence page

ONE Pending Validation page

ONE Case Validation page

ONE Reports & Analytics page

ONE Profile page per role

ONE destination for every defined route.

==================================================

# 35. FINAL QUALITY CHECK

==================================================

Before completing the prototype, inspect the ENTIRE application.

Verify:

✓ Persistent Farmer dashboard shell

✓ Persistent Officer dashboard shell

✓ Persistent header

✓ Persistent navigation

✓ Correct active navigation state

✓ Functional back arrow on every child page

✓ Back arrow returns to logical parent

✓ Farmer and Officer navigation completely separated

✓ Officer-only pages hidden from Farmer

✓ Language selector present

✓ Mobile bottom navigation never covers content

✓ Officer sidebar never overlaps content

✓ No horizontal overflow

✓ No clipped cards

✓ No overlapping components

✓ No text/button overlap

✓ No duplicate screens

✓ No duplicate dashboards

✓ No unnecessary repetition

✓ No dead buttons

✓ No incorrect routes

✓ Maps stay inside containers

✓ Charts stay inside containers

✓ Forms remain usable

✓ Tables remain readable

✓ Responsive behavior works on mobile, tablet and desktop

✓ Every page belongs to the same visual system

==================================================

# 36. FINAL PRODUCT EXPERIENCE

==================================================

The final application should communicate:

### FARMER

Observe
↓
Scan
↓
Detect
↓
Assess Risk
↓
Receive Advice
↓
Report
↓
Get Expert Support
↓
Prevent Crop Loss

### OFFICER

Monitor
↓
Detect Regional Hotspots
↓
Select Area
↓
Analyze Focused Area
↓
Review Reports
↓
Validate Cases
↓
Issue Alerts
↓
Assign Intervention
↓
Monitor Regional Crop Health

==================================================

# FINAL INSTRUCTION

==================================================

BUILD AGRISENSE AS ONE COMPLETE, CONNECTED, RESPONSIVE APPLICATION.

The MOST IMPORTANT requirement is:

**THE DASHBOARD/APPLICATION SHELL MUST REMAIN VISIBLE ON EVERY PAGE AFTER ENTERING THE FARMER OR OFFICER APPLICATION.**

The user must always have access to the main navigation.

When navigating to a child page:

**DO NOT REMOVE THE DASHBOARD SHELL.**

Instead:

**KEEP THE SHELL + CHANGE THE MAIN CONTENT + SHOW A FUNCTIONAL BACK ARROW.**

Use:

**PERSISTENT DASHBOARD**
+
**PERSISTENT NAVIGATION**
+
**DYNAMIC MAIN CONTENT**
+
**FUNCTIONAL BACK NAVIGATION**

Do not create unnecessary screens.

Do not duplicate screens.

Do not duplicate dashboard content.

Do not create disconnected pages.

Do not leave dead buttons.

Do not sacrifice navigation for visual complexity.

Prioritize, in this exact order:

1. CORRECT NAVIGATION
2. PERSISTENT DASHBOARD SHELL
3. FUNCTIONAL BACK ARROWS
4. NO DUPLICATE SCREENS
5. NO UNNECESSARY REPETITION
6. FARMER/OFFICER SEPARATION
7. RESPONSIVE DESIGN
8. CLEAN SPACING
9. CONSISTENT VISUAL DESIGN
10. POLISHED USER EXPERIENCE

The final result must feel like a **single professionally designed product**, where every page is connected to the same dashboard and the user can move between pages naturally and confidently.
