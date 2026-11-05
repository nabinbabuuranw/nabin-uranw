export type Live = { url: string; ok: boolean; checkedAt: string; via?: string } | null;
export type Repo = {
  name: string; url: string; description: string | null; language: string | null; topics: string[];
  homepage: string | null; stars: number; forks: number; archived: boolean; license: string | null;
  defaultBranch: string; createdAt: string; pushedAt: string; updatedAt: string;
  liveCandidate: string | null; live: Live;
};
export type Profile = { login: string; name: string | null; avatar: string | null; url: string };
export type ProjectsPayload = { fetchedAt: string; source: "build" | "live" | "stale" | "snapshot"; profile: Profile; repos: Repo[]; note?: string };
