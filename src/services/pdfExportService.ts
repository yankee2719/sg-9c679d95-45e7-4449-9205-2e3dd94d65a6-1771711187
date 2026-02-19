// src/services/pdfExportService.ts
// ============================================================================
// PDF EXPORT SERVICE — Report Manutenzione, Passaporto Macchina, Scheda Tecnica
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// =============================================================================
// TYPES
// =============================================================================

export interface MachineData {
    id: string;
    name: string;
    internal_code: string;
    serial_number: string | null;
    brand: string | null;
    model: string | null;
    category: string | null;
    lifecycle_state: string | null;
    position: string | null;
    commissioned_at: string | null;
    year_of_manufacture: number | null;
    specifications: any;
    notes: string | null;
    plant_name?: string | null;
    organization_name?: string | null;
}

export interface MaintenanceReportData {
    machine: MachineData;
    plans: {
        id: string;
        title: string;
        frequency_type: string | null;
        next_due_date: string | null;
        priority: string | null;
        is_active: boolean;
    }[];
    workOrders: {
        id: string;
        title: string;
        wo_number: string | null;
        status: string;
        priority: string;
        wo_type: string | null;
        work_type: string | null;
        scheduled_start: string | null;
        scheduled_date: string | null;
        completed_at: string | null;
        assignee_name: string | null;
    }[];
    checklistExecutions: {
        id: string;
        checklist_name: string;
        status: string;
        executed_by_name: string | null;
        started_at: string | null;
        completed_at: string | null;
    }[];
}

// =============================================================================
// HELPERS
// =============================================================================

const BRAND_COLOR: [number, number, number] = [255, 107, 53]; // #FF6B35
const DARK_TEXT: [number, number, number] = [30, 30, 30];
const GRAY_TEXT: [number, number, number] = [120, 120, 120];
const LIGHT_BG: [number, number, number] = [248, 248, 248];

function fmtDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function addHeader(doc: jsPDF, title: string, subtitle: string) {
    const pageW = doc.internal.pageSize.getWidth();

    // Brand bar
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, pageW, 28, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('MACHINA', 14, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 14, 20);

    // Date
    doc.setFontSize(8);
    doc.text(`Generato: ${fmtDateTime(new Date().toISOString())}`, pageW - 14, 12, { align: 'right' });

    // Subtitle
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(subtitle, 14, 38);

    return 44; // y offset after header
}

function addFooter(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageH = doc.internal.pageSize.getHeight();
        const pageW = doc.internal.pageSize.getWidth();
        doc.setFontSize(7);
        doc.setTextColor(...GRAY_TEXT);
        doc.text(`Pagina ${i} di ${pageCount}`, pageW / 2, pageH - 8, { align: 'center' });
        doc.text('MACHINA — Generato automaticamente', 14, pageH - 8);
    }
}

function addSectionTitle(doc: jsPDF, y: number, text: string): number {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLOR);
    doc.text(text, 14, y);
    doc.setDrawColor(...BRAND_COLOR);
    doc.line(14, y + 1.5, doc.internal.pageSize.getWidth() - 14, y + 1.5);
    doc.setTextColor(...DARK_TEXT);
    return y + 8;
}

function addKeyValue(doc: jsPDF, y: number, key: string, value: string | null, maxWidth?: number): number {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_TEXT);
    doc.text(key, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    const val = value || '—';
    const w = maxWidth || 120;
    doc.text(val, 70, y, { maxWidth: w });
    return y + 5.5;
}

function checkNewPage(doc: jsPDF, y: number, needed: number = 30): number {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        return 20;
    }
    return y;
}

function download(doc: jsPDF, filename: string) {
    addFooter(doc);
    doc.save(filename);
}

// =============================================================================
// 1. REPORT MANUTENZIONE
// =============================================================================

export function exportMaintenanceReport(data: MaintenanceReportData): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = addHeader(doc, 'Report Manutenzione', data.machine.name);

    // Machine info summary
    y = addKeyValue(doc, y, 'Codice:', data.machine.internal_code);
    y = addKeyValue(doc, y, 'Marca/Modello:', [data.machine.brand, data.machine.model].filter(Boolean).join(' '));
    y = addKeyValue(doc, y, 'Stabilimento:', data.machine.plant_name);
    y += 4;

    // ── PLANS ──
    y = addSectionTitle(doc, y, 'Piani di Manutenzione');

    if (data.plans.length === 0) {
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_TEXT);
        doc.text('Nessun piano di manutenzione configurato.', 14, y);
        y += 8;
    } else {
        autoTable(doc, {
            startY: y,
            head: [['Piano', 'Frequenza', 'Prossima Scadenza', 'Priorità', 'Stato']],
            body: data.plans.map(p => [
                p.title,
                p.frequency_type || '—',
                fmtDate(p.next_due_date),
                (p.priority || 'medium').charAt(0).toUpperCase() + (p.priority || 'medium').slice(1),
                p.is_active ? 'Attivo' : 'Inattivo',
            ]),
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: LIGHT_BG },
            margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── WORK ORDERS ──
    y = checkNewPage(doc, y, 40);
    y = addSectionTitle(doc, y, 'Ordini di Lavoro');

    if (data.workOrders.length === 0) {
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_TEXT);
        doc.text('Nessun ordine di lavoro.', 14, y);
        y += 8;
    } else {
        autoTable(doc, {
            startY: y,
            head: [['N. WO', 'Titolo', 'Tipo', 'Stato', 'Priorità', 'Data', 'Tecnico']],
            body: data.workOrders.map(wo => [
                wo.wo_number || '—',
                wo.title,
                wo.wo_type || wo.work_type || '—',
                wo.status,
                wo.priority,
                fmtDate(wo.scheduled_start || wo.scheduled_date),
                wo.assignee_name || '—',
            ]),
            styles: { fontSize: 7, cellPadding: 1.5 },
            headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: LIGHT_BG },
            margin: { left: 14, right: 14 },
            columnStyles: { 1: { cellWidth: 40 } },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── CHECKLIST EXECUTIONS ──
    y = checkNewPage(doc, y, 40);
    y = addSectionTitle(doc, y, 'Esecuzioni Checklist');

    if (data.checklistExecutions.length === 0) {
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_TEXT);
        doc.text('Nessuna esecuzione registrata.', 14, y);
    } else {
        autoTable(doc, {
            startY: y,
            head: [['Checklist', 'Stato', 'Eseguita da', 'Inizio', 'Fine']],
            body: data.checklistExecutions.map(ce => [
                ce.checklist_name,
                ce.status === 'completed' ? 'Completata' : 'In corso',
                ce.executed_by_name || '—',
                fmtDateTime(ce.started_at),
                fmtDateTime(ce.completed_at),
            ]),
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: LIGHT_BG },
            margin: { left: 14, right: 14 },
        });
    }

    download(doc, `report_manutenzione_${data.machine.internal_code}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// =============================================================================
// 2. PASSAPORTO MACCHINA
// =============================================================================

export function exportMachinePassport(machine: MachineData): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = addHeader(doc, 'Passaporto Macchina', machine.name);

    // ── IDENTITÀ ──
    y = addSectionTitle(doc, y, 'Identificazione');
    y = addKeyValue(doc, y, 'Nome:', machine.name);
    y = addKeyValue(doc, y, 'Codice Interno:', machine.internal_code);
    y = addKeyValue(doc, y, 'N. Serie:', machine.serial_number);
    y = addKeyValue(doc, y, 'Marca:', machine.brand);
    y = addKeyValue(doc, y, 'Modello:', machine.model);
    y = addKeyValue(doc, y, 'Categoria:', machine.category);
    y = addKeyValue(doc, y, 'Anno Fabbricazione:', machine.year_of_manufacture?.toString() || null);
    y += 4;

    // ── STATO ──
    y = addSectionTitle(doc, y, 'Stato e Ubicazione');
    const stateLabels: Record<string, string> = {
        active: 'Attivo', commissioned: 'Attivo', inactive: 'Inattivo',
        under_maintenance: 'In Manutenzione', decommissioned: 'Dismesso',
    };
    y = addKeyValue(doc, y, 'Stato:', stateLabels[machine.lifecycle_state || 'active'] || machine.lifecycle_state);
    y = addKeyValue(doc, y, 'Stabilimento:', machine.plant_name);
    y = addKeyValue(doc, y, 'Posizione:', machine.position);
    y = addKeyValue(doc, y, 'Organizzazione:', machine.organization_name);
    y = addKeyValue(doc, y, 'Data Commissione:', fmtDate(machine.commissioned_at));
    y += 4;

    // ── SPECIFICHE ──
    const specsText = machine.specifications
        ? (typeof machine.specifications === 'string'
            ? machine.specifications
            : machine.specifications?.text || JSON.stringify(machine.specifications, null, 2))
        : null;

    if (specsText) {
        y = addSectionTitle(doc, y, 'Specifiche Tecniche');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK_TEXT);
        const lines = doc.splitTextToSize(specsText, doc.internal.pageSize.getWidth() - 28);
        for (const line of lines) {
            y = checkNewPage(doc, y, 6);
            doc.text(line, 14, y);
            y += 4.5;
        }
        y += 4;
    }

    // ── NOTE ──
    if (machine.notes) {
        y = checkNewPage(doc, y, 20);
        y = addSectionTitle(doc, y, 'Note');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK_TEXT);
        const noteLines = doc.splitTextToSize(machine.notes, doc.internal.pageSize.getWidth() - 28);
        for (const line of noteLines) {
            y = checkNewPage(doc, y, 6);
            doc.text(line, 14, y);
            y += 4.5;
        }
    }

    // ── FIRMA ──
    y = checkNewPage(doc, y, 40);
    y += 10;
    y = addSectionTitle(doc, y, 'Validazione');
    y += 10;
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_TEXT);
    doc.text('Data: _______________', 14, y);
    doc.text('Firma Responsabile: ______________________________', 100, y);
    y += 12;
    doc.text('Data: _______________', 14, y);
    doc.text('Firma Tecnico: ______________________________', 100, y);

    download(doc, `passaporto_${machine.internal_code}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// =============================================================================
// 3. SCHEDA TECNICA
// =============================================================================

export function exportTechnicalSheet(machine: MachineData): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    let y = addHeader(doc, 'Scheda Tecnica', machine.name);

    // ── BOX IDENTIFICATIVO ──
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(14, y, pageW - 28, 50, 3, 3, 'F');

    y += 6;
    const col1 = 18;
    const col2 = pageW / 2 + 4;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_TEXT);

    // Col 1
    doc.text('CODICE INTERNO', col1, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(11);
    doc.text(machine.internal_code, col1, y + 5);

    // Col 2
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_TEXT);
    doc.text('N. SERIE', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(11);
    doc.text(machine.serial_number || '—', col2, y + 5);

    y += 14;

    // Row 2
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_TEXT);
    doc.text('MARCA', col1, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(10);
    doc.text(machine.brand || '—', col1, y + 5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_TEXT);
    doc.text('MODELLO', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(10);
    doc.text(machine.model || '—', col2, y + 5);

    y += 14;

    // Row 3
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_TEXT);
    doc.text('ANNO FABBRICAZIONE', col1, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(10);
    doc.text(machine.year_of_manufacture?.toString() || '—', col1, y + 5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_TEXT);
    doc.text('CATEGORIA', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(10);
    doc.text(machine.category || '—', col2, y + 5);

    y += 18;

    // ── UBICAZIONE ──
    y = addSectionTitle(doc, y, 'Ubicazione');
    y = addKeyValue(doc, y, 'Stabilimento:', machine.plant_name);
    y = addKeyValue(doc, y, 'Posizione:', machine.position);
    y = addKeyValue(doc, y, 'Stato:', machine.lifecycle_state);
    y = addKeyValue(doc, y, 'Commissione:', fmtDate(machine.commissioned_at));
    y += 4;

    // ── SPECIFICHE ──
    const specsText = machine.specifications
        ? (typeof machine.specifications === 'string'
            ? machine.specifications
            : machine.specifications?.text || JSON.stringify(machine.specifications, null, 2))
        : null;

    if (specsText) {
        y = addSectionTitle(doc, y, 'Specifiche Tecniche');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK_TEXT);
        const lines = doc.splitTextToSize(specsText, pageW - 28);
        for (const line of lines) {
            y = checkNewPage(doc, y, 6);
            doc.text(line, 14, y);
            y += 4.5;
        }
        y += 4;
    }

    // ── NOTE ──
    if (machine.notes) {
        y = checkNewPage(doc, y, 20);
        y = addSectionTitle(doc, y, 'Note');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK_TEXT);
        const noteLines = doc.splitTextToSize(machine.notes, pageW - 28);
        for (const line of noteLines) {
            y = checkNewPage(doc, y, 6);
            doc.text(line, 14, y);
            y += 4.5;
        }
    }

    download(doc, `scheda_tecnica_${machine.internal_code}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

