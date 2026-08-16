import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
    {
        ignores: ["dist/**", "node_modules/**", "public/resources/**"]
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
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/ban-ts-comment": "off",
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
        files: ["src/jackal/**/*.ts"],
        rules: {
            "@typescript-eslint/no-empty-function": "off",
            "no-empty": "off",
            "no-fallthrough": "off",
            "no-case-declarations": "off"
        }
    }
];
