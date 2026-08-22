const fs = require('fs');
let api = fs.readFileSync('frontend/src/lib/api.ts', 'utf8');

api = api.replace(
  'import type { ApplicationRecord, Opportunity, SearchResponse, StudentProfile }',
  'import type { ApplicationRecord, Opportunity, DiscoverySearchResponse, StudentProfile }'
);

api = api.replace(
  'export async function searchOpportunities(query: string): Promise<SearchResponse>',
  'export async function searchOpportunities(query: string, forceRefresh = false): Promise<DiscoverySearchResponse>'
);

api = api.replace(
  'body: JSON.stringify({ query })',
  'body: JSON.stringify({ query, forceRefresh })'
);

fs.writeFileSync('frontend/src/lib/api.ts', api);
console.log('Updated frontend/src/lib/api.ts');
