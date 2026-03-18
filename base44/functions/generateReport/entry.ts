import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // RBAC: ADMIN, FINANCE, HR_MANAGER
    if (user.role !== 'admin' && !['ADMIN', 'FINANCE', 'HR_MANAGER'].includes(user.business_role)) {
      return Response.json({ error: 'Forbidden: insufficient business role' }, { status: 403 });
    }

    const payload = await req.json();
    const { data, criteria } = payload;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return Response.json({ error: 'Geen gegevens beschikbaar voor rapportage' }, { status: 400 });
    }

    // Analyze data
    const stats = analyzeData(data);
    
    // Generate report based on type
    let report = '';
    
    if (criteria.type === 'summary') {
      report = generateSummaryReport(stats, data, criteria);
    } else if (criteria.type === 'detailed') {
      report = generateDetailedReport(stats, data, criteria);
    } else if (criteria.type === 'custom') {
      report = generateCustomReport(stats, data, criteria);
    }

    return Response.json({ 
      report,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Fout in generateReport:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function analyzeData(data) {
  const stats = {
    totalRows: data.length,
    columns: Object.keys(data[0] || {}),
    columnStats: {},
    numericColumns: [],
    stringColumns: [],
    dateColumns: []
  };

  stats.columns.forEach(col => {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
    const types = new Set(values.map(v => typeof v));
    
    const colStats = {
      uniqueValues: new Set(values).size,
      emptyCount: data.length - values.length,
      sampleValues: values.slice(0, 3),
      types: Array.from(types)
    };

    // Check if numeric
    if (values.some(v => typeof v === 'number')) {
      const numValues = values.filter(v => typeof v === 'number');
      colStats.min = Math.min(...numValues);
      colStats.max = Math.max(...numValues);
      colStats.avg = numValues.reduce((a, b) => a + b, 0) / numValues.length;
      stats.numericColumns.push(col);
    } else {
      stats.stringColumns.push(col);
    }

    stats.columnStats[col] = colStats;
  });

  return stats;
}

function generateSummaryReport(stats, data, criteria) {
  const timestamp = new Date().toLocaleDateString('nl-NL');
  
  let report = `# Samenvatting Rapport\n\n`;
  report += `**Gegenereerd:** ${timestamp}\n\n`;
  
  report += `## Overzicht Gegevens\n\n`;
  report += `- **Totale rijen:** ${stats.totalRows}\n`;
  report += `- **Kolommen:** ${stats.columns.length}\n`;
  report += `- **Geanalyseerde periode:** ${criteria.period === 'all' ? 'Alle imports' : 'Geselecteerde import'}\n\n`;

  report += `## Data Samenvatting\n\n`;
  report += `| Kolom | Unieke Waarden | Leeg | Type |\n`;
  report += `|-------|-----------------|------|------|\n`;
  
  stats.columns.slice(0, 10).forEach(col => {
    const colStat = stats.columnStats[col];
    const typeStr = colStat.types.join(', ');
    report += `| ${col} | ${colStat.uniqueValues} | ${colStat.emptyCount} | ${typeStr} |\n`;
  });

  if (stats.columns.length > 10) {
    report += `\n*Meer kolommen beschikbaar (totaal: ${stats.columns.length})*\n`;
  }

  report += `\n## Numerieke Gegevens\n\n`;
  if (stats.numericColumns.length > 0) {
    stats.numericColumns.slice(0, 5).forEach(col => {
      const colStat = stats.columnStats[col];
      report += `### ${col}\n`;
      report += `- **Minimum:** ${colStat.min?.toFixed(2)}\n`;
      report += `- **Maximum:** ${colStat.max?.toFixed(2)}\n`;
      report += `- **Gemiddelde:** ${colStat.avg?.toFixed(2)}\n`;
      report += `- **Unieke waarden:** ${colStat.uniqueValues}\n\n`;
    });
  } else {
    report += `Geen numerieke kolommen gevonden.\n\n`;
  }

  report += `## Datakwaliteit\n\n`;
  const qualityScore = calculateQualityScore(stats, data);
  report += `- **Kwaliteitsscore:** ${qualityScore}%\n`;
  report += `- **Status:** ${qualityScore >= 80 ? 'Goed' : qualityScore >= 60 ? 'Acceptabel' : 'Moet verbeterd worden'}\n`;

  return report;
}

function generateDetailedReport(stats, data, criteria) {
  let report = generateSummaryReport(stats, data, criteria);

  report += `## Gedetailleerde Kolom Analyse\n\n`;

  stats.columns.forEach(col => {
    const colStat = stats.columnStats[col];
    report += `### ${col}\n\n`;
    report += `- **Datatype:** ${colStat.types.join(', ')}\n`;
    report += `- **Unieke waarden:** ${colStat.uniqueValues}\n`;
    report += `- **Lege cellen:** ${colStat.emptyCount}\n`;
    report += `- **Volledigheid:** ${((1 - colStat.emptyCount / stats.totalRows) * 100).toFixed(1)}%\n`;
    
    if (colStat.sampleValues.length > 0) {
      report += `- **Voorbeeldwaarden:** ${colStat.sampleValues.join(', ')}\n`;
    }
    
    if (colStat.min !== undefined) {
      report += `- **Bereik:** ${colStat.min} tot ${colStat.max}\n`;
      report += `- **Gemiddelde:** ${colStat.avg?.toFixed(2)}\n`;
    }
    report += `\n`;
  });

  return report;
}

function generateCustomReport(stats, data, criteria) {
  let report = `# Aangepast Rapport\n\n`;
  report += `**Criteria:** ${criteria.customCriteria || 'Geen specifieke criteria'}\n\n`;

  // Analyze based on custom criteria
  const lowerCriteria = (criteria.customCriteria || '').toLowerCase();
  
  report += `## Analyse\n\n`;

  if (lowerCriteria.includes('prijs') || lowerCriteria.includes('bedrag') || lowerCriteria.includes('kostprijs')) {
    report += analyzeFinancialData(stats, data);
  }

  if (lowerCriteria.includes('datum') || lowerCriteria.includes('periode') || lowerCriteria.includes('tijd')) {
    report += analyzeDateData(stats, data);
  }

  if (lowerCriteria.includes('categor') || lowerCriteria.includes('type')) {
    report += analyzeCategoricalData(stats, data);
  }

  // Default analysis
  if (!report.includes('Analyse')) {
    report += `## Automatische Analyse\n\n`;
    report += generateSummaryReport(stats, data, criteria);
  }

  return report;
}

function analyzeFinancialData(stats, data) {
  let report = `### Financiële Analyse\n\n`;
  
  const numericCols = stats.numericColumns;
  if (numericCols.length === 0) {
    return report + `Geen numerieke kolommen gevonden voor financiële analyse.\n\n`;
  }

  numericCols.forEach(col => {
    const values = data.map(row => row[col]).filter(v => typeof v === 'number' && v > 0);
    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      report += `**${col}**\n`;
      report += `- Totaal: €${sum.toFixed(2)}\n`;
      report += `- Gemiddelde: €${avg.toFixed(2)}\n`;
      report += `- Range: €${min.toFixed(2)} - €${max.toFixed(2)}\n`;
      report += `- Aantal transacties: ${values.length}\n\n`;
    }
  });

  return report;
}

function analyzeDateData(stats, data) {
  let report = `### Temporele Analyse\n\n`;
  
  const datePatterns = findDateColumns(stats, data);
  if (datePatterns.length === 0) {
    return report + `Geen datumkolommen gevonden.\n\n`;
  }

  datePatterns.forEach(col => {
    const values = data.map(row => row[col]).filter(v => v);
    report += `**${col}**: ${values.length} datums gevonden\n`;
  });

  return report + `\n`;
}

function analyzeCategoricalData(stats, data) {
  let report = `### Categorale Analyse\n\n`;
  
  stats.stringColumns.slice(0, 5).forEach(col => {
    const colStat = stats.columnStats[col];
    const values = data.map(row => row[col]).filter(v => v);
    const topValues = getTopValues(values, 5);
    
    report += `**${col}**\n`;
    report += `- Unieke categorieën: ${colStat.uniqueValues}\n`;
    report += `- Top categorieën:\n`;
    topValues.forEach(({ value, count }) => {
      report += `  - ${value}: ${count} (${((count / values.length) * 100).toFixed(1)}%)\n`;
    });
    report += `\n`;
  });

  return report;
}

function findDateColumns(stats, data) {
  return stats.columns.filter(col => {
    const sample = data.find(row => row[col]);
    if (!sample) return false;
    const val = sample[col];
    return typeof val === 'string' && /(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/.test(val);
  });
}

function getTopValues(values, limit) {
  const counts = {};
  values.forEach(v => {
    counts[v] = (counts[v] || 0) + 1;
  });
  
  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function calculateQualityScore(stats, data) {
  let score = 100;
  
  // Deduct for empty values
  stats.columns.forEach(col => {
    const emptyRate = stats.columnStats[col].emptyCount / stats.totalRows;
    if (emptyRate > 0.2) score -= 10;
    if (emptyRate > 0.5) score -= 20;
  });

  // Bonus for variety
  const avgUnique = stats.columns.reduce((sum, col) => {
    return sum + (stats.columnStats[col].uniqueValues / stats.totalRows);
  }, 0) / stats.columns.length;

  if (avgUnique > 0.5) score += 10;

  return Math.max(0, Math.min(100, score));
}