import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = new Hono()
const port = 5000

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Store logs in memory
let logs = []

// 1. Serve the static HTML file
app.get('/', async (c) => {
  try {
    const html = await readFile(path.join(__dirname, 'index.html'), 'utf-8')
    return c.html(html)
  } catch (err) {
    return c.text('Error loading index.html', 500)
  }
})

// 2. Receive logs from Unity
app.post('/log', async (c) => {
  try {
    const data = await c.req.json()
    
    if (data && data.message) {
      logs.push(data.message)
      console.log(`Log received: ${data.message}`)
      return c.json({ status: "success" }, 200)
    }
    
    return c.json({ status: "error", message: "No data received" }, 400)
  } catch (err) {
    return c.json({ status: "error", message: "Invalid JSON" }, 400)
  }
})

// 3. Send logs to the frontend
app.get('/get_logs', (c) => {
  return c.json(logs)
})

// Start the server
console.log(`Hono server running at http://0.0.0.0:${port}`)

serve({
  fetch: app.fetch,
  port: port,
  hostname: '0.0.0.0'
})