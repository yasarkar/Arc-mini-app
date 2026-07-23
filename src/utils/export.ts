import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TransactionRecord } from "@/types/history";

// ---------------------------------------------------------------------------
// Export to CSV
// ---------------------------------------------------------------------------
export function exportToCSV(data: TransactionRecord[]): void {
  if (!data || data.length === 0) {
    alert("Dışa aktarılacak işlem kaydı bulunamadı.");
    return;
  }

  const headers = [
    "Transaction ID",
    "Tx Hash",
    "Type",
    "Amount",
    "Token",
    "From Address",
    "To Address",
    "Timestamp",
    "Date (ISO)",
    "Status",
    "Viewing Key (vkeyArc)",
    "Explorer URL",
  ];

  const rows = data.map((t) => [
    t.id,
    t.txHash,
    t.type,
    t.amount,
    t.token,
    t.fromAddress,
    t.toAddress,
    t.timestamp,
    new Date(t.timestamp).toISOString(),
    t.status,
    t.vkeyArc ?? "",
    t.explorerUrl,
  ]);

  // CSV escape logic
  const csvContent = [
    headers.join(","),
    ...rows.map((r) =>
      r
        .map((val) => {
          const str = String(val ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = `arc_transactions_report_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Export to PDF — Corporate Audit & Compliance Report
// ---------------------------------------------------------------------------
export function exportToPDF(
  data: TransactionRecord[],
  userAddress?: string,
): void {
  if (!data || data.length === 0) {
    alert("Dışa aktarılacak işlem kaydı bulunamadı.");
    return;
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  const generatedDate = new Date().toLocaleString("tr-TR", {
    dateStyle: "full",
    timeStyle: "medium",
  });
  const auditorAddr = userAddress ?? "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18";

  // Corporate Header
  doc.setFillColor(11, 14, 23); // Deep Navy #0B0E17
  doc.rect(0, 0, 842, 70, "F");

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ARC NETWORK — TRANSACTION & COMPLIANCE AUDIT REPORT", 40, 42);

  // Sub-header Badge
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Official On-Chain & Opt-in Privacy Compliance Document", 40, 58);

  // Metadata Block
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Rapor Detayları:", 40, 95);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Cüzdan Adresi: ${auditorAddr}`, 40, 110);
  doc.text(`Oluşturulma Tarihi: ${generatedDate}`, 40, 124);
  doc.text(`Toplam Kayıt Sayısı: ${data.length} İşlem`, 40, 138);

  doc.text(
    `Ağ: Arc Testnet (Chain ID: 5042002) · Gas Token: USDC · Circle AppKit Integrated`,
    400,
    110
  );
  doc.text(
    `Opt-in Privacy: Cryptographic Viewing Key Proof Verification Supported`,
    400,
    124
  );

  // Divider Line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.75);
  doc.line(40, 152, 802, 152);

  // Format Table Data
  const tableHeaders = [
    [
      "Tip",
      "Tutar & Token",
      "Gönderen Adresi",
      "Alıcı Adresi",
      "Tarih / Saat",
      "Durum",
      "Opt-in Privacy Viewing Key (vkey_arc)",
    ],
  ];

  const tableRows = data.map((t) => [
    t.type === "PRIVACY_SEND"
      ? "Gizli Gönderim"
      : t.type === "UNIFIED_BALANCE"
      ? "Unified Balance"
      : "Standart",
    `${t.amount} ${t.token}`,
    t.fromAddress.length > 16 ? `${t.fromAddress.slice(0, 8)}...${t.fromAddress.slice(-6)}` : t.fromAddress,
    t.toAddress.length > 16 ? `${t.toAddress.slice(0, 8)}...${t.toAddress.slice(-6)}` : t.toAddress,
    new Date(t.timestamp).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    t.status,
    t.vkeyArc ?? "N/A (Public)",
  ]);

  // Generate Table using jspdf-autotable
  autoTable(doc, {
    startY: 165,
    head: tableHeaders,
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 70, fontStyle: "bold" },
      2: { cellWidth: 90 },
      3: { cellWidth: 90 },
      4: { cellWidth: 80 },
      5: { cellWidth: 50 },
      6: { cellWidth: 260, font: "courier" },
    },
    margin: { left: 40, right: 40 },
    didDrawPage: (dataArg) => {
      // Footer Page Number
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(140, 140, 140);
      doc.text(
        `Sayfa ${dataArg.pageNumber} / ${pageCount} — ArcFlow Compliance & Audit Verification System`,
        40,
        575
      );
    },
  });

  // Save PDF file
  const filename = `arc_compliance_audit_report_${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  doc.save(filename);
}
