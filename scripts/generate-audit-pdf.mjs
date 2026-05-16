import { jsPDF } from 'jspdf';
import fs from 'fs';

async function generatePDF() {
  console.log('Gerando audit_report.pdf a partir de audit_report.md...');
  
  if (!fs.existsSync('audit_report.md')) {
    console.error('Erro: audit_report.md não encontrado.');
    process.exit(1);
  }

  const markdown = fs.readFileSync('audit_report.md', 'utf8');
  
  // Criar o PDF
  const doc = new jsPDF();
  
  // Configurações básicas de fonte
  doc.setFont("helvetica");
  doc.setFontSize(10);
  
  // Dividir o texto para caber na página (largura de 190mm)
  const lines = doc.splitTextToSize(markdown, 180);
  
  // Adicionar texto página por página
  let cursorY = 10;
  const pageHeight = doc.internal.pageSize.height;
  
  for (let i = 0; i < lines.length; i++) {
    if (cursorY > pageHeight - 10) {
      doc.addPage();
      cursorY = 10;
    }
    doc.text(lines[i], 10, cursorY);
    cursorY += 5; // Espaçamento entre linhas
  }
  
  const buffer = doc.output('arraybuffer');
  fs.writeFileSync('audit_report.pdf', Buffer.from(buffer));
  
  console.log('audit_report.pdf gerado com sucesso!');
}

generatePDF().catch(err => {
  console.error('Erro ao gerar PDF:', err);
  process.exit(1);
});
