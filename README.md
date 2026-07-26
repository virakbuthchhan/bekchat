# Bek-Chat 🚀
> Self-hostable, real-time team chat platform with Slack-compatible incoming webhooks, HMAC signed outgoing webhooks, Telegram-style Bot API, and interactive React UI.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.3-red.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-18.2-cyan.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-danger.svg)](https://redis.io/)
[![Docker Compose](https://img.shields.io/badge/Docker_Compose-Supported-success.svg)](https://docs.docker.com/compose/)

---

## 📐 System Architecture

```mermaid
graph TD
    Client[Web Browser / Mobile React App] -->|HTTP / REST| Nginx[Nginx Reverse Proxy :80]
    Client -->|WebSockets (Socket.IO)| Nginx
    
    Nginx -->|Static Frontend| Dist[React + Vite App]
    Nginx -->|/api & /socket.io| Backend[NestJS Backend API :3000]
    
    Backend -->|Pub/Sub & Session| Redis[(Redis :6379)]
    Backend -->|Primary Data| Postgres[(PostgreSQL 16 :5432)]
    
    ExtService[External Service / CI-CD] -->|Incoming Webhook (Slack JSON)| Backend
    Backend -->|Outgoing Webhook (HMAC Signature)| WebhookReceiver[External Listener]
    BotAgent[Bot Client] -->|Telegram Bot API /sendMessage| Backend
```

---

## ✨ Features Checklist

- [x] **Real-Time Team Communication**: Public & private channels, 1:1 Direct Messages, thread replies, and markdown text formatting.
- [x] **Socket.IO + Redis Pub/Sub**: Real-time event broadcasting, horizontal scaling support across multiple nodes, typing indicators, and presence status (`ONLINE`, `AWAY`, `OFFLINE`).
- [x] **Slack-Compatible Incoming Webhooks**: Generate channel webhook tokens (`POST /api/webhooks/incoming/:token`) accepting standard Slack JSON (`text`, `username`, `icon_url`, `attachments`). Rate-limited per token.
- [x] **HMAC-SHA256 Outgoing Webhooks**: Dispatch workspace events (`message.created`, `user.joined`, `reaction.added`, etc.) to external URLs with `X-Signature` HMAC headers, exponential backoff retries, and UI delivery status logs.
- [x] **Telegram-Style Bot API**: `POST /api/bot/sendMessage` & `GET /api/bot/getUpdates` with bot token authentication.
- [x] **Interactive OpenAPI 3.0 Documentation**: Live Swagger UI served at `/api/docs`.
- [x] **Modern 3-Pane Web UI**: Sleek Slack-like UI with dark/light mode toggle, message search, reaction picker, attachment viewer, and settings modal.
- [x] **Single Command Deployment**: `docker-compose up --build` with automatic PostgreSQL migrations and healthchecks for all containers.

---

## ⚡ Quickstart (Single Command)

To bring up the entire stack (PostgreSQL, Redis, NestJS Backend, React Frontend & Nginx):

```bash
# 1. Clone repo & navigate into directory
git clone https://github.com/bek-chat/bek-chat.git
cd bek-chat

# 2. Start all services using Docker Compose
docker-compose up --build
```

Access the application in your browser:
- 💬 **Web Client**: [http://localhost:80](http://localhost:80)
- 📖 **Swagger OpenAPI Docs**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- ⚙️ **Backend Direct Port**: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Local Manual Testing

### Demo Login
You can click **"Quick Demo Login"** on the sign-in modal, or register a new user. The first registered user automatically becomes a workspace **OWNER/ADMIN**.

### Test Incoming Webhook via `curl`
```bash
curl -X POST http://localhost:3000/api/webhooks/incoming/<YOUR_WEBHOOK_TOKEN> \
  -H "Content-Type: application/json" \
  -d '{
    "text": "🚀 *Deployment Succeeded*: Version `v1.0.0` is now live!",
    "username": "DeployBot",
    "icon_url": "https://api.dicebear.com/7.x/bottts/svg?seed=DeployBot"
  }'
```

---

## 📚 Detailed Documentation References

- 📖 **REST & WebSocket API Spec**: [docs/API.md](file:///Users/vireakbuth/Documents/Develop/bek-chat/docs/API.md)
- 📥 **Webhooks & Bot API Guide**: [docs/WEBHOOKS.md](file:///Users/vireakbuth/Documents/Develop/bek-chat/docs/WEBHOOKS.md)
- 🧪 **REST Client HTTP File**: [bek-chat.http](file:///Users/vireakbuth/Documents/Develop/bek-chat/bek-chat.http)
