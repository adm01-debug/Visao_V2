/**
 * VISÃO — Custom ESLint Rule: no-hardcoded-colors
 *
 * Prevents hardcoded hex/rgb/hsl color values and raw Tailwind color utility
 * classes (e.g. `text-white`, `bg-black`, `border-red-500`) in TSX/JSX files.
 *
 * Authors should use semantic design tokens instead:
 *   ✅  text-foreground, bg-background, border-primary, text-muted-foreground
 *   ❌  text-white, bg-black, bg-red-500, #ff0000, rgb(0,0,0)
 */

// Tailwind color palette names (v3). Extend if you add custom palette names.
const PALETTE_NAMES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'white',
  'black',
];

// Tailwind utility prefixes that accept colors
const COLOR_PREFIXES = [
  'text',
  'bg',
  'border',
  'ring',
  'outline',
  'shadow',
  'fill',
  'stroke',
  'accent',
  'caret',
  'divide',
  'placeholder',
  'decoration',
  'from',
  'via',
  'to',
];

// Build regex:  text-red-500, bg-white, border-black, text-white/50  etc.
const palettePattern = PALETTE_NAMES.join('|');
const prefixPattern = COLOR_PREFIXES.join('|');
// Matches e.g. "text-red-500", "bg-white", "border-black/40"
const hardcodedClassRe = new RegExp(
  `(?:^|\\s)((?:${prefixPattern})-(?:${palettePattern})(?:-\\d{2,3})?(?:\\/\\d{1,3})?)(?:\\s|$|')`,
  'g'
);

// Hex: #abc, #aabbcc, #aabbccdd
const hexRe = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;

// rgb() / rgba() / hsl() / hsla() with numeric args (skip CSS var references)
const colorFnRe = /\b(?:rgba?|hsla?)\(\s*\d/g;

// Allowlist — intentional exceptions (logos, third-party, canvas, emails, etc.)
const ALLOW_COMMENTS = ['eslint-disable-next-line no-hardcoded-colors', 'color-exception'];

// Strings that are always fine (CSS variable references, currentColor, etc.)
const SAFE_PATTERNS = [
  /var\(--/, // CSS variables
  /currentColor/i,
  /transparent/i,
  /inherit/i,
];

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded color values; use semantic design tokens instead.',
      category: 'Best Practices',
    },
    messages: {
      hardcodedHex:
        'Hardcoded hex color "{{value}}" detected. Use a semantic token (e.g. hsl(var(--primary))).',
      hardcodedColorFn: 'Hardcoded color function detected. Use a semantic CSS variable instead.',
      hardcodedTailwindClass:
        'Hardcoded Tailwind color class "{{value}}" detected. Use a semantic class (e.g. text-foreground, bg-background).',
    },
    schema: [],
  },

  create(context) {
    // Only lint TSX / JSX component files inside src/
    const filename = context.getFilename?.() || context.filename || '';
    if (!filename.includes('/src/')) return {};

    // Skip index.css and tailwind config (where tokens are *defined*)
    if (/index\.css|tailwind\.config/i.test(filename)) return {};

    function isSafe(raw) {
      return SAFE_PATTERNS.some((p) => p.test(raw));
    }

    function hasAllowComment(node) {
      const src = context.getSourceCode?.() || context.sourceCode;
      const comments = src.getCommentsBefore?.(node) || [];
      return comments.some((c) => ALLOW_COMMENTS.some((tag) => c.value.includes(tag)));
    }

    function checkString(node, value) {
      if (isSafe(value)) return;

      // Check hex codes
      let m;
      hexRe.lastIndex = 0;
      while ((m = hexRe.exec(value)) !== null) {
        context.report({ node, messageId: 'hardcodedHex', data: { value: m[0] } });
      }

      // Check rgb/hsl functions
      colorFnRe.lastIndex = 0;
      if (colorFnRe.test(value)) {
        context.report({ node, messageId: 'hardcodedColorFn' });
      }

      // Check Tailwind color classes
      hardcodedClassRe.lastIndex = 0;
      while ((m = hardcodedClassRe.exec(value)) !== null) {
        context.report({
          node,
          messageId: 'hardcodedTailwindClass',
          data: { value: m[1] },
        });
      }
    }

    return {
      // className="text-white bg-red-500"
      // cn('text-white', condition && 'bg-black')
      Literal(node) {
        if (typeof node.value !== 'string') return;
        if (hasAllowComment(node)) return;
        checkString(node, node.value);
      },

      TemplateLiteral(node) {
        if (hasAllowComment(node)) return;
        for (const quasi of node.quasis) {
          checkString(node, quasi.value.raw);
        }
      },
    };
  },
};

export default rule;
