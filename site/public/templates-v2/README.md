# TCH V2 Templates

This folder is reserved for the V2 HTML templates (Morning Prep, Workshop Session, Debrief, Review Dashboard, Hub, Action Plan, Facilitator Guide) and the shared brand CSS.

Download source: Drive folder `WORKSHOP DOCS V2` (1QTpC0RVGRcEHIeUXbBhHxlY6VN0wo9a0).

Wiring plan (next session):
1. Drop all 7 V2 HTML files + tch-brand.css here
2. Create Next.js pages at /morning-prep/[intakeId], /workshop/[sessionId], etc. that iframe the templates
3. Pass session+intake data via postMessage from the page to the iframe
4. Wire 'Generate Workshop Session' submit button → POST /api/sessions/snapshot

Research brief generation backend is already shipped (POST /api/research-brief/generate).
Sessions DB created (data source 0003001f-6446-4f0e-ae9b-fed8887cc0a3).
