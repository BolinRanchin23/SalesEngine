import { EnrichmentResult, WebResearchItem } from '../types';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

function categorizeResult(title: string, snippet: string): WebResearchItem['category'] {
  const text = `${title} ${snippet}`.toLowerCase();
  if (text.includes('press release') || text.includes('announces') || text.includes('announcement')) return 'press_release';
  if (text.includes('board of directors') || text.includes('board member') || text.includes('advisory board')) return 'board_membership';
  if (text.includes('volunteer') || text.includes('community') || text.includes('nonprofit') || text.includes('charity')) return 'community';
  if (text.includes('award') || text.includes('honored') || text.includes('recognition') || text.includes('winner')) return 'award';
  if (text.includes('published') || text.includes('publication') || text.includes('journal') || text.includes('authored')) return 'publication';
  if (text.includes('article') || text.includes('interview') || text.includes('featured') || text.includes('profile')) return 'article';
  return 'other';
}

export async function searchPerson(params: {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  city?: string;
}): Promise<EnrichmentResult> {
  if (!BRAVE_API_KEY) {
    return { provider: 'websearch', success: false, credits_used: 0, data: {}, cached: false };
  }

  const queryParts = [
    params.first_name,
    params.last_name,
    params.company_name,
    params.city,
  ].filter(Boolean);

  if (queryParts.length < 2) {
    return { provider: 'websearch', success: false, credits_used: 0, data: {}, cached: false };
  }

  const query = queryParts.join(' ');

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': BRAVE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      return { provider: 'websearch', success: false, credits_used: 1, data: {}, cached: false };
    }

    const data = await response.json();
    const webResults = (data.web?.results ?? []) as Array<{
      title: string;
      url: string;
      description: string;
    }>;

    const webResearch: WebResearchItem[] = webResults
      .filter((r) => {
        const url = r.url.toLowerCase();
        // Filter out LinkedIn (already have that data) and generic social media
        return !url.includes('linkedin.com') &&
               !url.includes('facebook.com') &&
               !url.includes('twitter.com') &&
               !url.includes('instagram.com');
      })
      .map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.description,
        category: categorizeResult(r.title, r.description),
        found_at: new Date().toISOString(),
      }));

    return {
      provider: 'websearch',
      success: true,
      credits_used: 1,
      data: { web_research: webResearch },
      cached: false,
    };
  } catch {
    return { provider: 'websearch', success: false, credits_used: 0, data: {}, cached: false };
  }
}
