const KEY = 'comic-troopers.highscore'

/**
 * ハイスコアの保存。
 * プライベートブラウズや容量超過で localStorage は普通に例外を投げるので、
 * 読み書きどちらも失敗を握りつぶす。記録が残らないだけでゲームは遊べる。
 */
export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(KEY)
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
  } catch {
    return 0
  }
}

export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(KEY, String(Math.floor(score)))
  } catch {
    // 保存できなくても続行する
  }
}
