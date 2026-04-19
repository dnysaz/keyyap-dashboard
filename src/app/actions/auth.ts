'use server'

export async function isAdmin(email: string) {
  const adminEmail = process.env.ADMIN_EMAIL
  
  if (!adminEmail) {
    console.error('ADMIN_EMAIL is not set in environment variables')
    return false
  }

  return email === adminEmail
}
