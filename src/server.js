import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRouter from './routes/auth.js'
import clothesRouter from './routes/clothes.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'PressPay API' })
})

app.use('/auth', authRouter)
app.use('/clothes', clothesRouter)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})


