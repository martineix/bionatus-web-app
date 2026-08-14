import { supabase } from "./supabase"

let cachedProfile: any = null
let inFlight: Promise<any> | null = null

// Permite que quem monta o layout (ex: AppShell) leia o valor já conhecido
// de forma síncrona, sem esperar um novo round-trip ao Supabase a cada
// navegação — evita o "flash" de itens de admin para representantes.
export function getCachedProfile() {
    return cachedProfile
}

export function clearProfileCache() {
    cachedProfile = null
    inFlight = null
}

async function fetchProfile() {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error("Usuário não autenticado.")
    }

    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

    if (error) {
        throw error
    }

    return data
}

export async function getMyProfile() {
    if (cachedProfile) return cachedProfile

    if (!inFlight) {
        inFlight = fetchProfile().finally(() => {
            inFlight = null
        })
    }

    cachedProfile = await inFlight
    return cachedProfile
}