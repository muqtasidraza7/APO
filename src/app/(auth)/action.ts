'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../utils/supabase/server'

// 1.1 Fix: after login, check if the user already has a workspace.
// If yes → /dashboard. If no → /onboarding (first-time setup).
export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    revalidatePath('/', 'layout')
    redirect(membership?.workspace_id ? '/dashboard' : '/onboarding')
  }

  revalidatePath('/', 'layout')
  redirect('/onboarding')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  if (!fullName?.trim()) return { error: 'Full name is required.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName.trim() },
    },
  })

  if (error) return { error: error.message }

  // If email confirmation is disabled, session is created immediately
  if (data.session) {
    revalidatePath('/', 'layout')
    return { success: true, confirmed: true }
  }

  // Email confirmation required — tell the UI to show the check-email message
  return { success: true, confirmed: false }
}

export async function resetPasswordForEmail(email: string, redirectTo: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) return { error: error.message }
  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  if (!password || password.length < 8) return { error: 'Password must be at least 8 characters.' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}