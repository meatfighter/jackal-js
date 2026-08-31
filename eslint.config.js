import js from "@eslint/js";
import tseslint from "typescript-eslint";

const typescriptNativeFiles = [
    "pwa/src/main.ts",
    "pwa/vite.config.ts",
    "pwa/src/app/**/*.ts",
    "pwa/src/java/**/*.ts",
    "pwa/src/jackal/persistence/**/*.ts",
    "pwa/src/jackal/index.ts",
    "pwa/src/jackal/JackalMath.ts",
    "pwa/src/jackal/JackalResources.ts",
    "pwa/src/jackal/MainRuntimeState.ts"
];

const javascriptNativeFiles = ["scripts/**/*.js", "scripts/**/*.mjs"];

export default [
    {
        ignores: [
            "dist/**",
            ".release-components/**",
            ".release-work/**",
            ".release-test-*/**",
            ".release-operation.lock/**",
            ".release-secrets/**",
            ".release-candidates/**",
            ".dist-pending-*/**",
            ".dist-previous-*/**",
            ".dist-active-before-*/**",
            "node_modules/**",
            "public/resources/**",
            "pwa/public/resources/**"
        ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.ts", "**/*.mts", "**/*.js", "**/*.mjs"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module"
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/ban-ts-comment": "error",
            "no-unused-vars": "off",
            "no-dupe-class-members": "off",
            "no-undef": "off",
            "prefer-const": "off",
            "no-useless-assignment": "off",
            "no-unexpected-multiline": "off",
            "no-useless-escape": "off",
            "lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }]
        }
    },
    {
        // Build, release, and test tooling is native JavaScript rather than translated Java.
        files: javascriptNativeFiles,
        rules: {
            "no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                    varsIgnorePattern: "^_"
                }
            ]
        }
    },
    {
        // The top-level Jackal classes intentionally retain Java-shaped signatures,
        // control flow, and initialization structure for direct parity review.
        files: ["pwa/src/jackal/*.ts"],
        rules: {
            "@typescript-eslint/no-empty-function": "off",
            "no-empty": "off",
            "no-fallthrough": "off",
            "no-case-declarations": "off"
        }
    },
    {
        // Browser, runtime, and persistence modules are TypeScript-native. Keep
        // ordinary debt checks enabled there instead of inheriting translation
        // exceptions required by the Java-shaped gameplay classes.
        files: typescriptNativeFiles,
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                    varsIgnorePattern: "^_"
                }
            ],
            "@typescript-eslint/no-empty-function": "error",
            "no-empty": "error",
            "no-fallthrough": "error",
            "no-case-declarations": "error",
            "prefer-const": "error",
            "no-useless-assignment": "error"
        }
    }
];
