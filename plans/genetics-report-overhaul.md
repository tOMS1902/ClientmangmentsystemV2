# Blueprint: Genetics Report Overhaul

**Objective:** Separate the genetics report flow completely from bloodwork. Genetics gets its own AI prompt, its own structured data model, its own visual display, and its own client view. Bloodwork stays exactly as it is.

**Mode:** Direct (edit-in-place, no branch/PR workflow)
**Total steps:** 6 implementation + 1 cleanup
**Parallelism:** Steps 3 + 7 can run after Step 1 finishes. Steps 4 → 5 → 6 are serial.

---

## Codebase Context

- **Framework:** Next.js 16 App Router, React 19, TypeScript, TailwindCSS v4, Supabase
- **Report system files:**
  - `app/(coach)/clients/[id]/reports/new/page.tsx` — report creator (bloodwork + genetics)
  - `app/(coach)/clients/[id]/reports/[reportId]/edit/page.tsx` — report editor/viewer
  - `app/(client)/portal/reports/[reportId]/page.tsx` — client-facing report view
  - `app/api/reports/[id]/route.ts` — PATCH/GET for individual report
  - `lib/types.ts` — all TS interfaces; genetics relevant: `DiagnosticReport`, `DiagnosticInsight`, `InsightCategory`, `DiagnosticReportType`
  - `supabase/migrations/` — timestamped SQL migrations
- **Key patterns:**
  - Inline styles with design tokens (SURFACE `#0F1827`, RAISED `#131929`, BORDER `#1A2A40`, etc.)
  - `isBloodwork = report.report_type === 'bloodwork'` gates the two paths in edit page
  - Genetics insight rows currently use `InsightCategory`: `priority-focus | key-risks | nutrition | training | recovery | general` — wrong for genetics

---

## What Is Wrong Now

| Problem | Location |
|---------|----------|
| Genetics "AI Prompt" tab shows bloodwork extraction prompt (extract JSON arrays of marker_name/value/range) | `new/page.tsx` lines 89–111 |
| Genetics edit page shows insight cards (title, description, priority) with 6 generic categories | `edit/page.tsx` lines 563–635 |
| `InsightCategory` used for genetics only has 6 generic values, not the 8 Nutrition Genome categories | `lib/types.ts` line 284 |
| No structured storage for genetics AI summary (overview, top priorities, category notes, recommendations) | `diagnostic_reports` table schema |
| Client genetics report view is identical structure to bloodwork — no genetics-specific display | `portal/reports/[reportId]/page.tsx` |
| No visual elements (category cards, priority cards, score grid) for genetics | — |

---

## Target State

### Data Model
`diagnostic_reports` gets a new `genetic_data JSONB` column that stores:
```json
{
  "overview": "Short 2-3 sentence summary of what matters most.",
  "top_priorities": ["Methylation support", "Reduce toxin exposure", "..."],
  "category_notes": {
    "Macronutrient Metabolism": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "high" },
    "Toxin Sensitivity": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "medium" },
    "Mental Health & Cognitive Performance": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "low" },
    "Immune Support": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "medium" },
    "DNA Protection & Repair": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "high" },
    "Methylation": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "high" },
    "Hormone Support": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "medium" },
    "Cardiovascular Health & Athletic Performance": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "low" }
  },
  "recommendations": {
    "nutrition": "...",
    "training": "...",
    "recovery": "...",
    "supplements": "..."
  },
  "grocery_list": ["Broccoli", "Salmon", "..."],
  "followup_bloodwork": ["Vitamin D", "ApoB", "LDL", "Glucose", "HbA1c", "Ferritin"]
}
```

### Genetics Types (new in `lib/types.ts`)
```typescript
export type GeneticCategory =
  | 'Macronutrient Metabolism'
  | 'Toxin Sensitivity'
  | 'Mental Health & Cognitive Performance'
  | 'Immune Support'
  | 'DNA Protection & Repair'
  | 'Methylation'
  | 'Hormone Support'
  | 'Cardiovascular Health & Athletic Performance'

export interface GeneticCategoryNote {
  summary: string
  key_findings: string
  coaching_meaning: string
  priority: 'high' | 'medium' | 'low'
}

export interface GeneticData {
  overview: string
  top_priorities: string[]
  category_notes: Partial<Record<GeneticCategory, GeneticCategoryNote>>
  recommendations: {
    nutrition: string
    training: string
    recovery: string
    supplements: string
  }
  grocery_list: string[]
  followup_bloodwork: string[]
}
```

---

## Step 1 — Types + DB Migration
**Scope:** `lib/types.ts`, `supabase/migrations/`
**Model:** Strongest (everything downstream depends on this)

### Context brief
All other steps depend on these types and the DB column. Do this first.

### Tasks
1. Open `lib/types.ts` at line 284 (after `InsightCategory`).
2. Add `GeneticCategory` union type (8 values listed above).
3. Add `GeneticCategoryNote` interface.
4. Add `GeneticData` interface.
5. Add `genetic_data?: GeneticData | null` field to `DiagnosticReport` interface (after `pdf_file_url`, line ~304).
6. Create `supabase/migrations/20260419000000_add_genetic_data.sql`:
   ```sql
   ALTER TABLE diagnostic_reports
     ADD COLUMN IF NOT EXISTS genetic_data JSONB DEFAULT NULL;
   ```
7. Apply migration via Supabase MCP tool (`mcp__claude_ai_Supabase__execute_sql`).

### Verification
- `npx tsc --noEmit` passes with no errors
- Migration file exists in `supabase/migrations/`

### Exit criteria
- `GeneticData`, `GeneticCategory`, `GeneticCategoryNote` exported from `lib/types.ts`
- `DiagnosticReport.genetic_data` field exists in the type
- Migration applied to DB

---

## Step 2 — API: Save and Return Genetic Data
**Scope:** `app/api/reports/[id]/route.ts`
**Depends on:** Step 1
**Model:** Default

### Context brief
The PATCH handler saves: `report_title`, `report_date`, `lab_source`, `coach_summary`, `loom_url`, `loom_description`, `action_*` fields, `status`. It needs to also accept and save `genetic_data`. The GET returns the full row — if using `select('*')` it already returns the new column automatically.

### Tasks
1. Read `app/api/reports/[id]/route.ts` fully.
2. In the PATCH handler body destructuring, add `genetic_data`.
3. In the Supabase `.update({...})` call, conditionally include `genetic_data` only if defined in the body (`genetic_data !== undefined`).
4. Confirm GET handler returns `genetic_data` (automatic if using `select('*')`).

### Exit criteria
- PATCH `/api/reports/[id]` with `{ genetic_data: {...} }` persists and is returned on GET

---

## Step 3 — New Report Page: Genetics Creator
**Scope:** `app/(coach)/clients/[id]/reports/new/page.tsx`
**Depends on:** Step 1
**Model:** Default

### Context brief
Current file: 757 lines. When `reportType === 'genetics'`, the current tab 0 ("AI Prompt") shows the bloodwork extraction prompt asking for JSON arrays of marker_name/value/range. Tab 1 is "Manual Insights" — a simple title/description/category row repeater.

Target: genetics gets completely separate UI.

### Tab structure for genetics
Replace `geneticsTabs = ['AI Prompt', 'Manual Insights']` with `['AI Summary', 'Manual Entry']`.

### Tab 0 — AI Summary (genetics)
Two sub-steps (like bloodwork's "Copy Prompt" → "Paste Response"):

**Step 1 — Copy Prompt:**
Show the genetics-specific prompt below. Add Copy button + "Next: Paste Response →" button.

**Genetics AI Prompt** (replaces the bloodwork `AI_PROMPT` for genetics):
```
You are a genetics coaching assistant. I will give you a Nutrition Genome genetics report.

Convert it into structured coaching insights. Return ONLY a raw JSON object — no explanation, no markdown, no backticks. Start with { and end with }.

Use this exact structure:
{
  "overview": "2-3 sentence summary of the most important findings",
  "top_priorities": ["priority 1", "priority 2", "priority 3"],
  "category_notes": {
    "Macronutrient Metabolism": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "high|medium|low" },
    "Toxin Sensitivity": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "high|medium|low" },
    "Mental Health & Cognitive Performance": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "high|medium|low" },
    "Immune Support": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "high|medium|low" },
    "DNA Protection & Repair": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "high|medium|low" },
    "Methylation": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "high|medium|low" },
    "Hormone Support": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "high|medium|low" },
    "Cardiovascular Health & Athletic Performance": { "summary": "...", "key_findings": "...", "coaching_meaning": "...", "priority": "high|medium|low" }
  },
  "recommendations": {
    "nutrition": "...",
    "training": "...",
    "recovery": "...",
    "supplements": "..."
  },
  "grocery_list": ["food item 1", "food item 2"],
  "followup_bloodwork": ["Vitamin D", "ApoB", "LDL", "Glucose", "HbA1c", "Ferritin"]
}

Here is the Nutrition Genome report:
```

**Step 2 — Paste Response:**
- Textarea for AI JSON output
- "Parse & Preview →" button
- Parser: `JSON.parse(text)` → validate shape → store in `geneticData` state
- Show parsed summary preview (overview text, priority count, category count)

### Tab 1 — Manual Entry (genetics)
Sectioned form:

```
OVERVIEW
  textarea (overview)

TOP PRIORITIES
  textarea — "One priority per line" hint

CATEGORY NOTES — for each of the 8 GeneticCategory values:
  [Category Name] ▼  [Priority select: high/medium/low]
    Summary: textarea
    Key Findings: textarea
    Coaching Meaning: textarea

RECOMMENDATIONS
  Nutrition: textarea
  Training: textarea
  Recovery & Sleep: textarea
  Supplements: textarea

GROCERY LIST
  textarea — "One item per line" hint

BLOODWORK TO MONITOR
  textarea — "One marker per line" hint
```

### State
```typescript
const [geneticData, setGeneticData] = useState<GeneticData>({
  overview: '',
  top_priorities: [],
  category_notes: {},
  recommendations: { nutrition: '', training: '', recovery: '', supplements: '' },
  grocery_list: [],
  followup_bloodwork: [],
})
```

### Save handler
Replace old `handleConfirmGenetics()`:
1. POST `/api/reports` with `{ client_id, report_type: 'genetics', report_title, report_date, lab_source }`
2. PATCH `/api/reports/${report.id}` with `{ genetic_data: geneticData }`
3. Redirect to `/clients/${clientId}/reports/${report.id}/edit`

### Bloodwork path
Unchanged. All existing bloodwork tab code remains.

### Exit criteria
- Genetics creator shows zero bloodwork-specific UI
- AI Summary tab: genetics prompt, copy button, paste + parse step
- Manual Entry tab: all 8 category sections + recommendations + grocery list + followup bloodwork
- Save creates report with `genetic_data` populated

---

## Step 4 — Genetics Visual Components
**Scope:** New files in `components/genetics/`
**Depends on:** Step 1
**Model:** Default

### Context brief
New folder `components/genetics/`. All components use inline styles matching existing design tokens. No new dependencies. These are used in Step 5 (edit page) and Step 6 (client portal).

**Design tokens (match existing codebase):**
```
SURFACE = '#0F1827'   RAISED = '#131929'   BORDER = '#1A2A40'
TEXT_PRIMARY = '#E8F0FC'   TEXT_MUTED = '#8A9AB8'   TEXT_HINT = '#4A5A7A'
GREEN = '#3ECF8E'   AMBER = '#FBBF24'   RED = '#F87171'   GOLD = '#B89A5C'
```

**Priority colours:** `high → RED (#F87171)`, `medium → AMBER (#FBBF24)`, `low → GREEN (#3ECF8E)`

**Category icons (emoji):**
- Macronutrient Metabolism → 🍽️
- Toxin Sensitivity → 🧪
- Mental Health & Cognitive Performance → 🧠
- Immune Support → 🛡️
- DNA Protection & Repair → 🔬
- Methylation → ⚗️
- Hormone Support → ⚖️
- Cardiovascular Health & Athletic Performance → ❤️‍🔥

### Files to create

**`components/genetics/GeneticOverview.tsx`**
Props: `{ overview: string; topPriorities: string[] }`
- Gold-bordered card with overview text (13px, line-height 1.7)
- Below: numbered top priority list (max 5), each row has a count badge + text

**`components/genetics/GeneticCategoryGrid.tsx`**
Props: `{ categoryNotes: Partial<Record<GeneticCategory, GeneticCategoryNote>> }`
- 2-column CSS grid (minmax(280px, 1fr))
- Each card: emoji + category name header, priority badge (coloured by priority), summary text
- Expandable "Key findings" + "Coaching meaning" on click (`useState` expand toggle → `'use client'` required)
- Empty categories shown greyed-out

**`components/genetics/GeneticRecommendations.tsx`**
Props: `{ recommendations: GeneticData['recommendations'] }`
- 2×2 card grid: Nutrition, Training, Recovery & Sleep, Supplements
- Each: gold label, body text (12px, line-height 1.6)
- Only renders card if text is non-empty

**`components/genetics/GeneticGroceryList.tsx`**
Props: `{ items: string[] }`
- Section title: "DNA-Based Grocery List"
- Chip/tag grid: each food item is a pill badge (RAISED bg, BORDER, TEXT_MUTED text)

**`components/genetics/GeneticFollowupBloodwork.tsx`**
Props: `{ markers: string[] }`
- Section title: "Bloodwork to Monitor"
- Amber badge list — these are "watch" items

**`components/genetics/index.ts`**
Re-exports all 5 components.

### Exit criteria
- 5 component files + 1 index barrel created in `components/genetics/`
- All props typed using `GeneticData` / `GeneticCategory` / `GeneticCategoryNote` from `lib/types.ts`
- No TypeScript errors

---

## Step 5 — Edit Report Page: Genetics Display + Edit
**Scope:** `app/(coach)/clients/[id]/reports/[reportId]/edit/page.tsx`
**Depends on:** Steps 2, 4
**Model:** Default

### Context brief
Current file: 747 lines. Genetics section (lines 563–635) renders legacy insight rows. Replace with new visual components. The `useEffect` loads the report from `/api/reports/${reportId}` — after Step 2, `genetic_data` is in the response.

### Tasks

1. Import: `import type { GeneticData } from '@/lib/types'`
2. Import: `import { GeneticOverview, GeneticCategoryGrid, GeneticRecommendations, GeneticGroceryList, GeneticFollowupBloodwork } from '@/components/genetics'`
3. Add state:
   ```typescript
   const [geneticData, setGeneticData] = useState<GeneticData | null>(null)
   const [editingGenetics, setEditingGenetics] = useState(false)
   const [geneticDraft, setGeneticDraft] = useState<GeneticData | null>(null)
   ```
4. In `useEffect` data loader, add: `setGeneticData(data.genetic_data ?? null)`
5. Add save handler:
   ```typescript
   const saveGeneticData = async () => {
     if (!geneticDraft) return
     setSaving(true)
     await fetch(`/api/reports/${reportId}`, {
       method: 'PATCH',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ genetic_data: geneticDraft }),
     })
     setGeneticData(geneticDraft)
     setEditingGenetics(false)
     setSaving(false)
     setSaveMsg('Saved')
     setTimeout(() => setSaveMsg(''), 2000)
   }
   ```
6. Replace the genetics section (lines 563–635) with the new display:
   - If `!geneticData`: empty state with link to add via edit
   - If `editingGenetics && viewMode === 'coach'`: inline form (same sectioned structure as Step 3 Manual Entry tab, but for editing existing data)
   - Otherwise: render `GeneticOverview`, `GeneticCategoryGrid`, `GeneticRecommendations`, `GeneticGroceryList`, `GeneticFollowupBloodwork`
7. In coach view, show "Edit genetics data" toggle button above the genetics section.
8. Remove `insights` state, the `/api/reports/${reportId}/insights` fetch, `byInsightCat`, `CATEGORY_ORDER`, `CATEGORY_LABELS`, `PriorityBadge` — these were only used by the genetics insights path.

### Exit criteria
- Genetics edit page shows new visual components when `genetic_data` is populated
- Coach can click "Edit genetics data" → form → save → visual view returns
- Bloodwork path entirely unchanged
- No TypeScript errors

---

## Step 6 — Client Portal: Genetics View
**Scope:** `app/(client)/portal/reports/[reportId]/page.tsx`
**Depends on:** Steps 4, 5
**Model:** Default

### Context brief
This is a server component (no `'use client'` at top). It fetches report server-side via Supabase. `GeneticCategoryGrid` uses `useState` (expand toggle) so it requires a client boundary.

### Tasks
1. Read the full file.
2. After loading report, branch on `report.report_type`:
   - `'genetics'` → render `<GeneticsClientView geneticData={report.genetic_data} report={report} />`
   - `'bloodwork'` → existing bloodwork render unchanged
3. Create `components/genetics/GeneticsClientView.tsx` as `'use client'`:
   ```typescript
   'use client'
   import type { DiagnosticReport, GeneticData } from '@/lib/types'
   import { GeneticOverview, GeneticCategoryGrid, GeneticRecommendations, GeneticGroceryList, GeneticFollowupBloodwork } from '@/components/genetics'
   ```
   Props: `{ geneticData: GeneticData | null; report: DiagnosticReport }`
   - If no `geneticData`: show "Report is being prepared" placeholder
   - Otherwise: renders all 5 display components in order (same as edit page view mode)
   - No coach-only editing buttons
4. Add `GeneticsClientView` to the `components/genetics/index.ts` barrel.
5. Import `GeneticsClientView` in the server component via dynamic import if needed to avoid SSR issues (test first — it may be fine as a direct import since the parent is already server-side and the child is marked `'use client'`).

### Exit criteria
- Client navigates to a published genetics report and sees overview, category grid, recommendations, grocery list, follow-up bloodwork
- No bloodwork-style UI (no range bars, no marker tables, no health score ring)
- Bloodwork client view unchanged

---

## Step 7 — Cleanup: Remove Legacy Genetics Insight Code
**Scope:** `lib/types.ts`, `edit/page.tsx`, `new/page.tsx`
**Depends on:** Steps 3, 5 (must be done after those pages are rewritten)
**Model:** Default (can overlap with Steps 4/6 since it touches different lines)

### Tasks
1. `lib/types.ts`: Add comment above `InsightCategory`:
   ```typescript
   // Legacy — genetics reports now use GeneticData.category_notes instead.
   // Kept for schema compatibility with diagnostic_insights table.
   ```
2. `new/page.tsx`: Remove `insightRows` state, `setInsightRows`, and the old genetics manual insight row render (all replaced by Step 3).
3. `edit/page.tsx`: Confirm removal of `insights` state, fetch, `byInsightCat`, `CATEGORY_ORDER`, `CATEGORY_LABELS`, `PriorityBadge` (done in Step 5 — this step just double-checks and catches anything missed).
4. API route files `app/api/reports/[id]/insights/` — leave in place (no UI calls them anymore but removing APIs is low priority and risks breaking anything that might reference them).

### Exit criteria
- No dead insight-loading code in `new/page.tsx` or `edit/page.tsx`
- `npx tsc --noEmit` passes
- `npm run build` succeeds

---

## Execution Order

```
Step 1 (Types + DB) ──┬──> Step 2 (API)
                       ├──> Step 3 (New page)
                       ├──> Step 4 (Components) ──> Step 5 (Edit page) ──> Step 6 (Client portal)
                       └──> Step 7 (Cleanup — after Steps 3 and 5)
```

**Recommended solo sequence:**
1. Step 1 → Step 2 (serial, ~20 min)
2. Step 4 (components — no page dependencies yet, ~45 min)
3. Step 3 (new page genetics creator, ~40 min)
4. Step 5 (edit page — needs Steps 2 + 4, ~30 min)
5. Step 6 (client portal — needs Step 4, ~20 min)
6. Step 7 (cleanup — last, ~15 min)

---

## Rollback

- Each step edits specific files. `git restore <file>` reverts any step.
- DB: `ALTER TABLE diagnostic_reports DROP COLUMN genetic_data;`
- No destructive DB changes — only `ADD COLUMN IF NOT EXISTS`.

---

## Anti-Patterns to Avoid

- Do NOT give genetics a health_score ring — bloodwork-specific
- Do NOT use `marker_name / value / reference_range_low / reference_range_high` for genetics anywhere
- Do NOT show the bloodwork AI extraction prompt for genetics
- Do NOT put genetics category logic in bloodwork code paths
- Do NOT create a new DB table for genetics — extend `diagnostic_reports` with JSONB
- Do NOT write to `diagnostic_insights` for genetics going forward
- Keep each new component under 300 lines

---

## Files Changed (Summary)

| File | Change |
|------|--------|
| `lib/types.ts` | Add `GeneticCategory`, `GeneticCategoryNote`, `GeneticData` types; add `genetic_data` to `DiagnosticReport` |
| `supabase/migrations/20260419000000_add_genetic_data.sql` | `ADD COLUMN genetic_data JSONB` |
| `app/api/reports/[id]/route.ts` | Accept + save `genetic_data` in PATCH |
| `app/(coach)/clients/[id]/reports/new/page.tsx` | Genetics creator: new tabs, genetics AI prompt, structured manual entry, new save handler |
| `components/genetics/GeneticOverview.tsx` | New |
| `components/genetics/GeneticCategoryGrid.tsx` | New |
| `components/genetics/GeneticRecommendations.tsx` | New |
| `components/genetics/GeneticGroceryList.tsx` | New |
| `components/genetics/GeneticFollowupBloodwork.tsx` | New |
| `components/genetics/GeneticsClientView.tsx` | New |
| `components/genetics/index.ts` | New barrel export |
| `app/(coach)/clients/[id]/reports/[reportId]/edit/page.tsx` | Replace genetics section with new visual components + edit form |
| `app/(client)/portal/reports/[reportId]/page.tsx` | Branch by `report_type`, render genetics client view |
