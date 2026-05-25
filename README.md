# 🤖 API IA Centrale — 21st.dev × Vercel

API Node.js serverless déployée sur Vercel. Un seul endpoint, toutes tes apps l'utilisent.

## Structure

```
my-ai-api/
├── agents/
│   └── my-agent/
│       └── index.ts       ← Définition de l'agent 21st.dev
├── api/
│   ├── chat.ts            ← Fonction serverless Vercel (/chat)
│   └── health.ts          ← Health check (/health)
├── vercel.json            ← Config Vercel (routes, runtime Node 20)
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Démarrage

### 1. Installe les dépendances
```bash
npm install
```

### 2. Configure les variables d'environnement
```bash
cp .env.example .env
# Remplis API_KEY_21ST et MY_API_SECRET_KEY
```

### 3. Déploie l'agent 21st.dev
```bash
npx @21st-sdk/cli login    # connecte avec ta clé 21st.dev
npx @21st-sdk/cli deploy   # déploie l'agent
```

### 4. Déploie sur Vercel
```bash
npx vercel               # déploiement preview
npx vercel --prod        # déploiement production
```

### Variables d'env à configurer dans Vercel
Dans le dashboard Vercel → Settings → Environment Variables :
- `API_KEY_21ST`
- `AGENT_BASE_URL`
- `MY_API_SECRET_KEY`

---

## Endpoints

### `POST /chat`

**Headers**
```
x-api-key: ta-cle-secrete
Content-Type: application/json
```

**Body — réponse JSON**
```json
{
  "message": "Explique les closures en JavaScript",
  "sessionId": "sb_xxx"
}
```

**Body — streaming SSE**
```json
{
  "message": "Écris un composant React",
  "stream": true,
  "sessionId": "sb_xxx"
}
```

**Réponse JSON**
```json
{
  "reply": "Une closure est une fonction qui...",
  "sessionId": "sb_abc123"
}
```

---

### `GET /health`
```json
{ "status": "ok", "agent": "my-agent", "timestamp": "..." }
```

---

## Exemples d'appel

### JavaScript / React
```js
// Appel simple
const res = await fetch("https://ton-projet.vercel.app/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "ta-cle-secrete"
  },
  body: JSON.stringify({ message: "Bonjour !" })
})
const { reply, sessionId } = await res.json()

// Continuer la conversation
const suite = await fetch("https://ton-projet.vercel.app/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": "ta-cle-secrete" },
  body: JSON.stringify({ message: "Et en Python ?", sessionId })
})
```

### Python
```python
import requests

def chat(message, session_id=None):
    res = requests.post(
        "https://ton-projet.vercel.app/chat",
        headers={"x-api-key": "ta-cle-secrete"},
        json={"message": message, "sessionId": session_id}
    )
    return res.json()

r = chat("Explique les closures")
print(r["reply"])

# Suite de conversation
r2 = chat("Donne un exemple de code", r["sessionId"])
print(r2["reply"])
```

### cURL
```bash
curl -X POST https://ton-projet.vercel.app/chat \
  -H "x-api-key: ta-cle-secrete" \
  -H "Content-Type: application/json" \
  -d '{"message": "Bonjour !"}'
```
