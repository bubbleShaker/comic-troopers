// 動作確認用のスクリーンショット取得。
// ヘッドレスの --virtual-time-budget では requestAnimationFrame が十分に回らないので、
// 実時間で待ってから撮る。ページ内のエラーとログもそのまま流す。
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p))
if (!executablePath) throw new Error('Chrome/Edge が見つからない。CHROME_PATH を指定して。')

const [url = 'http://localhost:4173/comic-troopers/', out = 'shot.png', waitRaw = '4000'] =
  process.argv.slice(2)

const waitMs = Number(waitRaw)
// NaN のまま setTimeout に渡すと 0 扱いになり、描画前の空フレームを撮ってしまう
if (!Number.isFinite(waitMs) || waitMs < 0) throw new Error(`待ち時間が不正: ${waitRaw}`)

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  // ヘッドレスには GPU が無いので WebGL をソフトウェアで走らせる
  args: ['--disable-gpu', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
})
// 途中で失敗してもヘッドレス Chrome を残さないよう、必ず閉じる
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  page.on('console', (m) => console.log(`[page:${m.type()}]`, m.text()))
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, waitMs))
  await page.screenshot({ path: out })
  console.log(`saved ${out} (waited ${waitMs}ms)`)
} finally {
  await browser.close()
}
