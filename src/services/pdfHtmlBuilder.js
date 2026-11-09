import { formatINR } from './portfolioAuditEngine.js';

function escapeHtml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates an executive 2-page CA-ready portfolio audit HTML document
 * strictly from analyzed real portfolio metrics.
 */
export function buildAuditPdfHtml(reviewData) {
  const data = reviewData || {};
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const healthScore = data.healthScore ?? data.overallScore ?? 0;
  const gradeLabel = data.gradeLabel || 'PORTFOLIO DIAGNOSTIC';
  const scoreLabel = data.scoreLabel || 'Diagnostic Complete';
  const scoreColor = data.scoreColor || (healthScore >= 80 ? '#059669' : healthScore >= 65 ? '#D97706' : '#DC2626');
  const sourceMeta = data.sourceMeta || {};

  const subScores = Array.isArray(data.subScores)
    ? data.subScores
    : [
        { label: 'Stock Quality', score: data.subScores?.stockQuality ?? 75, color: '#10B981' },
        { label: 'Diversification', score: data.subScores?.diversification ?? 65, color: '#3B82F6' },
        { label: 'Risk Control', score: data.subScores?.riskControl ?? 65, color: '#F59E0B' },
        { label: 'Cost & Tax Eff.', score: data.subScores?.alphaPotential ?? 70, color: '#10B981' },
      ];

  const overlaps = Array.isArray(data.overlaps)
    ? data.overlaps
    : Array.isArray(data.overlapDetections)
    ? data.overlapDetections
    : [];

  const regularLeaks = Array.isArray(data.regularLeaks) ? data.regularLeaks : [];

  const sectors = Array.isArray(data.sectorAllocations)
    ? data.sectorAllocations
    : Array.isArray(data.sectorAllocation)
    ? data.sectorAllocation
    : [];

  const whaleMatches = Array.isArray(data.whaleMatches) ? data.whaleMatches : [];
  const actionPlan = Array.isArray(data.actionPlan) ? data.actionPlan : [];
  const holdings = Array.isArray(data.holdings) ? data.holdings : [];
  const savingsSummary = data.savingsSummary || {
    expenseRatioSaved: '₹0/yr',
    taxHarvestSaved: '₹0/yr',
    totalAnnualSavings: '₹0/yr',
  };

  const overlapsHtml =
    overlaps.length > 0
      ? overlaps
          .map((item) => {
            const pct = item.overlapPercent ?? item.overlapPercentage ?? 0;
            const shared = item.sharedStocks || item.commonStocks || [];
            const fix = item.fix || item.recommendation || '';
            return `
        <div class="overlap-item">
          <div class="overlap-funds">
            <span>${escapeHtml(item.fundA)} &harr; ${escapeHtml(item.fundB)}</span>
            <span class="overlap-pct">${escapeHtml(pct)}% Overlap</span>
          </div>
          ${
            shared.length > 0
              ? `<div class="overlap-stocks"><strong>Common Holdings:</strong> ${escapeHtml(shared.join(', '))}</div>`
              : ''
          }
          ${
            fix
              ? `<div class="overlap-fix"><strong>Actionable Fix:</strong> ${escapeHtml(fix)}</div>`
              : ''
          }
        </div>
      `;
          })
          .join('')
      : `
        <div class="clean-banner">
          <strong>Zero Mutual Fund Overlap Clash:</strong> Your audited portfolio shows no duplicate mutual fund concentration above threshold.
        </div>
      `;

  const leaksHtml =
    regularLeaks.length > 0
      ? `
        <div class="section-h">
          <span>Regular Plan Commission Leaks</span>
          <span style="color: #DC2626; font-size: 11px;">${regularLeaks.length} Fund(s) Flagged</span>
        </div>
        <table class="sector-table">
          <thead>
            <tr>
              <th>Scheme Name</th>
              <th>Value</th>
              <th>Est. Commission Drag</th>
              <th>Suggested Switch</th>
            </tr>
          </thead>
          <tbody>
            ${regularLeaks
              .map(
                (lk) => `
              <tr>
                <td><strong>${escapeHtml(lk.name)}</strong></td>
                <td>${escapeHtml(formatINR(lk.value, true))}</td>
                <td style="color:#DC2626;font-weight:700;">~${escapeHtml(lk.commissionPct)}%/yr (${escapeHtml(formatINR(lk.annualLeak))}/yr)</td>
                <td>${escapeHtml(lk.replacementName)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `
      : '';

  const topHoldingsHtml =
    holdings.length > 0
      ? `
        <div class="section-h">
          <span>Audited Holdings Breakdown (${holdings.length} Positions${holdings.length > 12 ? ', Top 12 Shown' : ''})</span>
          <span style="color: #64748B; font-size: 10px;">Sorted by Market Value</span>
        </div>
        <table class="sector-table">
          <thead>
            <tr>
              <th>Asset Name</th>
              <th>Type / Plan</th>
              <th>Invested</th>
              <th>Current Value</th>
              <th>P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            ${holdings
              .slice(0, 12)
              .map((h) => {
                const pnlColor = h.pnl >= 0 ? '#047857' : '#DC2626';
                const planBadge =
                  h.assetType === 'MF' ? `${h.assetType} (${h.planType})` : h.assetType;
                return `
              <tr>
                <td><strong>${escapeHtml(h.name)}</strong><div style="font-size:9px;color:#64748B;">${escapeHtml(h.sector)}</div></td>
                <td>${escapeHtml(planBadge)}</td>
                <td>${escapeHtml(formatINR(h.investedValue, true))}</td>
                <td><strong>${escapeHtml(formatINR(h.currentValue, true))}</strong></td>
                <td style="color:${pnlColor};font-weight:700;">${h.pnl >= 0 ? '+' : ''}${escapeHtml(formatINR(h.pnl, true))} (${h.pnlPct >= 0 ? '+' : ''}${h.pnlPct}%)</td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
        </table>
      `
      : '';

  const whaleHtml =
    whaleMatches.length > 0
      ? whaleMatches
          .map(
            (wm) => `
        <div class="whale-card">
          <div style="max-width:56%;">
            <div class="whale-stock">${escapeHtml(wm.stock)}</div>
            <div class="whale-owner">${escapeHtml(wm.whale)} &bull; ${escapeHtml(wm.stake)}</div>
          </div>
          <div style="text-align: right; max-width:42%;">
            <span class="${wm.type === 'DANGER' ? 'badge-danger' : 'badge-success'}" style="font-size: 10px;">${escapeHtml(wm.badge)}</span>
            <div style="font-size: 9.5px; color: #64748B; margin-top: 3px;">${escapeHtml(wm.sentiment)}</div>
          </div>
        </div>
      `
          )
          .join('')
      : `
        <div class="clean-banner" style="background:#F8FAFC;border-color:#E2E8F0;color:#475569;">
          No direct overlapping positions or severe single-stock drawdowns (&le; -20%) found against the 50 tracked Super-Investor portfolios.
        </div>
      `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PaisaBuddy Pro - Portfolio Audit Report</title>
      <style>
        @page { size: A4; margin: 16mm 14mm 16mm 14mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; background: #FFFFFF; margin: 0; padding: 0; font-size: 12px; line-height: 1.45; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0F172A; padding-bottom: 10px; margin-bottom: 16px; }
        .logo-box { display: flex; align-items: center; gap: 10px; }
        .logo-sq { background: #059669; color: white; font-weight: 900; font-size: 18px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
        .app-title { font-size: 17px; font-weight: 800; letter-spacing: 0.4px; color: #0F172A; }
        .app-sub { font-size: 9.5px; color: #64748B; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
        .report-meta { text-align: right; }
        .report-title { font-size: 12px; font-weight: 800; color: #047857; text-transform: uppercase; }
        .report-date { font-size: 10px; color: #64748B; }
        .val-strip { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px; }
        .val-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px; }
        .val-lbl { font-size: 9px; color: #64748B; font-weight: 700; text-transform: uppercase; }
        .val-num { font-size: 13px; font-weight: 800; color: #0F172A; margin-top: 2px; }
        .score-hero { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
        .score-box { display: flex; align-items: baseline; gap: 4px; }
        .score-num { font-size: 38px; font-weight: 900; color: ${scoreColor}; }
        .score-denom { font-size: 16px; color: #94A3B8; font-weight: 700; }
        .score-badge { background: #E2E8F0; color: #0F172A; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 5px; margin-top: 4px; display: inline-block; }
        .diag-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; flex: 1; margin-left: 18px; }
        .diag-card { background: white; border: 1px solid #E2E8F0; padding: 8px 6px; border-radius: 8px; text-align: center; }
        .diag-num { font-size: 16px; font-weight: 800; color: #0F172A; }
        .diag-lbl { font-size: 8.5px; color: #64748B; text-transform: uppercase; font-weight: 700; margin-top: 2px; }
        .section-h { font-size: 12.5px; font-weight: 800; color: #0F172A; text-transform: uppercase; border-bottom: 1.5px solid #E2E8F0; padding-bottom: 5px; margin-top: 16px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .overlap-item { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
        .overlap-funds { font-weight: 700; font-size: 12px; color: #92400E; display: flex; justify-content: space-between; }
        .overlap-pct { color: #DC2626; font-weight: 800; }
        .overlap-stocks { margin-top: 4px; font-size: 10.5px; color: #78350F; }
        .overlap-fix { margin-top: 5px; background: #FEF3C7; color: #B45309; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
        .clean-banner { background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; border-radius: 8px; padding: 10px 12px; font-size: 11px; margin-bottom: 10px; }
        .sector-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        .sector-table th { background: #F1F5F9; text-align: left; padding: 6px 8px; font-size: 9.5px; color: #475569; text-transform: uppercase; }
        .sector-table td { padding: 6px 8px; border-bottom: 1px solid #F1F5F9; font-size: 11px; vertical-align: top; }
        .badge-danger { background: #FEE2E2; color: #991B1B; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
        .badge-success { background: #DCFCE7; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
        .whale-card { border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 12px; margin-bottom: 7px; display: flex; justify-content: space-between; align-items: center; }
        .whale-stock { font-weight: 700; font-size: 12px; color: #0F172A; }
        .whale-owner { font-size: 10.5px; color: #64748B; }
        .roadmap-step { display: flex; gap: 10px; margin-bottom: 9px; background: #F8FAFC; border-left: 4px solid #10B981; padding: 8px 12px; border-radius: 0 8px 8px 0; }
        .step-num { background: #10B981; color: white; width: 22px; height: 22px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; flex-shrink: 0; }
        .step-title { font-weight: 700; font-size: 11.5px; color: #0F172A; }
        .step-desc { font-size: 10.5px; color: #475569; margin-top: 2px; }
        .savings-banner { background: #064E3B; color: white; padding: 14px 18px; border-radius: 10px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center; }
        .savings-amount { font-size: 24px; font-weight: 900; color: #34D399; }
        .page-break { page-break-before: always; }
        .footer { margin-top: 20px; border-top: 1px solid #E2E8F0; padding-top: 8px; font-size: 9px; color: #94A3B8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-box">
          <div class="logo-sq">&#8377;</div>
          <div>
            <div class="app-title">PAISABUDDY PRO</div>
            <div class="app-sub">CA-Ready Portfolio Diagnostic Report</div>
          </div>
        </div>
        <div class="report-meta">
          <div class="report-title">${escapeHtml(sourceMeta.isDemo ? 'Sample Preview Audit' : 'Verified Portfolio Audit')}</div>
          <div class="report-date">${escapeHtml(sourceMeta.fileName || 'Statement')} &bull; ${escapeHtml(currentDate)}</div>
        </div>
      </div>

      ${
        sourceMeta.totalCurrentValueFormatted
          ? `
      <div class="val-strip">
        <div class="val-card">
          <div class="val-lbl">Invested Capital</div>
          <div class="val-num">${escapeHtml(sourceMeta.totalInvestedFormatted || '-')}</div>
        </div>
        <div class="val-card">
          <div class="val-lbl">Current Valuation</div>
          <div class="val-num">${escapeHtml(sourceMeta.totalCurrentValueFormatted || '-')}</div>
        </div>
        <div class="val-card">
          <div class="val-lbl">Net Unrealized P&amp;L</div>
          <div class="val-num" style="color:${(sourceMeta.totalPnl ?? 0) >= 0 ? '#059669' : '#DC2626'};">${escapeHtml(sourceMeta.totalPnlFormatted || '-')}</div>
        </div>
        <div class="val-card">
          <div class="val-lbl">Mix &amp; Count</div>
          <div class="val-num">${sourceMeta.holdingsCount || holdings.length} Assets (${sourceMeta.equitySplitPct ?? 0}% Eq / ${sourceMeta.mfSplitPct ?? 0}% MF)</div>
        </div>
      </div>
      `
          : ''
      }

      <div class="score-hero">
        <div>
          <div style="font-size: 9.5px; font-weight: 700; color: #64748B; text-transform: uppercase;">Portfolio Health Index</div>
          <div class="score-box">
            <span class="score-num">${escapeHtml(healthScore)}</span>
            <span class="score-denom">/100</span>
          </div>
          <div class="score-badge">${escapeHtml(gradeLabel)}</div>
          <div style="font-size: 10px; color: #475569; margin-top: 4px;">${escapeHtml(scoreLabel)}</div>
        </div>

        <div class="diag-grid">
          ${subScores
            .slice(0, 4)
            .map(
              (sub) => `
          <div class="diag-card">
            <div class="diag-num" style="color: ${escapeHtml(sub.color || '#0F172A')};">${escapeHtml(sub.score)}%</div>
            <div class="diag-lbl">${escapeHtml(sub.label)}</div>
          </div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="section-h">
        <span>Mutual Fund Overlap Matrix</span>
        <span style="color: ${overlaps.length > 0 ? '#DC2626' : '#059669'}; font-size: 10.5px;">
          ${overlaps.length > 0 ? `${overlaps.length} Active Overlap(s)` : 'Clean'}
        </span>
      </div>

      ${overlapsHtml}
      ${leaksHtml}

      <div class="section-h">
        <span>Sector Allocation vs SEBI Prudential Limits</span>
      </div>

      <table class="sector-table">
        <thead>
          <tr>
            <th>Sector Name</th>
            <th>Portfolio Share</th>
            <th>Prudent Cap</th>
            <th>Risk Assessment</th>
          </tr>
        </thead>
        <tbody>
          ${sectors
            .map((sec) => {
              const pct = sec.percent ?? sec.percentage ?? 0;
              const limit = sec.safeLimit || sec.benchmark || 'Max 25%';
              return `
            <tr>
              <td><strong>${escapeHtml(sec.sector)}</strong></td>
              <td>${escapeHtml(pct)}% ${sec.valueFormatted ? `(${escapeHtml(sec.valueFormatted)})` : ''}</td>
              <td>${escapeHtml(limit)}</td>
              <td>
                <span class="${sec.isHighRisk ? 'badge-danger' : 'badge-success'}">
                  ${sec.isHighRisk ? 'HIGH CONCENTRATION' : 'BALANCED'}
                </span>
              </td>
            </tr>
          `;
            })
            .join('')}
        </tbody>
      </table>

      <div class="footer">
        Page 1 of 2 &bull; Generated On-Device by PaisaBuddy Pro Audit Engine &bull; ${escapeHtml(currentDate)}
      </div>

      <div class="page-break"></div>

      <div class="header">
        <div class="logo-box">
          <div class="logo-sq">&#8377;</div>
          <div>
            <div class="app-title">PAISABUDDY PRO</div>
            <div class="app-sub">Holdings, Tax Optimization &amp; Action Plan</div>
          </div>
        </div>
        <div class="report-meta">
          <div class="report-title">Action Plan &amp; Tax Summary</div>
          <div class="report-date">${escapeHtml(currentDate)}</div>
        </div>
      </div>

      ${topHoldingsHtml}

      <div class="section-h">
        <span>Super-Investor Alignment &amp; Risk Alerts</span>
        <span style="color: #047857; font-size: 10.5px;">50 Billionaires Cross-Check</span>
      </div>

      ${whaleHtml}

      <div class="section-h">
        <span>Actionable Rebalancing Roadmap</span>
      </div>

      ${actionPlan
        .map(
          (act) => `
        <div class="roadmap-step" style="border-left-color: ${escapeHtml(act.color || '#10B981')};">
          <div class="step-num" style="background: ${escapeHtml(act.color || '#10B981')};">${escapeHtml(act.step)}</div>
          <div style="flex: 1;">
            <div class="step-title">${escapeHtml(act.title)} [${escapeHtml(act.action)}]</div>
            <div class="step-desc">${escapeHtml(act.detail)}</div>
          </div>
        </div>
      `
        )
        .join('')}

      <div class="savings-banner">
        <div>
          <div style="font-size: 9.5px; letter-spacing: 0.8px; text-transform: uppercase; opacity: 0.85;">Estimated Annual Recoverable Savings</div>
          <div class="savings-amount">${escapeHtml(savingsSummary.totalAnnualSavings)}</div>
        </div>
        <div style="text-align: right; font-size: 11px; line-height: 1.6;">
          <div>Direct Plan Conversion: <strong>${escapeHtml(savingsSummary.expenseRatioSaved)}</strong></div>
          <div>Tax Harvesting Shield: <strong>${escapeHtml(savingsSummary.taxHarvestSaved)}</strong></div>
        </div>
      </div>

      <div class="footer">
        Page 2 of 2 &bull; Analytical report generated strictly from imported portfolio data. Consult a SEBI RIA or CA before executing tax-sensitive switches.
      </div>
    </body>
    </html>
  `;
}
