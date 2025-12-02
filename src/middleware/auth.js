import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return res.status(401).json({ ok: false, error: 'unauthorized' })
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me'
    const payload = jwt.verify(token, secret)
    req.user = { id: payload.userId, role: payload.role, name: payload.name }
    next()
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }
}

export function requireVendor(req, res, next) {
  if (!req.user || req.user.role !== 'VENDOR') {
    return res.status(403).json({ ok: false, error: 'forbidden' })
  }
  next()
}


