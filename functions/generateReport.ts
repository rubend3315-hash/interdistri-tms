import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, criteria } = await req.json();

    const prompt = `Analyze the following imported customer data and generate a comprehensive report.

Data Summary:
- Total Rows: ${data.length}
- Columns: ${Object.keys(data[0] || {}).join(', ')}
- Period: ${criteria.period}
${criteria.customCriteria ? `- Custom Criteria: ${criteria.customCriteria}` : ''}

Sample Data (first 5 rows):
${JSON.stringify(data.slice(0, 5), null, 2)}

Please provide:
1. Executive Summary: Key findings and insights
2. Data Quality: Issues or anomalies detected
3. Trends: Notable patterns or trends
4. Recommendations: Actionable insights for the business
5. Key Metrics: Important numbers and percentages

Format the response in clear sections with bullet points.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    return Response.json({ 
      report: response,
      dataPoints: data.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});