const el = () => document.getElementById('notice')

/** 続行不能な状態をユーザーへ伝える全画面通知。ゲーム内 HUD とは別物。 */
export function showNotice(message: string): void {
  const node = el()
  if (!node) return
  node.textContent = message
  node.dataset.visible = 'true'
}

export function hideNotice(): void {
  const node = el()
  if (!node) return
  node.dataset.visible = 'false'
}
