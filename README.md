# PMP Тренажёр

Веб-приложение для подготовки к сертификации PMI (PMP): банк вопросов с объяснениями, режимы
**Практика / Экзамен с таймером / Работа над ошибками / Интервальное повторение / Закладки**,
статистика по доменам и дням, экспорт прогресса, печатный отчёт, админ-панель для импорта вопросов.

Вход через Google (Firebase). Без настройки Firebase приложение работает в локальном режиме
(прогресс хранится в браузере) — удобно для проверки.

## Быстрый запуск (локально, без Google-входа)

```bash
npm install
npm run dev        # http://localhost:5173
```

## Публикация с входом через Google — пошагово (~15 минут)

1. Откройте https://console.firebase.google.com → **Add project** → любое имя → Create.
2. Слева **Build → Authentication → Get started → Sign-in method → Google → Enable** → Save.
3. **Build → Firestore Database → Create database** → Production mode → регион ближе к вам → Enable.
4. Вкладка **Rules** в Firestore: вставьте содержимое файла `firestore.rules` (там же замените email
   администратора на свой) → Publish.
5. **Project settings (шестерёнка) → General → Your apps → Web (</>)** → имя → Register.
   Скопируйте значения `apiKey`, `authDomain`, `projectId`, `appId`.
6. В папке проекта создайте файл `.env` (образец — `.env.example`):

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=ваш-проект.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=ваш-проект
   VITE_FIREBASE_APP_ID=...
   VITE_ADMIN_EMAILS=ваша@gmail.com
   ```

7. Соберите и выложите на Firebase Hosting (бесплатно):

   ```bash
   npm install
   npm install -g firebase-tools
   firebase login
   firebase use --add          # выберите созданный проект
   npm run build
   firebase deploy             # выдаст адрес вида https://ваш-проект.web.app
   ```

8. В **Authentication → Settings → Authorized domains** добавьте домен сайта (`ваш-проект.web.app`
   добавляется автоматически; если хостите в другом месте — добавьте его).

Готово: любой человек открывает ссылку, входит через Google-почту и тренируется; прогресс
хранится в его аккаунте.

> Альтернативный хостинг (Vercel / Netlify / GitHub Pages): соберите `npm run build` и выложите папку
> `dist`. Переменные `VITE_*` задаются в настройках хостинга или в `.env` перед сборкой.

## Администрирование вопросов

Пользователи с email из `VITE_ADMIN_EMAILS` видят вкладку **Админ**:

- импорт вопросов из JSON (вставить текст или выбрать файл), с режимом **Dry run** и отчётом
  по строкам; дубликаты по тексту вопроса пропускаются;
- правка текста, вариантов, правильного ответа, объяснения, домена и тегов;
- архивирование вопросов, экспорт всего банка в JSON;
- кнопка **Сохранить** публикует банк для всех пользователей (хранится в Firestore `bank/questions`).

### Формат вопроса (JSON)

```json
{
  "stem": "Текст вопроса…",
  "options": [
    { "label": "A", "text": "…", "correct": false },
    { "label": "B", "text": "…", "correct": true },
    { "label": "C", "text": "…", "correct": false },
    { "label": "D", "text": "…", "correct": false }
  ],
  "explanation": "Почему правильный ответ — B…",
  "domain": "process",          // people | process | business
  "tags": ["риски"],
  "source": "Набор 11",
  "image": null                 // или "images/file.png"
}
```

### Импорт из Word (.docx)

Исходные наборы вопросов были в `.docx`, где правильный ответ выделен **жёлтым маркером**.
Скрипт `tools/parse_docx.py` извлекает вопросы в JSON (нужен Python 3 и `pip install python-docx`):

```bash
python3 tools/parse_docx.py "Набор 11.docx" out.json public/images
```

Полученный `out.json` вставьте в Админ → Импорт. Домен/теги/объяснения можно добавить вручную
в админке (см. `tools/enrich_example.py` как пример массового обогащения).

## Структура

```
src/
  data/questions.json   банк вопросов (90 шт., встроенный по умолчанию)
  logic/engine.ts       сессии, подсчёт, интервальное повторение, аналитика, CSV
  storage/              бэкенды: local (localStorage), firebase (Google + Firestore), claude (артефакт)
  pages/                Login, Dashboard, Runner (прохождение), Result, Stats, Admin
  i18n.ts               словарь ru/en
tools/parse_docx.py     конвертер .docx → JSON
e2e/smoke.mjs           сквозной тест (Playwright)
firestore.rules         правила доступа Firestore
```

## Проверка

```bash
npm run build                       # typecheck + сборка
npm run build:single                # один self-contained HTML (dist-single/)
npx http-server dist-single -p 4173 # или python3 -m http.server 4173 --directory dist-single
node e2e/smoke.mjs http://localhost:4173/
```

## Перед продакшеном

- включите в Firebase **Authentication → Settings → User actions → Email enumeration protection**;
- регулярно экспортируйте Firestore (Google Cloud → Firestore → Import/Export) — бэкап;
- в правилах Firestore держите актуальный список email администраторов;
- обновляйте зависимости (`npm outdated`), следите за квотами Firebase (бесплатного тарифа хватает
  на тысячи пользователей при таком объёме данных);
- политика данных: хранится только email/имя из Google и история ответов; удаление пользователя —
  Authentication → Users → Delete + удаление документа `users/{uid}`.
