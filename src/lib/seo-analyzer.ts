export interface GSCRow {
  keys: string[]; // [query, page]
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface CannibalizationIssue {
  query: string;
  totalImpressions: number;
  totalClicks: number;
  severity: "High" | "Medium" | "Low";
  competingPages: {
    url: string;
    impressions: number;
    clicks: number;
    avgPosition: number;
    impressionShare: number;
  }[];
}

export interface StrikingDistanceOpportunity {
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  position: number;
  estimatedTrafficGain: number;
}

export function analyzeGSCData(rows: GSCRow[]) {
  const queryGroups: { [query: string]: GSCRow[] } = {};

  for (const row of rows) {
    if (!row.keys || row.keys.length < 2) continue;
    const query = row.keys[0];
    if (!queryGroups[query]) queryGroups[query] = [];
    queryGroups[query].push(row);
  }

  const cannibalization: CannibalizationIssue[] = [];
  const strikingDistance: StrikingDistanceOpportunity[] = [];

  for (const [query, group] of Object.entries(queryGroups)) {
    if (group.length > 1) {
      const totalImpressions = group.reduce((sum, r) => sum + r.impressions, 0);
      const totalClicks = group.reduce((sum, r) => sum + r.clicks, 0);

      if (totalImpressions >= 30) {
        const competingPages = group.map((item) => {
          const share = (item.impressions / totalImpressions) * 100;
          return {
            url: item.keys[1],
            impressions: item.impressions,
            clicks: item.clicks,
            avgPosition: Number(item.position.toFixed(1)),
            impressionShare: Number(share.toFixed(1)),
          };
        });

        const activeCompetitors = competingPages.filter((p) => p.impressionShare >= 15);

        if (activeCompetitors.length >= 2) {
          let severity: "High" | "Medium" | "Low" = "Low";
          const positions = activeCompetitors.map((p) => p.avgPosition);
          const minPos = Math.min(...positions);
          const maxPos = Math.max(...positions);

          if (minPos <= 10 && maxPos - minPos <= 6) {
            severity = "High";
          } else if (minPos <= 20) {
            severity = "Medium";
          }

          cannibalization.push({
            query,
            totalImpressions,
            totalClicks,
            severity,
            competingPages: activeCompetitors,
          });
        }
      }
    }

    for (const row of group) {
      if (row.position >= 7.0 && row.position <= 18.0 && row.impressions >= 50) {
        const potentialClicks = Math.round(row.impressions * 0.15);
        const gain = Math.max(0, potentialClicks - row.clicks);

        strikingDistance.push({
          query: row.keys[0],
          page: row.keys[1],
          impressions: row.impressions,
          clicks: row.clicks,
          position: Number(row.position.toFixed(1)),
          estimatedTrafficGain: gain,
        });
      }
    }
  }

  cannibalization.sort((a, b) => b.totalImpressions - a.totalImpressions);
  strikingDistance.sort((a, b) => b.impressions - a.impressions);

  return { cannibalization, strikingDistance };
}