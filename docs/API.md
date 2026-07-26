# Bek-Chat REST & WebSocket API Documentation

Bek-Chat provides a complete REST API with auto-generated OpenAPI 3.0 documentation (served live at `/api/docs` via Swagger UI) and a real-time Socket.IO WebSocket interface.

---

## 🔑 Authentication

Bek-Chat supports three authentication methods:

1. **JWT Bearer Token**:
   - Passed in standard header: `Authorization: Bearer <access_token>`
   - Obtained via `POST /api/auth/register` or `POST /api/auth/login`.

2. **Personal API Tokens**:
   - Generated via `POST /api/auth/tokens`.
   - Passed in header: `X-API-Token: bek_xxxxxxxx...` or `Authorization: Bearer bek_xxxxxxxx...`

3. **Bot API Tokens**:
   - Passed in header: `X-Bot-Token: bek_xxxxxxxx...`

---

## 📡 Endpoints Overview

### Auth & Tokens (`/api/auth`)
- `POST /api/auth/register` — Register a new account
- `POST /api/auth/login` — Log in with email & password
- `POST /api/auth/tokens` — Create personal API token / bot key
- `GET /api/auth/tokens` — List API tokens
- `DELETE /api/auth/tokens/:id` — Revoke API token

### Users & Profiles (`/api/users`)
- `GET /api/users/me` — Get current user profile
- `PUT /api/users/me` — Update profile username & avatar
- `PUT /api/users/status` — Update online status (`ONLINE`, `AWAY`, `OFFLINE`)
- `GET /api/users` — List workspace users

### Workspaces (`/api/workspaces`)
- `POST /api/workspaces` — Create new workspace
- `GET /api/workspaces` — List workspaces joined by user
- `GET /api/workspaces/:id` — Get workspace details & channels
- `POST /api/workspaces/:id/members` — Add user to workspace

### Channels & Direct Messages (`/api/channels`)
- `POST /api/channels` — Create channel (public/private)
- `POST /api/channels/dm` — Get or create 1:1 Direct Message channel
- `GET /api/channels?workspaceId=:id` — List accessible channels
- `GET /api/channels/:id` — Get channel details & members
- `POST /api/channels/:id/join` — Self-join a public channel
- `POST /api/channels/:id/read` — Update channel read receipts

### Messages & Reactions (`/api/messages`)
- `POST /api/messages` — Send message / thread reply
- `GET /api/messages?channelId=:id&limit=50&cursor=:cursor` — Fetch channel history
- `GET /api/messages/search?workspaceId=:id&q=:query` — Search message text
- `GET /api/messages/thread/:parentId` — Get thread replies
- `PUT /api/messages/:id` — Edit message content
- `DELETE /api/messages/:id` — Delete message
- `POST /api/messages/:id/reactions` — Toggle emoji reaction (`👍`, `❤️`, etc.)

### Webhooks (`/api/webhooks`)
- `POST /api/webhooks/incoming/:token` — Incoming webhook receiver (Slack JSON format)
- `POST /api/webhooks/incoming` — Create incoming webhook token
- `GET /api/webhooks/incoming` — List incoming webhooks
- `POST /api/webhooks/incoming/:id/regenerate` — Regenerate token
- `DELETE /api/webhooks/incoming/:id` — Revoke incoming webhook
- `POST /api/webhooks/outgoing` — Register outgoing webhook listener
- `GET /api/webhooks/outgoing` — List outgoing webhooks
- `DELETE /api/webhooks/outgoing/:id` — Remove outgoing webhook listener
- `GET /api/webhooks/outgoing/:id/logs` — View delivery status logs
- `POST /api/webhooks/outgoing/:id/test` — Send test ping payload

### Bot API (`/api/bot`)
- `POST /api/bot/sendMessage` — Send message to channel via bot token
- `GET /api/bot/getUpdates` — Fetch updates via long polling

---

## ⚡ WebSocket Events (Socket.IO)

Connection namespace: `/`  
Handshake query or auth object: `{ token: "<access_token>" }`

### Client -> Server Events
| Event Name | Payload Shape | Description |
| :--- | :--- | :--- |
| `join_channel` | `{ channelId: string }` | Join room for real-time channel updates |
| `leave_channel` | `{ channelId: string }` | Leave channel room |
| `typing_start` | `{ channelId: string, username: string }` | Broadcast typing indicator |
| `typing_stop` | `{ channelId: string }` | Stop typing indicator |

### Server -> Client Events
| Event Name | Payload Shape | Description |
| :--- | :--- | :--- |
| `message:new` | `MessageObject` | Emitted when a new message is posted to channel |
| `message:update` | `MessageObject` | Emitted when a message is edited |
| `message:delete` | `{ channelId: string, messageId: string }` | Emitted when a message is deleted |
| `reaction:change` | `{ action: 'added'\|'removed', emoji: string, ... }` | Emitted when a reaction changes |
| `presence:change` | `{ userId: string, status: 'ONLINE'\|'OFFLINE'\|'AWAY' }` | Online presence change |
| `typing:start` | `{ channelId: string, userId: string, username: string }` | Someone started typing |
| `typing:stop` | `{ channelId: string, userId: string }` | Someone stopped typing |
