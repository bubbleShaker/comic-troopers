import { defineConfig } from 'vite'

// GitHub Pages はサブパス配信（https://<user>.github.io/comic-troopers/）なので
// base を合わせないとアセットの URL が 404 になる。
export default defineConfig({
  base: '/comic-troopers/',
  build: { target: 'es2020' },
})
