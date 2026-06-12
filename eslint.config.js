import html from "eslint-plugin-html";
import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        files: ["**/*.html"],
        plugins: {
            html
        },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                window: "readonly",
                document: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                clearTimeout: "readonly",
                Math: "readonly",
                performance: "readonly",
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",
                Image: "readonly",
                localStorage: "readonly",
                navigator: "readonly",
                Audio: "readonly",
                btoa: "readonly",
                atob: "readonly",
                Blob: "readonly",
                URL: "readonly",
                alert: "readonly",
                prompt: "readonly",
                confirm: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error"
        }
    }
];
