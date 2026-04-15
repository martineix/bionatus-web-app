// src/lib/dashboard/github.ts

import type { GithubUpdate } from "./types"

type GithubUpdatesResponse = {
  updates?: GithubUpdate[]
}

export async function getGithubUpdates(): Promise<GithubUpdate[]> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-updates`,
    {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error("Erro ao buscar updates do GitHub.")
  }

  const json = (await response.json()) as GithubUpdatesResponse
  return json.updates ?? []
}