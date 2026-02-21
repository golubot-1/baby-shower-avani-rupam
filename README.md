# 🎊 Avani & Rupam's Baby Shower — Invitation Suite

A cinematic movie-poster style invitation website + WhatsApp RSVP bot.

---

## 📁 Files

| File | Purpose |
|------|---------|
| `index.html` | The invitation website (cinematic dark theme) |
| `server.js` | Express backend — serves site + handles RSVPs |
| `whatsapp-bot.js` | Interactive WhatsApp RSVP bot (Twilio) |
| `send-invites.js` | Bulk WhatsApp invite sender |
| `guest-list.json` | Your guest phone numbers |
| `rsvps.json` | Auto-created — stores all RSVPs |
| `bot-state.json` | Auto-created — WhatsApp bot conversation state |

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd baby-shower
npm install
```

### 2. Start the invitation website
```bash
node server.js
```
Open: http://localhost:3333

### 3. View RSVPs
```
http://localhost:3333/api/rsvps?key=babyshower2026
```

---

## 📱 WhatsApp Bot Setup (Twilio)

### Step 1: Get a Twilio account
- Sign up free at https://twilio.com
- Go to **Messaging → Try it out → Send a WhatsApp message**
- Note your **Account SID** and **Auth Token**

### Step 2: Join the sandbox
- Send `join <your-sandbox-word>` to **+1 (415) 523-8886** on WhatsApp

### Step 3: Expose localhost with ngrok
```bash
npx ngrok http 3334
# Copy the https URL it gives you
```

### Step 4: Set webhook in Twilio console
- Go to your WhatsApp Sandbox settings
- Set "When a message comes in" webhook to: `https://your-ngrok-url/whatsapp`

### Step 5: Start the bot
```bash
TWILIO_ACCOUNT_SID=xxx TWILIO_AUTH_TOKEN=yyy node whatsapp-bot.js
```

### Step 6: Test it!
Send any message to your Twilio sandbox number on WhatsApp.

---

## 📨 Send Bulk Invites

1. Fill in `guest-list.json` with real phone numbers
2. Run:
```bash
TWILIO_ACCOUNT_SID=xxx TWILIO_AUTH_TOKEN=yyy node send-invites.js
```

---

## 🔐 Admin

- View website RSVPs: `GET /api/rsvps?key=babyshower2026`
- View bot RSVPs: `GET http://localhost:3334/bot-rsvps?key=babyshower2026`

---

## 💡 Hosting the Website (optional)

To share the invite link with guests, deploy to:
- **Railway** — free tier, dead simple: https://railway.app
- **Render** — also free: https://render.com
- **Vercel** — if you separate frontend/backend

Or just share your local IP on your home network.

---

*Built with 💕 for Avani & Rupam's Baby Shower 2026*
