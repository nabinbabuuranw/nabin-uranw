// Shared by the build-time snapshot script (Node) and the Cloudflare Worker (runtime).
// Real GitHub data only: everything here is a mapping of fields the GitHub API returns.
export const GH_USER = "nabinbabuuranw";

// Repos whose live site is known even if the repo's "homepage" field is empty.
// A URL listed here is still only shown after it answers 200.
export const KNOWN_LIVE = {
  byawastha: "https://byawastha.sites.tab.bot/",
  chukta: "https://chukta.sites.tab.bot/",
  palo: "https://palo.sites.tab.bot/",
  "nepali-date": "https://nepali-date.sites.tab.bot/",
};

export function normalizeRepo(r) {
  const homepage = (r.homepage || "").trim() || null;
  return {
    name: r.name,
    url: r.html_url,
    description: r.description || null,
    language: r.language || null,
    topics: Array.isArray(r.topics) ? r.topics : [],
    homepage,
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
    archived: !!r.archived,
    license: r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : null,
    defaultBranch: r.default_branch || "main",
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
    updatedAt: r.updated_at,
    liveCandidate: (homepage && /^https?:\/\//.test(homepage) ? homepage : null) || KNOWN_LIVE[r.name] || null,
  };
}

export function normalizeList(list) {
  return list
    .filter((r) => !r.fork && !r.private)
    .map(normalizeRepo)
    .sort((a, b) => (b.pushedAt || "").localeCompare(a.pushedAt || ""));
}

export function profileFrom(list, user) {
  const owner = list[0]?.owner;
  return {
    login: user?.login || owner?.login || GH_USER,
    name: user?.name || null,
    avatar: user?.avatar_url || owner?.avatar_url || null,
    url: user?.html_url || owner?.html_url || `https://github.com/${GH_USER}`,
  };
}
