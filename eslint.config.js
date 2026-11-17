import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist', 'coverage'] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended, sonarjs.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: { ecmaVersion: 2023, globals: globals.browser },
        plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            // SonarSource's cognitive complexity: how hard a function is to follow, not just how many branches it has
            'sonarjs/cognitive-complexity': ['error', 15],
            // a three-way choice reads fine as a chained ternary, as in the MUI sx props
            'sonarjs/no-nested-conditional': 'off',
        },
    },
);
