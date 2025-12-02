import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Create entry
router.post('/', requireAuth, async (req, res) => {
  try {
    const { type, count, customerId, vendorId } = req.body || {}
    if (!type || !count) {
      return res.status(400).json({ ok: false, error: 'missing_fields' })
    }
    if (type !== 'GIVEN' && type !== 'RECEIVED') {
      return res.status(400).json({ ok: false, error: 'invalid_type' })
    }
    const numericCount = Number(count)
    if (!Number.isFinite(numericCount) || numericCount <= 0) {
      return res.status(400).json({ ok: false, error: 'invalid_count' })
    }
    let entryData = { type, count: numericCount }
    if (req.user.role === 'CUSTOMER') {
      if (!vendorId) return res.status(400).json({ ok: false, error: 'vendor_required' })
      entryData.customerId = req.user.id
      entryData.vendorId = Number(vendorId)
      // Validate vendor exists and has role VENDOR to avoid FK errors
      const vendor = await prisma.user.findUnique({ where: { id: entryData.vendorId } })
      if (!vendor || vendor.role !== 'VENDOR') {
        return res.status(400).json({ ok: false, error: 'invalid_vendor' })
      }
    } else if (req.user.role === 'VENDOR') {
      if (!customerId) return res.status(400).json({ ok: false, error: 'customer_required' })
      entryData.vendorId = req.user.id
      entryData.customerId = Number(customerId)
      // Validate customer exists and has role CUSTOMER to avoid FK errors
      const customer = await prisma.user.findUnique({ where: { id: entryData.customerId } })
      if (!customer || customer.role !== 'CUSTOMER') {
        return res.status(400).json({ ok: false, error: 'invalid_customer' })
      }
    }
    const entry = await prisma.clothesEntry.create({ data: entryData })
    return res.json({ ok: true, entry })
  } catch (e) {
    // Map common Prisma errors to 400 where appropriate
    if (e && e.code === 'P2003') {
      // Foreign key constraint failed
      return res.status(400).json({ ok: false, error: 'invalid_reference' })
    }
    console.error('clothes_post_error', e)
    return res.status(500).json({ ok: false, error: 'server_error' })
  }
})

// List entries for logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const where =
      req.user.role === 'CUSTOMER'
        ? { customerId: req.user.id }
        : { vendorId: req.user.id }
    const entries = await prisma.clothesEntry.findMany({
      where,
      orderBy: { date: 'desc' }
    })
    return res.json({ ok: true, entries })
  } catch (e) {
    console.error('clothes_get_error', e)
    return res.status(500).json({ ok: false, error: 'server_error' })
  }
})

// Update entry
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'invalid_id' })
    const entry = await prisma.clothesEntry.findUnique({ where: { id } })
    if (!entry) return res.status(404).json({ ok: false, error: 'not_found' })
    if (req.user.role === 'CUSTOMER' && entry.customerId !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'forbidden' })
    }
    if (req.user.role === 'VENDOR' && entry.vendorId !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'forbidden' })
    }
    const updates = {}
    if (req.body.type) {
      if (req.body.type !== 'GIVEN' && req.body.type !== 'RECEIVED') {
        return res.status(400).json({ ok: false, error: 'invalid_type' })
      }
      updates.type = req.body.type
    }
    if (req.body.count !== undefined) {
      const numericCount = Number(req.body.count)
      if (!Number.isFinite(numericCount) || numericCount <= 0) {
        return res.status(400).json({ ok: false, error: 'invalid_count' })
      }
      updates.count = numericCount
    }
    const updated = await prisma.clothesEntry.update({ where: { id }, data: updates })
    return res.json({ ok: true, entry: updated })
  } catch (e) {
    console.error('clothes_put_error', e)
    return res.status(500).json({ ok: false, error: 'server_error' })
  }
})

// Delete entry
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'invalid_id' })
    const entry = await prisma.clothesEntry.findUnique({ where: { id } })
    if (!entry) return res.status(404).json({ ok: false, error: 'not_found' })
    if (req.user.role === 'CUSTOMER' && entry.customerId !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'forbidden' })
    }
    if (req.user.role === 'VENDOR' && entry.vendorId !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'forbidden' })
    }
    await prisma.clothesEntry.delete({ where: { id } })
    return res.json({ ok: true })
  } catch (e) {
    console.error('clothes_delete_error', e)
    return res.status(500).json({ ok: false, error: 'server_error' })
  }
})

export default router


