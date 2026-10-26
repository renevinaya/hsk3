const languages = ['de', 'en'] as const
export type language = typeof languages[number]

export function getBrowserLanguage(): language {
  for (const lang of languages) {
    if (navigator.language.startsWith(lang)) return lang
  }
  return 'en'
}

export const displayNames: Record<language, string> = {
  de: 'Deutsch',
  en: 'English',
}

export const ui: Record<string, Record<language, string>> = {
  tagline:        { en: 'Learn the 1,000 words for HSK 3',                                                    de: 'Lerne die 1.000 Wörter für HSK 3' },
  intro:          { en: "Each round asks {n} words — pick the right meaning from 4 options. Once you have got a word right three times in a row, you pick its pinyin first. Words you miss come back in the next round, words you know after longer and longer breaks.",
                    de: 'Jede Runde fragt {n} Wörter ab — wähle die richtige Bedeutung aus 4 Optionen. Die Bedeutungen sind auf Englisch. Hast du ein Wort dreimal in Folge gewusst, wählst du zuerst sein Pinyin. Falsch beantwortete Wörter kommen in der nächsten Runde wieder, gewusste nach immer längeren Pausen.' },
  due:            { en: 'Due today',                                                                          de: 'Heute fällig' },
  unseen:         { en: 'New',                                                                                de: 'Neu' },
  learning:       { en: 'Learning',                                                                           de: 'In Übung' },
  known:          { en: 'Known',                                                                              de: 'Sicher' },
  streakDay:      { en: 'day in a row',                                                                       de: 'Tag in Folge' },
  streakDays:     { en: 'days in a row',                                                                      de: 'Tage in Folge' },
  streakDone:     { en: 'Done for today. See you tomorrow!',                                                  de: 'Für heute geschafft. Bis morgen!' },
  streakKeep:     { en: 'Finish a round today to keep your streak.',                                          de: 'Schließe heute eine Runde ab, damit deine Serie hält.' },
  streakStart:    { en: 'Finish a round every day to build a streak.',                                        de: 'Schließe jeden Tag eine Runde ab, um eine Serie aufzubauen.' },
  streakBest:     { en: 'Best: {n}',                                                                          de: 'Rekord: {n}' },
  startBtn:       { en: 'Start Round',                                                                        de: 'Runde starten' },
  questionPinyin: { en: 'How is this word pronounced?',                                                       de: 'Wie spricht man dieses Wort aus?' },
  question:       { en: 'What does this word mean?',                                                          de: 'Was bedeutet dieses Wort?' },
  complete:       { en: 'Round Complete!',                                                                    de: 'Runde abgeschlossen!' },
  mistakes:       { en: 'Words to review',                                                                    de: 'Wörter zum Wiederholen' },
  playAgain:      { en: 'Next Round',                                                                         de: 'Nächste Runde' },
  writingTitle:   { en: 'Handwriting',                                                                        de: 'Handschrift' },
  writingIntro:   { en: 'The exam asks you to write {n} characters by hand. Each round asks {r} of them: write the character missing from a word, stroke by stroke, with its pinyin above the gap.',
                    de: 'In der Prüfung musst du {n} Zeichen von Hand schreiben. Jede Runde fragt {r} davon ab: Schreib das Zeichen, das in einem Wort fehlt, Strich für Strich, mit dem Pinyin über der Lücke.' },
  startWriting:   { en: 'Start Writing',                                                                      de: 'Schreiben üben' },
  writingPrompt:  { en: 'Write the missing character',                                                        de: 'Schreib das fehlende Zeichen' },
  writingDemo:    { en: 'New character: watch the stroke order',                                              de: 'Neues Zeichen: Sieh dir die Strichfolge an' },
  writingRight:   { en: 'Right!',                                                                             de: 'Richtig!' },
  writingHint:    { en: 'Needed a hint, so it comes back soon',                                               de: 'Mit Hinweis, es kommt bald wieder' },
  writingError:   { en: 'Could not load the strokes. Check your internet connection and reload the page.',    de: 'Die Striche konnten nicht geladen werden. Prüfe die Internetverbindung und lade die Seite neu.' },
  writingReview:  { en: 'Characters to review',                                                               de: 'Zeichen zum Wiederholen' },
  back:           { en: 'Back',                                                                               de: 'Zurück' },
  reset:          { en: 'Reset progress',                                                                     de: 'Fortschritt zurücksetzen' },
  resetConfirm:   { en: 'Delete all learning progress and the streak? This cannot be undone.',                de: 'Den gesamten Lernfortschritt und die Serie löschen? Das lässt sich nicht rückgängig machen.' },
  viewOnGithub:   { en: 'View on GitHub',                                                                     de: 'Auf GitHub ansehen' },
  madeBy:         { en: 'Made by',                                                                            de: 'Erstellt von' },
}
