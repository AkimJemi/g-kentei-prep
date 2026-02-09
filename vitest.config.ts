/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/setupTests.ts',
    },
    resolve: {
        alias: [
            { find: /.*\.css$/, replacement: path.resolve(__dirname, 'src/__mocks__/styleMock.ts') },
        ],
    },
    server: {
        proxy: {
            '/api': 'http://localhost:3012'
        }
    }
});
