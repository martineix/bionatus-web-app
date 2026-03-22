import { supabase } from "./supabase"

export async function getMyProfile() {
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