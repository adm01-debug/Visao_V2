import { useCallback, useRef } from 'react';

interface UsePrintOptions {
  documentTitle?: string;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
  removeAfterPrint?: boolean;
}

export const usePrint = <T extends HTMLElement>(options: UsePrintOptions = {}) => {
  const { documentTitle, onBeforePrint, onAfterPrint, removeAfterPrint = false } = options;
  const contentRef = useRef<T>(null);

  const handlePrint = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    onBeforePrint?.();

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('');
        } catch {
          return '';
        }
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentTitle || document.title}</title>
          <style>${styles}</style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      if (removeAfterPrint) printWindow.close();
      onAfterPrint?.();
    }, 250);
  }, [documentTitle, onBeforePrint, onAfterPrint, removeAfterPrint]);

  return { contentRef, handlePrint };
};

export default usePrint;
