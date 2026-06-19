# Test Aggregator

A standalone single-page React application for managing and taking quizzes/tests, organized in a **Section → Subsection → Topic → Question** hierarchy. Built for self-study workflows where you need to track which questions you've seen, mark favorites, and grade questions by reliability (verified / official).

## Features

### 📚 Question Bank Management (`База питань`)
- Browse the full hierarchy of sections, subsections, and topics via a sidebar
- View, edit, and delete individual questions
- Add questions one at a time, or **bulk import via JSON** (see Import Formats below)
- Two bulk-import modes:
  - **Single-topic import** — paste an array of questions into the currently selected topic
  - **Multi-import** — paste a mixed array where each question specifies its own `sec`/`sub`/`top` index, distributing questions across the entire database in one go
- Copy any scope (a single topic, a whole subsection, a whole section, or the entire database) to the clipboard as JSON
- Global dashboard with aggregate stats: total sections, total questions, seen/favorite/verified/official counts

### 📝 Question Metadata
Each question supports:
- `status`: `"official"` (★★ — sourced from an authoritative exam bank) or `"verified"` (★ — manually checked)
- `favorite`: boolean, toggled via a 🔥 icon, for marking questions you want to revisit
- `seen`: boolean, automatically set once you've answered the question at least once during a test

### ✅ Test Taking (`Пройти тест`)
Three test-generation modes:
- **Detailed (Advanced)** — pick how many random questions to pull from each section / subsection / topic independently
- **Quick Shuffle** — grabs 1–2 random questions from every section for a fast mixed review
- **By Section** — run a focused test on one specific section, or all of them

Additional filters before generating a test:
- Only unseen (new) questions
- Only favorites
- Only verified (★)
- Only official (★★)

During a test, you can:
- Select an answer, then reveal the correct one (locks further changes for that question)
- View the source path (section → subsection → topic) for any question
- Edit or delete a question inline, even mid-test
- Toggle favorites without leaving the test
- Finish the test to see your score, then filter the results to show only your mistakes ("Робота над помилками")

### 💾 Persistence
- All changes (edits, new questions, favorites, seen-state) are persisted to **`localStorage`** automatically on every change
- **Reset changes** — wipes localStorage and reloads the original `questions.json` from disk, discarding all unsaved edits
- **Save to file** — sends the current in-memory database to a local helper server (`POST http://localhost:3001/api/save`) which overwrites `src/data/questions.json` on disk, making your changes permanent across browser sessions/cache clears

> ⚠️ The "Save to file" button requires a small local save server (e.g. `saver.js`) running on port `3001`. Without it, your data still works fine via `localStorage`, but won't survive a localStorage clear.

## Project Structure

```
src/
├── App.js                  # Root component: tabs, header actions, save/reset confirm modals
├── data/
│   └── questions.json      # Source-of-truth question database (hierarchical)
├── hooks/
│   └── useData.js          # (alt/legacy) data hook: load/persist/CRUD helpers, JSON import/export
└── components/
    ├── Sidebar.js           # Section/subsection/topic navigation tree
    ├── ManageQuestions.js   # Question bank browser, editor, bulk-copy actions, global stats
    ├── TakeTest.js          # Test generation, in-test interaction, scoring, inline edit/delete
    ├── AddModal.js          # Add-question modal (single + bulk/multi-import JSON)
    ├── ConfirmModal.js      # Reusable confirm/cancel dialog (save, reset, delete)
    └── Icons.js             # Inline SVG icon components
```

> Note: the codebase currently has two parallel data-access patterns — direct `useState`/`localStorage` logic inlined in `App.js`, and a more fully-featured `useData.js` hook (with `addQuestion`, `addQuestions`, `addTopic`, `addSubsection`, `addSection`, `exportJSON`, `importJSON`, etc.). If consolidating, `useData.js` is the more complete implementation and a good candidate to fully replace the inline logic in `App.js`.

## Data Model

```json
{
  "sections": [
    {
      "id": "s1",
      "title": "РОЗДІЛ 1: ...",
      "subsections": [
        {
          "id": "sub1",
          "title": "1.1. ...",
          "topics": [
            {
              "id": "t1",
              "title": "1.1.1. ...",
              "questions": [
                {
                  "id": "q1",
                  "q": "Question text?",
                  "a": ["Option A", "Option B", "Option C", "Option D"],
                  "correct": 1,
                  "status": "verified",
                  "favorite": false,
                  "seen": false
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Bulk Import Formats

Questions can be pasted as JSON through the "Add Question" modal in two formats:

**1. Single-topic import** (target topic already selected in the sidebar — no indices needed):
```json
[
  {
    "q": "Question text?",
    "a": ["A", "B", "C", "D"],
    "correct": 1,
    "status": "verified"
  }
]
```

**2. Multi-import** (distributes questions across the whole database — `sec`/`sub`/`top` indices required, 0-based):
```json
[
  {
    "sec": 7, "sub": 0, "top": 1,
    "q": "Question text?",
    "a": ["A", "B", "C", "D"],
    "correct": 1,
    "status": "official"
  }
]
```

| Field | Type | Notes |
|---|---|---|
| `sec`, `sub`, `top` | number | 0-based indices. Required for multi-import only. |
| `q` | string | Question text. Escape quotes as `\"`, use `\n` for line breaks. |
| `a` | string[] | Answer options (4 recommended). |
| `correct` | number | 0-based index into `a` of the correct answer. |
| `status` | string (optional) | `"official"` (★★) or `"verified"` (★). Omit for a plain question. |

A full index map of every section/subsection/topic (with their 0-based coordinates) is maintained separately to make multi-import authoring easier — see the import instructions document for the current map.

## Tech Stack

- **React** (functional components + hooks, no external state library)
- **localStorage** for client-side persistence
- Plain CSS classes (`btn`, `card`, `overview-grid`, etc. — assumed defined in a global stylesheet)
- Optional local Node helper server for writing changes back to `questions.json` on disk

## Known Limitations / Ideas for Improvement

- "Save to file" silently depends on an external server being run separately; no built-in fallback UI to detect if it's offline