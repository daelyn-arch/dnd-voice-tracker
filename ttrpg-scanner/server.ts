import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json({ limit: '50mb' }))
app.use(express.static(join(__dirname, 'dist')))

app.post('/api/analyze', async (req, res) => {
  const { apiKey, model, messages, system, max_tokens } = req.body
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, messages, system, max_tokens }),
    })
    const data = await response.text()
    res.status(response.status).type('json').send(data)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`TTRPG Scanner running at http://localhost:${PORT}`)
})
