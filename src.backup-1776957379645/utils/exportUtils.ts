import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Export Utilities for CSV and PDF generation
 * Used by Admin and Supervisor roles for data export
 */

// ============================================
// CSV EXPORT FUNCTIONS
// ============================================

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV(data: any[], headers: string[]): string {
  if (!data || data.length === 0) return "";

  const csvRows: string[] = [];

  // Add headers
  csvRows.push(headers.map((h) => `"${h}"`).join(","));

  // Add data rows
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header] ?? "";
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  });

  return csvRows.join("\n");
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export Analytics Dashboard data to CSV
 */
export function exportAnalyticsToCSV(analyticsData: {
  stats: any;
  templateUsage: any[];
  technicianPerformance: any[];
  taskIssues: any[];
  period: string;
}): void {
  const { stats, templateUsage, technicianPerformance, taskIssues, period } =
    analyticsData;

  let csvContent = "";

  // Header
  csvContent += `"Analytics Esecuzioni Checklist"\n`;
  csvContent += `"Periodo: ${period}"\n`;
  csvContent += `"Generato: ${new Date().toLocaleString("it-IT")}"\n\n`;

  // Stats section
  csvContent += `"STATISTICHE GENERALI"\n`;
  csvContent += `"Metrica","Valore","Percentuale"\n`;
  csvContent += `"Totale Esecuzioni","${stats.totalExecutions}",""\n`;
  csvContent += `"Completate","${stats.completedExecutions}","${stats.completionRate.toFixed(1)}%"\n`;
  csvContent += `"In Corso","${stats.inProgressExecutions}","${((stats.inProgressExecutions / stats.totalExecutions) * 100).toFixed(1)}%"\n`;
  csvContent += `"Cancellate","${stats.cancelledExecutions}","${((stats.cancelledExecutions / stats.totalExecutions) * 100).toFixed(1)}%"\n`;
  csvContent += `"Con Problemi","${stats.executionsWithIssues}","${stats.issueRate.toFixed(1)}%"\n`;
  csvContent += `"Tempo Medio","${stats.averageDuration} minuti",""\n\n`;

  // Template Usage
  csvContent += `"TOP TEMPLATE PER ESECUZIONI"\n`;
  csvContent += `"Template","Esecuzioni","Tempo Medio (min)","Tempo Stimato (min)","Issues","Tasso Problemi"\n`;
  templateUsage.forEach((t) => {
    csvContent += `"${t.templateName}","${t.executionCount}","${t.averageDuration}","${t.estimatedDuration}","${t.issueCount}","${t.issueRate.toFixed(1)}%"\n`;
  });
  csvContent += "\n";

  // Technician Performance
  csvContent += `"PERFORMANCE TECNICI"\n`;
  csvContent += `"Tecnico","Completate","In Corso","Tempo Medio (min)","Tasso Completamento","Issues"\n`;
  technicianPerformance.forEach((t) => {
    csvContent += `"${t.technicianName}","${t.completedCount}","${t.inProgressCount}","${t.averageDuration}","${t.completionRate.toFixed(1)}%","${t.issueCount}"\n`;
  });
  csvContent += "\n";

  // Task Issues
  if (taskIssues.length > 0) {
    csvContent += `"TASK CON PIÙ PROBLEMI"\n`;
    csvContent += `"Task","Template","Segnalazioni","Esecuzioni Totali","Tasso Problemi"\n`;
    taskIssues.forEach((t) => {
      csvContent += `"${t.taskTitle}","${t.templateName}","${t.issueCount}","${t.totalExecutions}","${t.issueRate.toFixed(1)}%"\n`;
    });
  }

  downloadCSV(csvContent, `analytics-checklist-${Date.now()}.csv`);
}

/**
 * Export Maintenance Logs to CSV
 */
export function exportMaintenanceLogsToCSV(
  logs: any[],
  period: string
): void {
  let csvContent = "";

  // Header
  csvContent += `"Storico Manutenzioni"\n`;
  csvContent += `"Periodo: ${period}"\n`;
  csvContent += `"Generato: ${new Date().toLocaleString("it-IT")}"\n\n`;

  // Data
  csvContent += `"Data","Equipaggiamento","Categoria","Tecnico","Tipo","Durata (min)","Status","Priorità","Note"\n`;

  logs.forEach((log) => {
    const date = new Date(log.created_at).toLocaleDateString("it-IT");
    const equipment = log.equipment?.name || "N/A";
    const category = log.equipment?.category || "N/A";
    const technician = log.technician?.full_name || "N/A";
    const type = log.maintenance_type || "N/A";
    const duration = log.duration || "0";
    const status = log.status || "N/A";
    const priority = log.priority || "N/A";
    const notes = (log.notes || "").replace(/"/g, '""');

    csvContent += `"${date}","${equipment}","${category}","${technician}","${type}","${duration}","${status}","${priority}","${notes}"\n`;
  });

  downloadCSV(csvContent, `manutenzioni-${Date.now()}.csv`);
}

// ============================================
// PDF EXPORT FUNCTIONS
// ============================================

/**
 * Export Analytics Dashboard to PDF
 */
export function exportAnalyticsToPDF(analyticsData: {
  stats: any;
  templateUsage: any[];
  technicianPerformance: any[];
  taskIssues: any[];
  period: string;
}): void {
  const { stats, templateUsage, technicianPerformance, taskIssues, period } =
    analyticsData;

  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Analytics Esecuzioni Checklist", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Periodo: ${period}`, 105, 28, { align: "center" });
  doc.text(`Generato: ${new Date().toLocaleString("it-IT")}`, 105, 34, {
    align: "center",
  });

  let yPosition = 45;

  // Stats Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("STATISTICHE GENERALI", 14, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const statsData = [
    ["Metrica", "Valore", "Percentuale"],
    ["Totale Esecuzioni", stats.totalExecutions.toString(), "-"],
    [
      "Completate",
      stats.completedExecutions.toString(),
      `${stats.completionRate.toFixed(1)}%`,
    ],
    [
      "In Corso",
      stats.inProgressExecutions.toString(),
      `${((stats.inProgressExecutions / stats.totalExecutions) * 100).toFixed(1)}%`,
    ],
    [
      "Cancellate",
      stats.cancelledExecutions.toString(),
      `${((stats.cancelledExecutions / stats.totalExecutions) * 100).toFixed(1)}%`,
    ],
    [
      "Con Problemi",
      stats.executionsWithIssues.toString(),
      `${stats.issueRate.toFixed(1)}%`,
    ],
    ["Tempo Medio", `${stats.averageDuration} minuti`, "-"],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [statsData[0]],
    body: statsData.slice(1),
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
    styles: { fontSize: 9 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Template Usage
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TOP TEMPLATE PER ESECUZIONI", 14, yPosition);
  yPosition += 8;

  const templateData = templateUsage.map((t) => [
    t.templateName,
    t.executionCount.toString(),
    `${t.averageDuration} min`,
    `${t.estimatedDuration} min`,
    t.issueCount.toString(),
    `${t.issueRate.toFixed(1)}%`,
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [
      [
        "Template",
        "Esecuzioni",
        "Tempo Medio",
        "Tempo Stimato",
        "Issues",
        "Tasso",
      ],
    ],
    body: templateData,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
    styles: { fontSize: 8 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  // Technician Performance
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PERFORMANCE TECNICI", 14, yPosition);
  yPosition += 8;

  const techData = technicianPerformance.map((t) => [
    t.technicianName,
    t.completedCount.toString(),
    t.inProgressCount.toString(),
    `${t.averageDuration} min`,
    `${t.completionRate.toFixed(1)}%`,
    t.issueCount.toString(),
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [
      ["Tecnico", "Completate", "In Corso", "Tempo Medio", "Rate", "Issues"],
    ],
    body: techData,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
    styles: { fontSize: 8 },
  });

  // Task Issues (if any)
  if (taskIssues.length > 0) {
    yPosition = (doc as any).lastAutoTable.finalY + 15;

    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TASK CON PIÙ PROBLEMI", 14, yPosition);
    yPosition += 8;

    const taskData = taskIssues.slice(0, 10).map((t) => [
      t.taskTitle,
      t.templateName,
      t.issueCount.toString(),
      t.totalExecutions.toString(),
      `${t.issueRate.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [["Task", "Template", "Segnalazioni", "Totali", "Tasso"]],
      body: taskData,
      theme: "grid",
      headStyles: { fillColor: [239, 68, 68], fontSize: 9 },
      styles: { fontSize: 8 },
    });
  }

  // Footer with page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Pagina ${i} di ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }

  doc.save(`analytics-checklist-${Date.now()}.pdf`);
}

/**
 * Export Maintenance Logs to PDF
 */
export function exportMaintenanceLogsToPDF(
  logs: any[],
  period: string
): void {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Storico Manutenzioni", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Periodo: ${period}`, 105, 28, { align: "center" });
  doc.text(`Generato: ${new Date().toLocaleString("it-IT")}`, 105, 34, {
    align: "center",
  });

  let yPosition = 45;

  // Summary Stats
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RIEPILOGO", 14, yPosition);
  yPosition += 8;

  const completed = logs.filter((l) => l.status === "completato").length;
  const inProgress = logs.filter((l) => l.status === "in_corso").length;
  const scheduled = logs.filter((l) => l.status === "programmata").length;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Totale Manutenzioni: ${logs.length}`, 14, yPosition);
  yPosition += 6;
  doc.text(`Completate: ${completed}`, 14, yPosition);
  yPosition += 6;
  doc.text(`In Corso: ${inProgress}`, 14, yPosition);
  yPosition += 6;
  doc.text(`Programmate: ${scheduled}`, 14, yPosition);
  yPosition += 10;

  // Maintenance Table
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DETTAGLIO MANUTENZIONI", 14, yPosition);
  yPosition += 8;

  const tableData = logs.map((log) => [
    new Date(log.created_at).toLocaleDateString("it-IT"),
    log.equipment?.name || "N/A",
    log.technician?.full_name || "N/A",
    log.maintenance_type || "N/A",
    log.status || "N/A",
    log.priority || "N/A",
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [["Data", "Equipaggiamento", "Tecnico", "Tipo", "Status", "Priorità"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 40 },
      2: { cellWidth: 35 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
    },
  });

  // Footer with page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Pagina ${i} di ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }

  doc.save(`manutenzioni-${Date.now()}.pdf`);
}