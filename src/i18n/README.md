`hi.json` and `en.json` hold every word of the phone app and the login page. `index.ts` starts i18next
and saves the language choice (`lang` in `localStorage`). `LanguageButton.tsx` shows the other language's name.
Both files must have the same keys and the same `{{blanks}}` (a test checks this). No Hindi word is written in a code file.
