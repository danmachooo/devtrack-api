import js from "@eslint/js"
import tseslint from "typescript-eslint"

export default [
	{
		ignores: ["dist/**", "node_modules/**", "generated/**", "**/generated", "prisma.config.ts", "src/tests/**", "src/core/types/*.d.ts"],
	},

	js.configs.recommended,
	...tseslint.configs.recommended,

	// Main TS rules (for .ts and .d.ts)
	{
		files: ["src/**/*.ts", "src/**/*.d.ts"],
		languageOptions: {
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"@typescript-eslint/no-unnecessary-condition": "warn",
			"@typescript-eslint/no-unnecessary-type-assertion": "warn",
			"@typescript-eslint/no-non-null-assertion": "warn",

			// "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
			"@typescript-eslint/consistent-indexed-object-style": ["warn", "record"],
			"@typescript-eslint/prefer-optional-chain": "warn",
			"@typescript-eslint/prefer-nullish-coalescing": "warn",

			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/await-thenable": "error",
			"@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
		},
	},

	// Override ONLY for declaration files
	{
		files: ["src/types/**/*.d.ts"],
		rules: {
			"@typescript-eslint/consistent-type-definitions": "off",
		},
	},
]