// Smoke test: sign in (local mode), run a 5-question practice, see result, check stats.
// Usage: node e2e/smoke.mjs [baseUrl] [shotsDir]
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://localhost:4173/'
const shots = process.argv[3] || ''
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const shot = (n) => shots && page.screenshot({ path: `${shots}/${n}.png`, fullPage: false })

await page.goto(base)
await page.getByPlaceholder('Ваше имя').first().fill('Тест')
await page.getByRole('button', { name: /Продолжить без входа/ }).first().click()
await page.getByText(/Практика/).first().waitFor()
await shot('1-dashboard')

await page.getByText('Практика', { exact: true }).click()
await page.getByLabel(/Количество вопросов/).fill('5')
await page.getByRole('button', { name: 'Начать', exact: true }).click()
await page.getByText(/из 5/).waitFor()
await shot('2-question')

let correct = 0
for (let i = 0; i < 5; i++) {
  await page.locator('button:has(span:text-is("A"))').first().click()
  await page.getByRole('button', { name: 'Ответить', exact: true }).click()
  await page.locator('button:has-text("Верно"), button:has-text("Неверно")').first().waitFor()
  if (i === 0) await shot('3-feedback')
  if (await page.locator('button:has-text("Верно"):not(:has-text("Неверно"))').count()) correct++
  if (i < 4) await page.getByRole('button', { name: /Далее/ }).click()
}
await page.getByRole('button', { name: 'Завершить', exact: true }).first().click()
await page.getByRole('button', { name: 'Да, завершить' }).click()
await page.getByText(/^Результат ·/).waitFor()
const scoreText = await page.locator('div.text-5xl').textContent()
await shot('4-result')
const expected = Math.round((correct / 5) * 100)
if (parseInt(scoreText) !== expected) throw new Error(`score mismatch: ${scoreText} vs ${expected}`)

await page.getByTitle('Профиль').click()
await page.getByText(/По доменам/).waitFor()
await page.getByText(/Последние 14 дней/).waitFor()
await shot('5-profile')

// persistence: reload and check answered count on dashboard
await page.reload()
await page.getByTitle('Профиль').click()
await page.getByRole('button', { name: 'На главную' }).click()
const answered = await page.locator('text=отвечено').locator('..').locator('.text-2xl').first().textContent()
if (answered.trim() !== '5') throw new Error('persistence failed: ' + answered)

// exam mode with timer
await page.getByText('Экзамен', { exact: true }).click()
await page.getByLabel(/Количество вопросов/).fill('3')
await page.getByRole('button', { name: 'Начать', exact: true }).click()
await page.getByText(/из 3/).waitFor()
await page.locator('button:has(span:text-is("B"))').first().click()
await page.getByRole('button', { name: /Далее/ }).click()
await page.getByRole('button', { name: /Назад/ }).click()
const stillSelected = await page.locator('button.border-accent:has(span:text-is("B"))').count()
if (!stillSelected) throw new Error('exam autosave failed')
await shot('6-exam')
// question list -> open question 3 in modal, answer there, go to it
await page.getByTitle('Список вопросов').click()
await page.locator('button:has(span:text-is("3"))').last().click()
await page.getByText(/Вопрос 3 из 3/).waitFor()
await page.locator('[role=dialog] button:has(span:text-is("D"))').click()
await page.getByRole('button', { name: 'Перейти к вопросу' }).click()
await page.getByText(/^3 /).waitFor()
await shot('7-modal')
await page.getByRole('button', { name: 'Завершить', exact: true }).first().click()
await page.getByRole('button', { name: 'Да, завершить' }).click()
await page.getByText(/^Результат ·/).waitFor()
const examAnswered = await page.locator('text=/^\\d+ \\/ 3/').first().textContent()
if (!examAnswered.startsWith('2') && !examAnswered.startsWith('1') && !examAnswered.startsWith('0')) throw new Error('exam result ' + examAnswered)


await browser.close()
if (errors.length) {
  console.error('Console errors:', errors)
  process.exit(1)
}
console.log('SMOKE OK; practice score', scoreText)
