'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/onboarding') 
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  console.log("Attempting signup for:", email); 

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    console.error("Signup Error:", error.message); 
    return { error: error.message }
  }

  console.log("Signup Success User ID:", data.user?.id); 
  
  revalidatePath('/', 'layout')
  return { success: true, message: 'Account created. Please check your email to verify your account.' }
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}