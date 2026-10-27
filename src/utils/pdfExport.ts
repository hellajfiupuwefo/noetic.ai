import { jsPDF } from 'jspdf';
import { StudyGuide, Flashcard } from '../types';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_') || 'Noetic_Study';
}

/**
 * Generates an executive, beautifully formatted PDF study briefing
 */
export function exportStudyGuideToPDF(guide: StudyGuide, title: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 20) {
      doc.addPage();
      y = margin;
      drawHeaderFooter();
    }
  };

  const drawHeaderFooter = () => {
    // Top subtle rule
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.75);
    doc.line(margin, margin - 15, pageWidth - margin, margin - 15);

    // Running header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 140, 155);
    doc.text('Noetic.ai · Executive Active Recall Briefing', margin, margin - 20);

    // Bottom running footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    doc.text(`Page ${totalPages}`, pageWidth - margin, pageHeight - margin + 18, { align: 'right' });
    doc.text('Grounded Learning & Spaced Repetition', margin, pageHeight - margin + 18);
    doc.line(margin, pageHeight - margin + 8, pageWidth - margin, pageHeight - margin + 8);
  };

  drawHeaderFooter();

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(24, 32, 47);
  const titleLines = doc.splitTextToSize(guide.title || title || 'Executive Study Summary', contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 26 + 4;

  // Metadata subheader
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(99, 102, 241); // indigo
  doc.text(`DATE GENERATED: ${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })} · VERIFIED CITATION SYNTHESIS`, margin, y);
  y += 18;

  // Divider
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(1.5);
  doc.line(margin, y, margin + 40, y);
  y += 18;

  // SECTION 1: EXECUTIVE SYNOPSIS
  checkPageBreak(80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('1. EXECUTIVE SYNOPSIS', margin, y);
  y += 16;

  // Box background for synopsis
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const overviewLines = doc.splitTextToSize(guide.overview, contentWidth - 20);
  const boxHeight = overviewLines.length * 14 + 16;
  
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, boxHeight, 4, 4, 'FD');
  doc.text(overviewLines, margin + 10, y + 14);
  y += boxHeight + 22;

  // SECTION 2: CORE CONCEPTS MATRIX
  if (guide.keyConcepts && guide.keyConcepts.length > 0) {
    checkPageBreak(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('2. CORE CONCEPTS & DEFINITIONS', margin, y);
    y += 16;

    guide.keyConcepts.forEach((concept, idx) => {
      checkPageBreak(55);
      
      // Concept card
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(79, 70, 229);
      doc.text(`${idx + 1}. ${concept.term}`, margin, y);
      y += 13;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const expLines = doc.splitTextToSize(concept.explanation, contentWidth - 10);
      doc.text(expLines, margin + 8, y);
      y += expLines.length * 13;

      if (concept.example) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        const exLines = doc.splitTextToSize(`Application / Example: ${concept.example}`, contentWidth - 10);
        doc.text(exLines, margin + 8, y);
        y += exLines.length * 12;
      }
      y += 8;
    });
    y += 12;
  }

  // SECTION 3: KEY TAKEAWAYS
  if (guide.keyTakeaways && guide.keyTakeaways.length > 0) {
    checkPageBreak(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('3. HIGH-YIELD TAKEAWAYS FOR EXAMS', margin, y);
    y += 16;

    guide.keyTakeaways.forEach(item => {
      checkPageBreak(30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);

      // Bullet dot
      doc.setFillColor(99, 102, 241);
      doc.circle(margin + 4, y - 3, 2, 'F');

      const lines = doc.splitTextToSize(item, contentWidth - 16);
      doc.text(lines, margin + 14, y);
      y += lines.length * 13 + 4;
    });
    y += 12;
  }

  // SECTION 4: RAPID-FIRE RECALL Q&A
  if (guide.quickReviewQuestions && guide.quickReviewQuestions.length > 0) {
    checkPageBreak(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('4. ACTIVE RECALL SELF-TEST DRILL', margin, y);
    y += 16;

    guide.quickReviewQuestions.forEach((qa, idx) => {
      checkPageBreak(50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const qLines = doc.splitTextToSize(`Q${idx + 1}: ${qa.q}`, contentWidth - 10);
      doc.text(qLines, margin, y);
      y += qLines.length * 13 + 2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const aLines = doc.splitTextToSize(`Answer: ${qa.a}`, contentWidth - 20);
      doc.text(aLines, margin + 10, y);
      y += aLines.length * 12 + 8;
    });
    y += 10;
  }

  // SECTION 5: RECOMMENDED YOUTUBE MASTERCLASSES (If math content)
  if (guide.mathVideos && guide.mathVideos.length > 0) {
    checkPageBreak(70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(225, 29, 72); // rose
    doc.text('5. CURATED YOUTUBE VIDEO MASTERCLASSES', margin, y);
    y += 16;

    guide.mathVideos.forEach((vid, idx) => {
      checkPageBreak(45);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`${idx + 1}. ${vid.title} (${vid.channel})`, margin, y);
      y += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const reasonLines = doc.splitTextToSize(`Pedagogical rationale: ${vid.reason}`, contentWidth - 10);
      doc.text(reasonLines, margin + 8, y);
      y += reasonLines.length * 11;

      doc.setTextColor(99, 102, 241);
      doc.text(`Link: ${vid.url}`, margin + 8, y);
      y += 16;
    });
  }

  // Save the document
  const fileName = `${sanitizeFilename(guide.title || title)}_StudyGuide.pdf`;
  doc.save(fileName);
}

/**
 * Exports Flashcards to printable sheets or cut-out physical cards
 */
export function exportFlashcardsToPDF(
  cards: Flashcard[],
  title: string,
  mode: 'cutouts' | 'summary' = 'cutouts'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  if (mode === 'cutouts') {
    // 6 Cards per page (2 columns x 3 rows) with dashed cut lines
    const cols = 2;
    const rows = 3;
    const cardWidth = (contentWidth - 16) / cols;
    const cardHeight = (contentHeight - 20) / rows;
    const cardsPerPage = cols * rows;

    cards.forEach((card, index) => {
      const pageIndex = Math.floor(index / cardsPerPage);
      const cardOnPage = index % cardsPerPage;
      const col = cardOnPage % cols;
      const row = Math.floor(cardOnPage / cols);

      if (index > 0 && cardOnPage === 0) {
        doc.addPage();
      }

      // Page Title Header on top of each page
      if (cardOnPage === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`${title || 'Noetic Flashcards'} · Printable Cut-Out Flashcards (Page ${pageIndex + 1})`, margin, margin - 12);
      }

      const x = margin + col * (cardWidth + 16);
      const y = margin + row * (cardHeight + 10);

      // Card outer dashed box
      doc.setDrawColor(180, 195, 215);
      doc.setLineDashPattern([3, 3], 0);
      doc.setLineWidth(0.8);
      doc.roundedRect(x, y, cardWidth, cardHeight, 6, 6, 'D');
      doc.setLineDashPattern([], 0); // reset to solid

      // Card Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(99, 102, 241);
      doc.text(`CARD #${index + 1} · ${card.category?.toUpperCase() || 'CONCEPT'}`, x + 10, y + 15);

      // Cut icon indicator text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(160, 174, 192);
      doc.text('✂ Cut along dashed line', x + cardWidth - 10, y + 15, { align: 'right' });

      // FRONT / PROMPT SECTION
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x + 8, y + 22, cardWidth - 16, cardHeight * 0.4, 4, 4, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('FRONT / PROMPT:', x + 14, y + 34);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const frontLines = doc.splitTextToSize(card.front, cardWidth - 30);
      doc.text(frontLines, x + 14, y + 48);

      // BACK / ANSWER SECTION
      const backY = y + 24 + cardHeight * 0.42;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('BACK / ANSWER:', x + 14, backY + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const backLines = doc.splitTextToSize(card.back, cardWidth - 30);
      doc.text(backLines, x + 14, backY + 24);
    });
  } else {
    // Summary Study Sheet
    let y = margin;

    const checkPageBreak = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(`${title || 'Flashcards'} · Active Recall Review Sheet`, margin, y);
    y += 24;

    cards.forEach((card, idx) => {
      checkPageBreak(50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(79, 70, 229);
      doc.text(`${idx + 1}. [${card.category || 'General'}] ${card.front}`, margin, y);
      y += 13;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const backLines = doc.splitTextToSize(card.back, contentWidth - 16);
      doc.text(backLines, margin + 12, y);
      y += backLines.length * 12 + 8;
    });
  }

  const fileName = `${sanitizeFilename(title || 'Flashcards')}_Deck.pdf`;
  doc.save(fileName);
}

/**
 * Exports Flashcards to Anki / Quizlet compatible CSV
 */
export function exportFlashcardsToCSV(cards: Flashcard[], title: string): void {
  let csv = 'Front,Back,Category\n';
  cards.forEach(c => {
    const front = `"${c.front.replace(/"/g, '""')}"`;
    const back = `"${c.back.replace(/"/g, '""')}"`;
    const cat = `"${(c.category || 'General').replace(/"/g, '""')}"`;
    csv += `${front},${back},${cat}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(title || 'Flashcards')}_Anki.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
