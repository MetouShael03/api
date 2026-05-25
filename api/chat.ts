import type { VercelRequest, VercelResponse } from "@vercel/node"
import { AgentClient } from "@21st-sdk/node"

const client = new AgentClient({ apiKey: process.env.API_KEY_21ST! })

// ── Middleware auth ────────────────────────────────────────────────────────
function checkApiKey(req: VercelRequest, res: VercelResponse): boolean {
  const key = req.headers["x-api-key"]
  if (!key || key !== process.env.MY_API_SECRET_KEY) {
    res.status(401).json({ error: "Unauthorized" })
    return false
  }
  return true
}

// ── Handler principal ──────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — autorise toutes tes apps
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })
  if (!checkApiKey(req, res)) return

  const { message, sessionId, stream = false } = req.body

  if (!message) {
    return res.status(400).json({ error: "Le champ 'message' est requis" })
  }

  try {
    // Sandbox : réutilise ou crée
    const sandbox = sessionId
      ? { id: sessionId }
      : await client.sandboxes.create({ agent: "my-agent" })

    // Token court-vécu
    const token = await client.tokens.create({ agent: "my-agent" })

    const agentRes = await fetch(`${process.env.AGENT_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.token}`,
      },
      body: JSON.stringify({
        sandboxId: sandbox.id,
        messages: [{ role: "user", content: message }],
      }),
    })

    if (!agentRes.ok) {
      throw new Error(`Agent error: ${agentRes.status} ${agentRes.statusText}`)
    }

    // ── Mode streaming SSE ─────────────────────────────────────────────────
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream")
      res.setHeader("Cache-Control", "no-cache")
      res.setHeader("Connection", "keep-alive")

      // Envoie d'abord le sessionId
      res.write(`data: ${JSON.stringify({ type: "session", sessionId: sandbox.id })}\n\n`)

      const reader = agentRes.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        res.write(chunk)
      }

      return res.end()
    }

    // ── Mode JSON (défaut) ─────────────────────────────────────────────────
    const reader = agentRes.body!.getReader()
    const decoder = new TextDecoder()
    let fullReply = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === "text" && event.text) fullReply += event.text
          } catch {}
        }
      }
    }

    return res.status(200).json({
      reply: fullReply,
      sessionId: sandbox.id,
    })

  } catch (err: any) {
    console.error("[/api/chat]", err.message)
    return res.status(500).json({ error: "Erreur interne", detail: err.message })
  }
}
