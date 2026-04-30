import { neon } from '@neondatabase/serverless';

// Endpoint admin para ver la lista de waitlist
// Protegido por un token simple (ADMIN_TOKEN en env vars de Vercel)
// Uso: GET /api/admin?token=tu-token-secreto

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth simple
  const token = req.query.token || req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: 'DB no configurada' });
    }
    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql`
      SELECT id, email, source, created_at, signup_count, last_seen_at
      FROM waitlist
      ORDER BY created_at DESC
      LIMIT 1000
    `;

    const stats = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS last_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS last_7d
      FROM waitlist
    `;

    return res.status(200).json({
      stats: stats[0],
      entries: rows,
    });
  } catch (err) {
    console.error('Admin error:', err);
    return res.status(500).json({ error: 'Error al consultar' });
  }
}
