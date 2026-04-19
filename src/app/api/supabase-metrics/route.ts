import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const projectRef = process.env.SUPABASE_PROJECT_REF

  if (!token || !projectRef) {
    return NextResponse.json({ error: 'Missing management credentials' }, { status: 401 })
  }

  try {
    const headers = { 'Authorization': `Bearer ${token}` }
    
    // Fetch multiple metrics in parallel
    const [projectRes, usageRes, authRes, bucketsRes] = await Promise.all([
      fetch(`https://api.supabase.com/v1/projects`, { headers }),
      fetch(`https://api.supabase.com/v1/projects/${projectRef}/usage`, { headers }),
      fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, { headers }),
      fetch(`https://api.supabase.com/v1/projects/${projectRef}/storage/buckets`, { headers })
    ])

    if (!projectRes.ok) throw new Error('Failed to fetch projects')

    const projects = await projectRes.json()
    const targetProject = projects.find((p: any) => p.ref === projectRef)

    if (!targetProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const usage = usageRes.ok ? await usageRes.json() : null
    const authConfig = authRes.ok ? await authRes.json() : null
    const buckets = bucketsRes.ok ? await bucketsRes.json() : []

    return NextResponse.json({
      activeStatus: targetProject.status,
      region: targetProject.region,
      createdAt: targetProject.created_at,
      database: targetProject.database,
      usage: usage,
      buckets: buckets,
      auth: {
        external_providers: authConfig?.external_providers || [],
        mailer_secure: authConfig?.mailer_secure,
        site_url: authConfig?.site_url
      }
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
