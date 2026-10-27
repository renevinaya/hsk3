# HSK 3 词汇

A vocabulary quiz for the new HSK 3 exam, with spaced repetition, built with Vue 3, TypeScript, and Bulma.

**[Play it here](https://renevinaya.github.io/hsk3/)**

## How it works

### Rounds

Each round asks 30 questions in mixed order: 20 words and 10 characters to write. If one of the two runs short of words or characters that are due or new, the other one fills the round: with only 3 characters due or new, for example, a round has 27 words and 3 characters. Only when both run short are words, and then characters, asked before they are due.

### Words

For each word, pick the right meaning from four options, in the language of the interface. The wrong answers share the word's part of speech, so the form of a meaning ("to …", "measure word for …") gives nothing away. After you answer, the pinyin appears, and every option shows the word it belongs to.

Words in box 3 or higher (see below) ask for the pinyin first, then the meaning, and only count as right if both answers are. The three wrong pinyin options are picked at random from the six spellings in the list that are most similar to the right one: the same number of syllables first, then the fewest changed letters, where the same letter with another tone counts half. Readings the characters have in other words are left out, so 好 never gets hào (as in 爱好) as a wrong answer.

Some hanzi are easy to mix up. They are listed in `LOOK_ALIKES` in `src/quiz.ts`, as single characters or whole words (so far 七/九, 己/已, 电影/电视, 买/卖 and 左/右). A word that contains one of them always gets a word with the other as a wrong meaning (the word with the other swapped in if there is one), and the word read with the other as a wrong pinyin: 买 gets 卖 and mài, 自己 gets 已经 and zìyǐ, 电影院 gets 电视 and diànshìyuàn.

Which words come up is decided by a Leitner system:

1. Words that are due, longest overdue first.
2. New words, all of HSK 1 before HSK 2 and HSK 2 before HSK 3.
3. If that is still not enough, the words that will be due soonest.

A right answer moves a word up one box, a wrong answer sends it back to box 0. The box sets when the word is due again:

| Box | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Due again after | same day | 1 day | 3 days | 7 days | 14 days | 30 days | 60 days | 120 days |
| Asks | meaning | meaning | meaning | pinyin + meaning | pinyin + meaning | pinyin + meaning | pinyin + meaning | pinyin + meaning |

The start screen counts the words that are due today, new, learning (box 0–4) and known (box 5 and up).

### Handwriting

The exam also asks you to write 250 characters by hand (the syllabus's 书写字: 100 for HSK 1–2, 150 for HSK 3). Like the first writing task of the exam, a handwriting question shows a word from the list with one character missing, the pinyin above the gap and the word's meaning, and you write the missing character in the box, stroke by stroke. [Hanzi Writer](https://hanziwriter.org/) checks every stroke: its shape, direction and the stroke order. A stroke that is still wrong after three tries is shown, and the character then counts as not known. A character you have never written before first shows its stroke order.

The characters are picked and scheduled with the same Leitner boxes as the words, but with boxes of their own: all of HSK 1–2 before HSK 3.

### Streak and saving

To help you learn every day, the start screen and the end of each round show your streak: the days in a row on which you finished at least one round, and your best streak. The 🔥 stays grey until today's round is done; a day without a finished round sets the streak back to 0.

Everything is saved in the browser's `localStorage`: the boxes and due dates (`hsk3.progress`), the handwriting boxes (`hsk3.writing`), the round in progress (`hsk3.round`, so a reload carries on where it stopped, even between the pinyin and the meaning), the streak (`hsk3.streak`) and the interface language (`hsk3.language`). Progress therefore stays on one device and in one browser. **Reset progress** on the start screen deletes all of it except the language.

The interface and the word meanings are available in German and English. The German meanings are translated from the Chinese words, not from the English ones.

## Word list

All 1,000 words and the 250 characters to write come from [`vocabulary.md`](vocabulary.md), which the app reads at build time. It holds the HSK 1–3 words of the official 2025 HSK syllabus, which the new HSK 3.0 exams use from 13 December 2026, and says where the list comes from. Keep the table format when editing it: one word per row, `| No. | Level | Word | Pinyin | Part of speech | English | Deutsch |`.

## Tech stack

- [Vue 3](https://vuejs.org/) with `<script setup>` and TypeScript
- [Bulma](https://bulma.io/) CSS framework (only the needed Sass modules are imported; PurgeCSS and postcss-prune-var strip unused CSS)
- [Vite](https://vite.dev/) build tool
- [Hanzi Writer](https://hanziwriter.org/) (MIT) for the handwriting check. It loads the stroke data of each character from jsDelivr ([hanzi-writer-data](https://github.com/chanind/hanzi-writer-data), from the [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) project under the Arphic Public License), so handwriting needs an internet connection.
- Deployed to GitHub Pages via GitHub Actions

## Development

Requires Node.js 20.19+ or 22.12+ (needed by Vite 8).

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # type-check + production build
npm run preview  # serve the production build locally
```

The spaced repetition schedule lives in `src/srs.ts`, the questions in `src/quiz.ts` (handwriting: `src/writing.ts` and `src/WritingQuestion.vue`), how a round is put together in `src/round.ts`, the streak in `src/streak.ts`, and the `localStorage` handling in `src/storage.ts`. UI strings are in `src/translations.ts`.
