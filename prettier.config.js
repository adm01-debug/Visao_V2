/** @type {import("prettier").Config} */
export default {
  // Basics
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  
  // JSX
  jsxSingleQuote: false,
  
  // Trailing
  trailingComma: 'es5',
  
  // Brackets
  bracketSpacing: true,
  bracketSameLine: false,
  
  // Arrow Functions
  arrowParens: 'always',
  
  // Range
  rangeStart: 0,
  rangeEnd: Infinity,
  
  // Prose
  proseWrap: 'preserve',
  
  // HTML
  htmlWhitespaceSensitivity: 'css',
  
  // End of Line
  endOfLine: 'lf',
  
  // Embedded
  embeddedLanguageFormatting: 'auto',
  
  // Single Attribute Per Line
  singleAttributePerLine: false,
  
  // Plugins
  plugins: ['prettier-plugin-tailwindcss'],
  
  // Tailwind
  tailwindConfig: './tailwind.config.ts',
  tailwindFunctions: ['cn', 'clsx', 'cva'],
};
