import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/setupTests.js',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*'],
            exclude: ['src/main.jsx', 'src/setupTests.js', 'src/**/*.test.jsx'],
            thresholds: {
                statements: 55,
                branches: 40,
                functions: 50,
                lines: 55,
            },
        },
    },
})
