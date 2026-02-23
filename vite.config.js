import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
    plugins: [crx({ manifest })],
    build: {
        rollupOptions: {
            input: {
                // Any extra inputs like html pages if not in manifest
            },
        },
    },
})
