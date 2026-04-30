import { neon } from '@neondatabase/serverless';

// Endpoint serverless de Vercel
// Acepta POST con { email, source } y guarda en Neon (Postgres)

export default async function handler(req, res) {
  // CORS — permitir desde tracklog.fm y localhost (dev)
  const allowedOrigins = ['https://tracklog.fm', 'https://www.tracklog.fm', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, source = 'landing' } = req.body || {};

    // Validación básica
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email requerido' });
    }

    const cleaned = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleaned) || cleaned.length > 254) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Honeypot básico contra bots (campos extra que un humano no llenaría)
    if (req.body.website || req.body.url) {
      // Pretender éxito pero no guardar
      return res.status(200).json({ ok: true });
    }

    // Conexión a Neon
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL no configurado');
      return res.status(500).json({ error: 'Configuración faltante' });
    }
    const sql = neon(process.env.DATABASE_URL);

    // Capturar metadata útil
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || null;
    const userAgent = req.headers['user-agent']?.slice(0, 500) || null;
    const referer = req.headers['referer']?.slice(0, 500) || null;

    // INSERT con upsert (si el email ya existe, no duplica)
    const result = await sql`
      INSERT INTO waitlist (email, source, ip, user_agent, referer)
      VALUES (${cleaned}, ${source.slice(0, 50)}, ${ip}, ${userAgent}, ${referer})
      ON CONFLICT (email) DO UPDATE SET
        signup_count = waitlist.signup_count + 1,
        last_seen_at = NOW()
      RETURNING id, email, created_at, signup_count
    `;

    return res.status(200).json({
      ok: true,
      message: '¡Listo! Te avisamos cuando entres a la beta.',
      already_signed_up: result[0].signup_count > 1,
    });
  } catch (err) {
    console.error('Waitlist error:', err);
    return res.status(500).json({ error: 'Error al guardar. Intenta de nuevo.' });
  }
}
