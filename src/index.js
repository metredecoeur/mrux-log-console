import { Hono } from 'hono'

const app = new Hono()

// 1. Receive logs from Unity (Using Cloudflare KV to persist logs)
app.post('/log', async (c) => {
  const data = await c.req.json()
  if (data && data.message) {
    // Get existing logs from KV (or empty array if none)
    const existingLogsRaw = await c.env.LOG_STORAGE.get('logs')
    const logs = existingLogsRaw ? JSON.parse(existingLogsRaw) : []

    logs.push(data.message)

    // Save back to KV
    await c.env.LOG_STORAGE.put('logs', JSON.stringify(logs))
    return c.json({ status: "success" }, 200)
  }
  return c.json({ status: "error" }, 400)
})

// 2. Send logs to the frontend
app.get('/get_logs', async (c) => {
  const logs = await c.env.LOG_STORAGE.get('logs')
  return c.json(logs ? JSON.parse(logs) : [])
})

// Wrangler handles serving the static files based on assets setting in wrangler.jsonc

export default app