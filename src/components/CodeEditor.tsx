/**
 * Code Editor Component
 * Syntax-highlighted code editor with line numbers
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Copy, Check, Download, Maximize2, Minimize2 } from 'lucide-react';

export type CodeLanguage = 
  | 'javascript' | 'typescript' | 'python' | 'java' | 'cpp' | 'csharp'
  | 'go' | 'rust' | 'ruby' | 'php' | 'swift' | 'kotlin'
  | 'html' | 'css' | 'scss' | 'json' | 'xml' | 'yaml' | 'markdown'
  | 'sql' | 'bash' | 'powershell' | 'dockerfile' | 'plaintext';

export interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  language?: CodeLanguage;
  theme?: 'light' | 'dark' | 'auto';
  readOnly?: boolean;
  showLineNumbers?: boolean;
  showCopyButton?: boolean;
  showLanguageLabel?: boolean;
  highlightActiveLine?: boolean;
  tabSize?: number;
  minHeight?: number;
  maxHeight?: number;
  placeholder?: string;
  className?: string;
  onSave?: (value: string) => void;
}

// Simple syntax highlighting patterns
const HIGHLIGHT_PATTERNS: Record<string, { pattern: RegExp; className: string }[]> = {
  javascript: [
    { pattern: /(\/\/.*$)/gm, className: 'text-gray-500' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'text-gray-500' },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, className: 'text-green-600 dark:text-green-400' },
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g, className: 'text-purple-600 dark:text-purple-400' },
    { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, className: 'text-orange-600 dark:text-orange-400' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-blue-600 dark:text-blue-400' },
  ],
  typescript: [
    { pattern: /(\/\/.*$)/gm, className: 'text-gray-500' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'text-gray-500' },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, className: 'text-green-600 dark:text-green-400' },
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof|interface|type|enum|namespace|implements|extends|public|private|protected|readonly|abstract)\b/g, className: 'text-purple-600 dark:text-purple-400' },
    { pattern: /\b(string|number|boolean|any|void|never|unknown|object)\b/g, className: 'text-cyan-600 dark:text-cyan-400' },
    { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, className: 'text-orange-600 dark:text-orange-400' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-blue-600 dark:text-blue-400' },
  ],
  python: [
    { pattern: /(#.*$)/gm, className: 'text-gray-500' },
    { pattern: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, className: 'text-gray-500' },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, className: 'text-green-600 dark:text-green-400' },
    { pattern: /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|with|lambda|yield|pass|break|continue|and|or|not|in|is|True|False|None)\b/g, className: 'text-purple-600 dark:text-purple-400' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-blue-600 dark:text-blue-400' },
  ],
  json: [
    { pattern: /("(?:[^"\\]|\\.)*")(?=\s*:)/g, className: 'text-purple-600 dark:text-purple-400' },
    { pattern: /:\s*("(?:[^"\\]|\\.)*")/g, className: 'text-green-600 dark:text-green-400' },
    { pattern: /\b(true|false|null)\b/g, className: 'text-orange-600 dark:text-orange-400' },
    { pattern: /\b(-?\d+\.?\d*)\b/g, className: 'text-blue-600 dark:text-blue-400' },
  ],
  html: [
    { pattern: /(<!--[\s\S]*?-->)/g, className: 'text-gray-500' },
    { pattern: /(<\/?[\w-]+)/g, className: 'text-red-600 dark:text-red-400' },
    { pattern: /([\w-]+)(?==)/g, className: 'text-orange-600 dark:text-orange-400' },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, className: 'text-green-600 dark:text-green-400' },
  ],
  css: [
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'text-gray-500' },
    { pattern: /([.#]?[\w-]+)(?=\s*\{)/g, className: 'text-purple-600 dark:text-purple-400' },
    { pattern: /([\w-]+)(?=\s*:)/g, className: 'text-cyan-600 dark:text-cyan-400' },
    { pattern: /:\s*([^;{}]+)/g, className: 'text-orange-600 dark:text-orange-400' },
  ],
};

// Apply syntax highlighting
function highlightCode(code: string, language: CodeLanguage): string {
  const patterns = HIGHLIGHT_PATTERNS[language] || HIGHLIGHT_PATTERNS.javascript || [];
  let result = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  patterns.forEach(({ pattern, className }) => {
    result = result.replace(pattern, `<span class="${className}">$1</span>`);
  });

  return result;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value = '',
  onChange,
  language = 'javascript',
  theme = 'auto',
  readOnly = false,
  showLineNumbers = true,
  showCopyButton = true,
  showLanguageLabel = true,
  highlightActiveLine = true,
  tabSize = 2,
  minHeight = 200,
  maxHeight = 600,
  placeholder = '// Digite seu código aqui...',
  className,
  onSave,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeLine, setActiveLine] = useState(1);

  const lines = value.split('\n');
  const lineCount = lines.length;

  // Handle copy
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
}
  }, [value]);

  // Handle download
  const handleDownload = useCallback(() => {
    const extensions: Record<string, string> = {
      javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
      cpp: 'cpp', csharp: 'cs', go: 'go', rust: 'rs', ruby: 'rb',
      php: 'php', swift: 'swift', kotlin: 'kt', html: 'html',
      css: 'css', scss: 'scss', json: 'json', xml: 'xml', yaml: 'yaml',
      markdown: 'md', sql: 'sql', bash: 'sh', dockerfile: 'dockerfile',
    };
    const ext = extensions[language] || 'txt';
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [value, language]);

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;

    // Tab handling
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = ' '.repeat(tabSize);
      const newValue = value.substring(0, start) + spaces + value.substring(end);
      onChange?.(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + tabSize;
      }, 0);
    }

    // Save shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave?.(value);
    }
  }, [value, tabSize, onChange, onSave]);

  // Track active line
  const handleSelect = useCallback(() => {
    if (textareaRef.current) {
      const pos = textareaRef.current.selectionStart;
      const line = value.substring(0, pos).split('\n').length;
      setActiveLine(line);
    }
  }, [value]);

  // Highlighted code
  const highlightedCode = highlightCode(value || placeholder, language);

  return (
    <div
      className={cn(
        'code-editor relative border rounded-lg overflow-hidden',
        theme === 'dark' ? 'bg-gray-900 text-gray-100' : theme === 'light' ? 'bg-white text-gray-900' : 'bg-background',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        {showLanguageLabel && (
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {language}
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {showCopyButton && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-accent transition-colors"
              title="Copiar código"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Baixar arquivo"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        className="relative flex overflow-auto"
        style={{ minHeight, maxHeight: isFullscreen ? 'calc(100vh - 100px)' : maxHeight }}
      >
        {/* Line numbers */}
        {showLineNumbers && (
          <div className="flex-shrink-0 py-3 px-2 text-right select-none border-r bg-muted/20">
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i + 1}
                className={cn(
                  'text-xs text-muted-foreground leading-6 px-2',
                  highlightActiveLine && activeLine === i + 1 && 'bg-accent/50 rounded'
                )}
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Code area */}
        <div className="relative flex-1 p-3">
          {/* Highlighted layer */}
          <pre
            className="absolute inset-0 p-3 m-0 pointer-events-none font-mono text-sm leading-6 whitespace-pre-wrap break-words"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />

          {/* Textarea layer */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onClick={handleSelect}
            readOnly={readOnly}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className={cn(
              'relative w-full h-full bg-transparent text-transparent caret-foreground',
              'font-mono text-sm leading-6 resize-none outline-none',
              'whitespace-pre-wrap break-words',
              readOnly && 'cursor-default'
            )}
            style={{ minHeight: minHeight - 50 }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground">
        <span>Linha {activeLine}, Coluna 1</span>
        <span>{lineCount} linhas, {value.length} caracteres</span>
      </div>
    </div>
  );
};

export default CodeEditor;
