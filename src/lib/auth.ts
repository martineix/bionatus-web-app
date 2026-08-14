import { supabase } from "./supabase"
import { clearProfileCache } from "./profile"
import { clearPermissionsCache } from "./permissions"

export async function signInWithPassword(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  })
}

export async function signOut() {
  clearProfileCache()
  clearPermissionsCache()
  return await supabase.auth.signOut()
}