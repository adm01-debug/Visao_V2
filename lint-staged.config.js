export default {
  '*.{ts,tsx,js,jsx,mjs,cjs}': [
    'eslint --fix --max-warnings=0 --no-warn-ignored',
    'prettier --write',
    'eslint --max-warnings=0 --no-warn-ignored',
  ],
  '*.{json,md,yml,yaml,css}': ['prettier --write', 'prettier --check'],
};
