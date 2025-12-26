module.exports = {
    parser: '@typescript-eslint/parser',
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        // Add custom rules here
    },
    env: {
        browser: true,
        node: true,
        webextensions: true,
    },
};
