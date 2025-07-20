/**
 * Unused for solidity projects unless you need to test custom src files
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        watch: false,
        //fileParallelism: false,
        testTimeout: 50000,
        include: ['test/**/*.ts'],
        coverage: {
            enabled: true,
            include: [
                'src/**/*.ts',
            ],
            exclude: [
                'src/start.ts',
            ],
            reporter: [
                "text",
                "json-summary",
                "html"
            ],
            reportsDirectory: './coverage',
        },
    },
});