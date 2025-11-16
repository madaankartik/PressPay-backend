import { Router } from 'express'
import { prisma } from '../prisma.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = Router()

function signToken(user) {
  const payload = { userId: user.id, role: user.role, name: user.name }
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me'
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

router.post('/register', async (req, res) => {
  try {
    const { role, name, email, password, phone, address, rate, shopName } = req.body || {}
    if (!role || !name || !email || !password) {
      return res.status(400).json({ ok: false, error: 'missing_fields' })
    }
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ ok: false, error: 'email_exists' })

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        role,
        name,
        email,
        password: hash,
        phone: phone || null,
        address: address || null,
        rate: role === 'VENDOR' ? (rate ? Number(rate) : null) : null,
        // shopName stored in address or add new column later; skipping to keep schema minimal
      }
    })
    const token = signToken(user)
    return res.json({ ok: true, token, role: user.role, name: user.name })
  } catch (e) {
    console.error('register_error', e)
    return res.status(500).json({ ok: false, error: 'server_error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'missing_fields' })
    }
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ ok: false, error: 'invalid_credentials' })
    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ ok: false, error: 'invalid_credentials' })
    const token = signToken(user)
    return res.json({ ok: true, token, role: user.role, name: user.name })
  } catch (e) {
    console.error('login_error', e)
    return res.status(500).json({ ok: false, error: 'server_error' })
  }
})

export default router


