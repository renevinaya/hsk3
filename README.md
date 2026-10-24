# HSK 3 词汇

A vocabulary quiz for the new HSK 3 exam, with spaced repetition, built with Vue 3, TypeScript, and Bulma.

**[Play it here](https://renevinaya.github.io/hsk3/)**

## How it works

Each round asks 30 words. For each word, pick the right English meaning from four options. The wrong answers share the word's part of speech, so the form of a meaning ("to …", "measure word for …") gives nothing away. After you answer, the pinyin appears, and every option shows the word it belongs to.

Words in box 3 or higher (see below) ask for the pinyin first, then the meaning, and only count as right if both answers are. The three wrong pinyin options are picked at random from the six spellings in the list that are most similar to the right one: the same number of syllables first, then the fewest changed letters, where the same letter with another tone counts half. Readings the characters have in other words are left out, so 好 never gets hào (as in 爱好) as a wrong answer.

Which 30 words come up is decided by a Leitner system:

1. Words that are due, longest overdue first.
2. New words, all of HSK 1 before HSK 2 and HSK 2 before HSK 3.
3. If that is still not 30, the words that will be due soonest.

A right answer moves a word up one box, a wrong answer sends it back to box 0. The box sets when the word is due again:

| Box | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Due again after | same day | 1 day | 3 days | 7 days | 14 days | 30 days | 60 days | 120 days |
| Asks | meaning | meaning | meaning | pinyin + meaning | pinyin + meaning | pinyin + meaning | pinyin + meaning | pinyin + meaning |

The start screen counts the words that are due today, new, learning (box 0–4) and known (box 5 and up).

Everything is saved in the browser's `localStorage`: the boxes and due dates (`hsk3.progress`), the round in progress (`hsk3.round`, so a reload carries on where it stopped, even between the pinyin and the meaning) and the interface language (`hsk3.language`). Progress therefore stays on one device and in one browser. **Reset progress** on the start screen deletes it.

The interface is available in German and English; the word meanings are in English.

## Word list

All 1,000 words come from [`vocabulary.md`](vocabulary.md), which the app reads at build time. It holds the HSK 1–3 words of the official 2025 HSK syllabus, which the new HSK 3.0 exams use from 13 December 2026, and says where the list comes from. Keep the table format when editing it: one word per row, `| No. | Level | Word | Pinyin | Part of speech | English |`.

## Tech stack

- [Vue 3](https://vuejs.org/) with `<script setup>` and TypeScript
- [Bulma](https://bulma.io/) CSS framework (only the needed Sass modules are imported; PurgeCSS and postcss-prune-var strip unused CSS)
- [Vite](https://vite.dev/) build tool
- Deployed to GitHub Pages via GitHub Actions

## Development

Requires Node.js 20.19+ or 22.12+ (needed by Vite 8).

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # type-check + production build
npm run preview  # serve the production build locally
```

The spaced repetition schedule lives in `src/srs.ts`, how a round is put together in `src/quiz.ts`, and the `localStorage` handling in `src/storage.ts`. UI strings are in `src/translations.ts`.
