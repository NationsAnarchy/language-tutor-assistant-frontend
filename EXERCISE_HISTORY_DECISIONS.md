# Exercise History: Product and Technical Decisions

This document is a checklist for the proposed **exercise history** feature.
It records the decisions to make before implementation, recommended initial
choices, and the relationship to the application's current exercise flow.

## Current Behavior

The application currently persists only `last_exercise`, which represents the
single active exercise used to route the learner's next message for grading.

1. The learner requests practice through the existing chat stream.
2. The backend generates an exercise and sets `last_exercise.active` to `true`.
3. The next learner message is treated as that exercise's answer.
4. The response/grading flow clears the active state.
5. Chat history, active exercise state, and mistake history are saved atomically.

This does **not** preserve a durable record of previous prompts, answers, or
grading feedback.

The proposed feature adds a persistent `exercise_log` while retaining
`last_exercise` as the active-work pointer:

```text
last_exercise  -> What is the learner currently answering?
exercise_log   -> Which exercises did the learner receive, and what happened?
```

---

## 1. Scope and Learner Experience

### 1.1 Which exercises belong in history?

- Only completed exercises?
- Every successfully generated exercise?
- Exercises that were replaced or abandoned before an answer?

**Recommended:** Record every successfully generated exercise. Give each one a
status so unfinished work is not silently lost.

### 1.2 What can learners do with historical exercises?

- Read prompt, answer, and feedback only?
- Retry or reopen an old exercise?
- Generate a similar follow-up exercise?
- Delete an individual item?
- Archive or ignore an item?

**Recommended v1:** Read-only review. Retrying or reopening changes the active
exercise lifecycle and should be designed separately.

### 1.3 Where should exercise history be shown?

- A collapsible panel in the chat screen, next to **Mistakes to Review**?
- A tab or section inside the current exercise drawer?
- A dedicated history page?
- The session sidebar?

**Recommended:** A collapsible chat-screen panel modeled after the existing
mistakes panel. It keeps review separate from the active exercise drawer.

### 1.4 How visible should the entry point be?

- Always-visible button or icon?
- Only show after the session has an exercise?
- Display a count badge, such as `Exercises (4)`?
- Put the control inside the exercise drawer header?

**Recommended:** Always show an unobtrusive button/icon, optionally with a
count once exercises exist.

---

## 2. Exercise Lifecycle and Statuses

### 2.1 What happens when a new exercise replaces an active one?

Options:

1. Discard the old active exercise.
2. Mark it `superseded`.
3. Mark it `abandoned`.
4. Ask for confirmation before replacing it.
5. Support multiple active exercises.

**Recommended:** Generate the new exercise and mark the old one `superseded`.
Keep the current fast "New exercise" interaction without a confirmation dialog.

### 2.2 Which statuses are required?

Potential statuses:

- `active`: currently awaiting an answer;
- `completed`: an answer was submitted and the turn was finalized;
- `superseded`: replaced by another generated exercise;
- `abandoned`: explicitly dismissed by the learner;
- `grading_failed`: answer submitted but a structured grade was unavailable.

**Recommended v1:** `active`, `completed`, and `superseded`. Add `abandoned`
only with an explicit dismiss/cancel interaction.

### 2.3 What counts as completion?

- Does any submitted answer complete the record even if structured grading fails?
- Must the grade tool return a parsed grade for completion?
- Can a completed record have unknown correctness?

**Recommended:** Mark an entry completed whenever the answer turn is finalized,
but represent unavailable grading with nullable correctness and feedback:

```text
correct: true | false | null
feedback: string | null
```

### 2.4 Can learners make multiple attempts at one exercise?

- Keep the present one-answer-only behavior?
- Permit retries after an incorrect answer?
- Record all attempts in an `attempts[]` list?
- Replace the prior submitted answer?

**Recommended v1:** Preserve one answer per generated exercise. Retrying needs
a deliberate attempt model and can be a later feature.

---

## 3. Information Stored Per Exercise

### 3.1 Candidate record fields

| Field | Reason |
| --- | --- |
| Stable exercise ID | Reliably updates the same item when grading completes. |
| Prompt | Lets learners review what they were asked. |
| Practice type | Provides context and enables future filtering. |
| Language and level | Preserves generation context. |
| Status | Distinguishes active, completed, and replaced work. |
| Creation timestamp | Enables chronological review. |
| Submitted answer | Lets learners revisit their work. |
| Feedback | Preserves tutor guidance. |
| Correctness outcome | Enables an outcome indicator and future summaries. |
| Completion timestamp | Supports ordering and later progress features. |

**Recommended v1 shape:**

```json
{
  "id": "uuid",
  "status": "completed",
  "practice_type": "grammar",
  "language": "en",
  "level": "beginner",
  "prompt": "...",
  "created_at": "ISO-8601 timestamp",
  "submitted_answer": "...",
  "feedback": "...",
  "correct": true,
  "completed_at": "ISO-8601 timestamp"
}
```

### 3.2 Should audio be included in history?

- Save prompt and feedback audio references?
- Regenerate audio when history is opened?
- Omit dedicated history audio?

**Recommended v1:** Omit dedicated audio fields. Prompts and feedback remain
available as text, while audio cache retention can be designed later.

### 3.3 Should exercises have titles or topic summaries?

- Derive a title from practice type?
- Use the first prompt line?
- Ask the LLM to produce a title?
- Store normalized curriculum topics?

**Recommended v1:** Derive the visible label from `practice_type`. Do not add
another LLM call or rely on free-form titles.

### 3.4 Raw prompt versus structured exercise data

- Save the current generated Markdown/string prompt?
- Redesign generation to emit structured `question`, `instructions`,
  `expected_answer`, and `topic` fields?

**Recommended v1:** Save the existing prompt string. Structured content is
valuable but is a broader tool/contract redesign and should not block history.

---

## 4. Correctness, Grading, and Mistakes

### 4.1 How should correctness be represented?

- Boolean only: `true` / `false`?
- Tri-state: `true` / `false` / `null`?
- Rich outcomes: correct, partially correct, incorrect, unavailable?
- Numeric score or rubric?

**Recommended:** Start with `true | false | null`. The `null` state avoids
claiming an outcome when grading is unavailable or inconclusive.

### 4.2 Should partial correctness be modeled?

Writing and translation may not have a simple correct/incorrect result.

- Keep nullable boolean correctness only?
- Add `partial`?
- Add a score?
- Save rubric-level criteria?

**Recommended v1:** Preserve the current grading behavior. Do not invent more
precision than the structured grading result supports.

### 4.3 How much feedback should appear in history?

- Entire tutor feedback?
- A generated summary?
- Separate correction and explanation fields?
- Expand/collapse long feedback?

**Recommended:** Store and display the formatted feedback currently produced;
use expandable UI for long entries.

### 4.4 Should exercise records link to mistake records?

- Keep mistake logging independent?
- Attach IDs for mistake records created during grading?
- Derive all mistakes from exercise feedback?

**Recommended v1:** Keep the systems independent. Linking is useful later but
requires reliable identifiers for potentially multiple mistakes per exercise.

---

## 5. Data Model and Storage

### 5.1 JSON column or relational table?

#### Option A: `exercise_log` JSON field on the `sessions` row

Advantages:

- Mirrors the existing `mistake_log` design.
- Requires a small, idempotent SQLite migration.
- Fits the existing atomic `save_turn()` transaction.
- Suitable for modest per-session exercise counts.

Trade-offs:

- Less convenient for filtering, pagination, and analytics.
- Session rows grow with exercise history.

#### Option B: Separate `exercise_history` table

Advantages:

- Better queryability, filtering, pagination, and cross-session analytics.
- Better long-term scalability.

Trade-offs:

- More schema and transactional complexity.
- Requires coordinated write logic with the saved chat turn.

**Recommended v1:** Add JSON `exercise_log` to `sessions`. Revisit a dedicated
table if user-wide analytics, search, or large histories become requirements.

### 5.2 How much history should be retained?

- Unlimited per session?
- Latest 50, 100, or 200 records?
- Time-based retention?
- User-configurable retention?

**Recommended:** Keep all entries initially for typical small sessions. Add a
documented cap, such as the latest 100–200, if row size becomes a concern.

### 5.3 What ordering should be used?

- Store oldest-first and display newest-first?
- Store newest-first and display as stored?
- Separate active work from past work?

**Recommended:** Append chronologically in storage and return/display newest
first. Label active or incomplete entries clearly.

### 5.4 How should legacy sessions work?

- Default missing `exercise_log` to an empty list?
- Reconstruct exercises from chat history?
- Run a one-time history reconstruction migration?

**Recommended:** Default to `[]` and record only future exercises. Parsing old
unstructured conversation could produce inaccurate historical records.

### 5.5 Should normal session reads contain the whole log?

- Include exercise history in `GET /session/{id}`?
- Provide a dedicated history endpoint?
- Return only an exercise count in session metadata?

**Recommended:** Add a dedicated endpoint so normal session loading stays small
as histories grow.

---

## 6. API Contract

### 6.1 Read endpoint

Proposed endpoint:

```http
GET /session/{session_id}/exercises
```

It must use the application's existing authentication and session-ownership
checks, like the mistakes endpoint.

### 6.2 Pagination and filters

Possible API capabilities:

- Return every record initially;
- limit/cursor or page/offset pagination;
- filter by practice type, status, correctness, language, level, or date range.

**Recommended v1:** Return all records for modest log sizes and no server-side
filters. Add pagination with a relational table if/when scale requires it.

### 6.3 Mutating history

Potential future actions:

- Delete one record;
- clear all history;
- mark an entry abandoned;
- reopen an old exercise;
- export exercise history.

**Recommended v1:** Read-only history. The existing chat/practice flow remains
the only writer.

### 6.4 Session lifecycle and privacy

Exercise history includes learner-authored answers. It must follow the same
ownership, deletion, export, and privacy rules as chat history.

---

## 7. Frontend Presentation

### 7.1 How should entries be rendered?

Options:

- Compact rows with status, type, date, and prompt preview;
- expandable cards with prompt, answer, and feedback;
- dedicated detail pages.

**Recommended v1:** Expandable cards. They provide useful review without making
the chat screen overwhelming.

### 7.2 Should incomplete items be visible?

- Show every status together?
- Show completed only?
- Separate an "Incomplete" section?
- Hide superseded items by default?

**Recommended:** Show completed entries by default and optionally group active
or superseded items under an "Incomplete" section. The active exercise remains
primarily visible in the exercise drawer.

### 7.3 Do we need search or filters in the UI?

- Filter by practice type?
- Filter by completion/outcome?
- Search prompt/feedback text?
- Date-range filter?

**Recommended v1:** Chronological list only. Add a practice-type filter once
there are enough records to make it useful.

### 7.4 UI state and timestamps

Decide whether the panel's open state resets on a session switch or persists in
the browser. Timestamps may be absolute, relative, or both.

**Recommended:** Use local component state that resets on session changes, and
display localized date/time with an accessible full timestamp.

### 7.5 Long content and Markdown

Prompts and feedback can be long and use Markdown.

**Recommended:** Use the existing safe Markdown configuration and provide
expand/collapse behavior for long prompt, answer, or feedback content.

---

## 8. Relationship to the Active Exercise Drawer

### 8.1 Should unfinished exercises restore when resuming a session?

The backend already persists `last_exercise`, but the frontend currently resets
its local `currentExercise` when a conversation changes.

Questions:

- Should the active prompt automatically reopen in the exercise drawer?
- Should there be an "unfinished exercise" banner?
- Should a learner deliberately reopen it from history instead?

**This is the most important separate decision before implementation.**
Restoring the active exercise provides a better durable-learning experience, but
it expands the first release beyond read-only history.

### 8.2 Should historical exercises be reopened or retried?

If supported later, decide:

- Does reopening make it the single active exercise?
- Does it create a new attempt or overwrite the original record?
- Is it allowed only for unfinished entries?

**Recommended v1:** Defer this. It needs a clear multi-attempt model and careful
interaction with answer routing.

### 8.3 What if the learner wants normal chat while an exercise is active?

Currently, a next learner message can be routed as an answer while an exercise
is active. Consider a future explicit "Cancel exercise / return to chat" action
that marks the item abandoned. This is optional for the history feature but may
make the lifecycle clearer.

---

## 9. Reliability and Failure Handling

### 9.1 Generation succeeds but persistence fails

Should the application show an exercise that was not saved?

**Recommended:** No. Preserve the current model in which the complete turn is
saved before streaming. Do not show durable-looking history/work that cannot be
persisted.

### 9.2 Grading succeeds but history update fails

Chat history, mistakes, active exercise state, feedback, and exercise history
should remain in the same atomic turn save. They should not drift apart.

**Recommended:** Preserve atomic `save_turn()` persistence and report a save
failure rather than showing a partially persisted turn.

### 9.3 Malformed or missing log records

- Fail the history request?
- Return partially valid data?
- Skip malformed entries with backend logging?

**Recommended:** Validate on read/write, skip malformed legacy entries with a
warning, and return valid records rather than failing the entire history panel.

### 9.4 Duplicate answer submissions

The update should target the active exercise by stable ID and be idempotent
where practical. A completed item must not gain duplicate completion data on a
network retry.

---

## 10. Security, Privacy, and Accessibility

### Security and privacy requirements

- Exercise history requests must enforce authentication and session ownership.
- Session/account deletion must remove exercise answers along with chat data.
- Future exports should include exercise history if they include session data.
- Apply reasonable content-length and validation limits to stored learner text.

### Accessibility requirements

- Use semantic headings and accessible expand/collapse controls.
- Maintain keyboard operation and predictable focus behavior.
- Provide screen-reader-friendly loading, empty, error, and status messages.
- Do not use color as the only correctness/status indicator.

---

## 11. Future Analytics Considerations

These do not need to be implemented now, but can influence the record shape.

Potential future features:

- completion rate;
- accuracy by practice mode;
- progress over time;
- streaks;
- recurring weak areas;
- user-wide history across sessions;
- normalized topic/skill tags.

**Recommended foundation now:** Persist reliable timestamps, practice type,
status, language/level, and nullable correctness. Defer free-form topic tags,
scores, and cross-session dashboards until grading and curriculum identifiers
are consistently structured.

---

## Recommended v1 Baseline

1. Record every successfully generated exercise.
2. Use statuses: `active`, `completed`, and `superseded`.
3. Retain `last_exercise` for current answer-grading state and link it to the
   history record through a stable exercise ID.
4. Store prompt, practice type, language, level, timestamps, submitted answer,
   feedback, and nullable correctness.
5. Add JSON `exercise_log` persistence to the existing session row.
6. Save it atomically with chat history, active exercise state, and mistakes in
   the existing turn transaction.
7. Add authenticated `GET /session/{session_id}/exercises`.
8. Add a read-only, collapsible Exercise History panel to the chat screen.
9. Display newest-first expandable cards.
10. Treat existing sessions as having an empty history; do not reconstruct old
    exercise records from chat.
11. Defer retries/reopening, deletion, filters, analytics, and dedicated audio
    history.
12. Decide whether an active unfinished exercise should restore into the drawer
    when a learner resumes a session.
