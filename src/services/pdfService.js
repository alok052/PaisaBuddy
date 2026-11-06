import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Generates an executive 3-page CA-ready portfolio audit report in PDF format
 * and opens the native OS Share / View sheet.
 */
export async function generateAndShareAuditPdf(reviewData) {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PaisaBuddy Pro - Portfolio Audit Report</title>
      <style>
        @page {
          size: A4;
          margin: 18mm 16mm 18mm 16mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1E293B;
          background: #FFFFFF;
          margin: 0;
          padding: 0;
          font-size: 13px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0F172A;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .logo-box {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-sq {
          background: linear-gradient(135deg, #10B981, #047857);
          color: white;
          font-weight: 900;
          font-size: 20px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .app-title {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #0F172A;
          margin: 0;
        }
        .app-sub {
          font-size: 10px;
          color: #64748B;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .report-meta {
          text-align: right;
        }
        .report-title {
          font-size: 13px;
          font-weight: 700;
          color: #047857;
          text-transform: uppercase;
        }
        .report-date {
          font-size: 11px;
          color: #64748B;
        }
        .score-hero {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .score-box {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .score-num {
          font-size: 42px;
          font-weight: 900;
          color: #EAB308;
        }
        .score-denom {
          font-size: 18px;
          color: #94A3B8;
          font-weight: 700;
        }
        .score-badge {
          background: #FEF08A;
          color: #854D0E;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
          margin-top: 4px;
          display: inline-block;
        }
        .diag-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 10px;
          flex: 1;
          margin-left: 24px;
        }
        .diag-card {
          background: white;
          border: 1px solid #E2E8F0;
          padding: 8px 12px;
          border-radius: 8px;
          text-align: center;
        }
        .diag-num {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
        }
        .diag-lbl {
          font-size: 9px;
          color: #64748B;
          text-transform: uppercase;
          font-weight: 700;
        }
        .section-h {
          font-size: 14px;
          font-weight: 800;
          color: #0F172A;
          text-transform: uppercase;
          border-bottom: 1.5px solid #E2E8F0;
          padding-bottom: 6px;
          margin-top: 24px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
        }
        .overlap-item {
          background: #FFFBEB;
          border: 1px solid #FDE68A;
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 12px;
        }
        .overlap-funds {
          font-weight: 700;
          font-size: 13px;
          color: #92400E;
          display: flex;
          justify-content: space-between;
        }
        .overlap-pct {
          color: #DC2626;
          font-weight: 800;
        }
        .overlap-stocks {
          margin-top: 6px;
          font-size: 11px;
          color: #78350F;
        }
        .overlap-fix {
          margin-top: 6px;
          background: #FEF3C7;
          color: #B45309;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10.5px;
          font-weight: 600;
        }
        .sector-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .sector-table th {
          background: #F1F5F9;
          text-align: left;
          padding: 8px 10px;
          font-size: 10px;
          color: #475569;
          text-transform: uppercase;
        }
        .sector-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #F1F5F9;
          font-size: 11.5px;
        }
        .badge-danger {
          background: #FEE2E2;
          color: #991B1B;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9.5px;
          font-weight: 700;
        }
        .badge-success {
          background: #DCFCE7;
          color: #166534;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9.5px;
          font-weight: 700;
        }
        .whale-card {
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .whale-stock {
          font-weight: 700;
          font-size: 13px;
          color: #0F172A;
        }
        .whale-owner {
          font-size: 11px;
          color: #64748B;
        }
        .roadmap-step {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          background: #F8FAFC;
          border-left: 4px solid #10B981;
          padding: 10px 14px;
          border-radius: 0 8px 8px 0;
        }
        .step-num {
          background: #10B981;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 12px;
          flex-shrink: 0;
        }
        .step-title {
          font-weight: 700;
          font-size: 12.5px;
          color: #0F172A;
        }
        .step-desc {
          font-size: 11px;
          color: #475569;
          margin-top: 2px;
        }
        .savings-banner {
          background: linear-gradient(135deg, #064E3B, #022C22);
          color: white;
          padding: 16px 20px;
          border-radius: 10px;
          margin-top: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .savings-amount {
          font-size: 28px;
          font-weight: 900;
          color: #34D399;
        }
        .page-break {
          page-break-before: always;
        }
        .footer {
          margin-top: 30px;
          border-top: 1px solid #E2E8F0;
          padding-top: 10px;
          font-size: 9px;
          color: #94A3B8;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <!-- PAGE 1: EXECUTIVE HEALTH & OVERLAPS -->
      <div class="header">
        <div class="logo-box">
          <div class="logo-sq">₹</div>
          <div>
            <div class="app-title">PAISA BUDDY PRO</div>
            <div class="app-sub">Institutional AI Portfolio Audit</div>
          </div>
        </div>
        <div class="report-meta">
          <div class="report-title">Audit Diagnostic Report</div>
          <div class="report-date">Generated on: ${currentDate}</div>
        </div>
      </div>

      <div class="score-hero">
        <div>
          <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase;">Overall Health Index</div>
          <div class="score-box">
            <span class="score-num">${reviewData.overallScore}</span>
            <span class="score-denom">/100</span>
          </div>
          <div class="score-badge">NEEDS REBALANCING</div>
        </div>

        <div class="diag-grid">
          <div class="diag-card">
            <div class="diag-num">${reviewData.subScores.stockQuality}%</div>
            <div class="diag-lbl">Stock Quality</div>
          </div>
          <div class="diag-card">
            <div class="diag-num">${reviewData.subScores.diversification}%</div>
            <div class="diag-lbl">Diversification</div>
          </div>
          <div class="diag-card">
            <div class="diag-num">${reviewData.subScores.riskControl}%</div>
            <div class="diag-lbl">Risk Control</div>
          </div>
          <div class="diag-card">
            <div class="diag-num">${reviewData.subScores.alphaPotential}%</div>
            <div class="diag-lbl">Alpha Score</div>
          </div>
        </div>
      </div>

      <div class="section-h">
        <span>⚠️ Critical Scheme Overlaps Detected</span>
        <span style="color: #DC2626; font-size: 11px;">2 Active Clashes</span>
      </div>

      ${reviewData.overlapDetections
        .map(
          (item) => `
        <div class="overlap-item">
          <div class="overlap-funds">
            <span>${item.fundA} ⟷ ${item.fundB}</span>
            <span class="overlap-pct">${item.overlapPercentage} Overlap</span>
          </div>
          <div class="overlap-stocks">
            <strong>Common Duplicate Holdings:</strong> ${item.commonStocks.join(', ')}
          </div>
          <div class="overlap-fix">
            <strong>Actionable CA Fix:</strong> ${item.recommendation}
          </div>
        </div>
      `
        )
        .join('')}

      <div class="section-h">
        <span>📊 Sector Allocation vs SEBI Prudential Limits</span>
      </div>

      <table class="sector-table">
        <thead>
          <tr>
            <th>Sector Name</th>
            <th>Your Allocation</th>
            <th>Prudential Safe Limit</th>
            <th>Risk Assessment</th>
          </tr>
        </thead>
        <tbody>
          ${reviewData.sectorAllocation
            .map(
              (sec) => `
            <tr>
              <td><strong>${sec.sector}</strong></td>
              <td>${sec.percentage}%</td>
              <td>${sec.benchmark}</td>
              <td>
                <span class="${sec.isHighRisk ? 'badge-danger' : 'badge-success'}">
                  ${sec.isHighRisk ? 'HIGH CONCENTRATION' : 'BALANCED'}
                </span>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="footer">
        Page 1 of 2 • Confidential Document Prepared by PaisaBuddy Pro AI Audit Engine • SEBI Registered Investment Advisor Data Format
      </div>

      <!-- PAGE 2: WHALE MATCHES, SAVINGS & ROADMAP -->
      <div class="page-break"></div>

      <div class="header">
        <div class="logo-box">
          <div class="logo-sq">₹</div>
          <div>
            <div class="app-title">PAISA BUDDY PRO</div>
            <div class="app-sub">Institutional AI Portfolio Audit</div>
          </div>
        </div>
        <div class="report-meta">
          <div class="report-title">Action Plan & Tax Optimization</div>
          <div class="report-date">${currentDate}</div>
        </div>
      </div>

      <div class="section-h">
        <span>🐋 Super-Investor Cross-Reference</span>
        <span style="color: #047857; font-size: 11px;">Whale Validation</span>
      </div>

      ${reviewData.whaleMatches
        .map(
          (wm) => `
        <div class="whale-card">
          <div>
            <div class="whale-stock">${wm.stock}</div>
            <div class="whale-owner">Held by ${wm.whale} • ${wm.stake} stake</div>
          </div>
          <div style="text-align: right;">
            <span class="badge-success" style="font-size: 10px;">${wm.badge}</span>
            <div style="font-size: 10px; color: #64748B; margin-top: 3px;">${wm.sentiment}</div>
          </div>
        </div>
      `
        )
        .join('')}

      <div class="section-h">
        <span>🎯 4-Step Actionable Rebalancing Roadmap</span>
      </div>

      ${reviewData.actionPlan
        .map(
          (act) => `
        <div class="roadmap-step" style="border-left-color: ${act.color};">
          <div class="step-num" style="background: ${act.color};">${act.step}</div>
          <div style="flex: 1;">
            <div class="step-title">${act.title} [${act.action}]</div>
            <div class="step-desc">${act.detail}</div>
          </div>
        </div>
      `
        )
        .join('')}

      <div class="savings-banner">
        <div>
          <div style="font-size: 10px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.85;">Total Annual Recoverable Capital</div>
          <div class="savings-amount">${reviewData.savingsSummary.totalAnnualSavings}</div>
        </div>
        <div style="text-align: right; font-size: 12px; line-height: 1.6;">
          <div>💰 Direct Plan Conversion: <strong>${reviewData.savingsSummary.expenseRatioSaved}</strong></div>
          <div>📉 Tax-Loss Harvesting: <strong>${reviewData.savingsSummary.taxHarvestSaved}</strong></div>
        </div>
      </div>

      <div class="footer">
        Page 2 of 2 • Disclaimer: This audit report is generated for analytical and educational purposes based on uploaded portfolio data. Please consult your SEBI Registered Investment Advisor (RIA) or Chartered Accountant (CA) prior to executing financial transactions.
      </div>
    </body>
    </html>
  `;

  // Generate real PDF file
  const { uri } = await Print.printToFileAsync({
    html: htmlContent,
    base64: false,
  });

  // Open native OS share sheet (WhatsApp, Drive, Downloads, Print)
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: 'Share or Save Your CA-Ready Portfolio Audit',
    });
  }

  return uri;
}
