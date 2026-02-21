/**
 * WhatsApp RSVP Bot — Avani & Rupam's Baby Shower
 *
 * Supports TWO modes:
 *   1. Twilio WhatsApp Sandbox (easiest to test)
 *   2. Meta WhatsApp Business API (production)
 *
 * Setup Instructions:
 * ─────────────────────────────────────────
 * TWILIO SANDBOX (quickest):
 *   1. Sign up at twilio.com
 *   2. Go to Messaging > Try it out > Send a WhatsApp message
 *   3. Join the sandbox (send "join <word>" to +1 415 523 8886)
 *   4. Set webhook URL in Twilio console to: https://your-ngrok-url/whatsapp
 *   5. Fill TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER below
 *   6. Run: npx ngrok http 3334  (to expose localhost)
 *   7. node whatsapp-bot.js
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

// ── CONFIG ──────────────────────────────────────────────────────────────
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'YOUR_ACCOUNT_SID';
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN  || 'YOUR_AUTH_TOKEN';
const TWILIO_WA_NUMBER   = process.env.TWILIO_WA_NUMBER   || 'whatsapp:+14155238886';
const PORT = 3334;
// ────────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const STATE_FILE = path.join(__dirname, 'bot-state.json');
const RSVP_FILE  = path.join(__dirname, 'rsvps.json');

const loadState = () => fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE)) : {};
const saveState = (s) => fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
const loadRsvps = () => fs.existsSync(RSVP_FILE) ? JSON.parse(fs.readFileSync(RSVP_FILE)) : [];
const saveRsvp  = (r) => { const rsvps = loadRsvps(); rsvps.push(r); fs.writeFileSync(RSVP_FILE, JSON.stringify(rsvps, null, 2)); };

const STEPS = {
  START:      'start',
  ATTENDING:  'attending',
  GUESTS:     'guests',
  PREDICTION: 'prediction',
  MESSAGE:    'message',
  DONE:       'done',
};

function getReply(from, incomingMsg) {
  const state = loadState();
  const user  = state[from] || { step: STEPS.START, data: {} };
  const msg   = incomingMsg.trim().toLowerCase();
  let reply   = '';

  if (msg === 'reset' || msg === 'start') {
    state[from] = { step: STEPS.START, data: {} };
    saveState(state);
  }

  switch (user.step) {

    case STEPS.START:
    case STEPS.ATTENDING:
      reply = `🎊 *You're Invited!*\n\nAvani & Rupam's Baby Shower\n📅 Sunday, April 26, 2026\n⏰ 11:00 AM – 2:30 PM\n📍 Nuvo Event Space, Brampton\n\nWill you be joining us? Reply:\n👉 *YES* | *NO* | *MAYBE*`;
      user.step = STEPS.ATTENDING;
      break;

    case 'awaiting_attending':
      if (['yes','y','yeah','yep','absolutely'].includes(msg)) {
        user.data.attending = 'yes';
        reply = `Amazing! 🎉 So thrilled you'll be there!\n\nHow many guests will you be bringing?\n👉 Reply with a number: *1*, *2*, *3*, *4+*`;
        user.step = STEPS.GUESTS;
      } else if (['no','n','nope','cant','can\'t'].includes(msg)) {
        user.data.attending = 'no';
        reply = `😢 We'll miss you so much! Sending you all the love. 💕\n\nIf anything changes, just message us again!\n\nWith love,\nAvani & Rupam 💕`;
        user.step = STEPS.DONE;
        saveRsvp({ from, ...user.data, timestamp: new Date().toISOString() });
      } else if (['maybe','perhaps'].includes(msg)) {
        user.data.attending = 'maybe';
        reply = `🤔 We understand! We hope you can make it.\n\nJust so we can plan — roughly how many in your party?\n👉 Reply: *1*, *2*, *3*, *4+*`;
        user.step = STEPS.GUESTS;
      } else {
        reply = `Please reply *YES*, *NO*, or *MAYBE* 😊`;
      }
      break;

    case STEPS.GUESTS:
      user.data.guests = incomingMsg.trim();
      reply = `Perfect! 🥳\n\nNow the BIG question…\nWhat's your *Gender Reveal* prediction?\n\n💗 Reply *GIRL* for Tiny Boss Lady\n💙 Reply *BOY* for Little Gentleman\n🎊 Reply *SURPRISE* to keep us guessing!`;
      user.step = STEPS.PREDICTION;
      break;

    case STEPS.PREDICTION:
      if (['girl','💗','pink'].includes(msg)) {
        user.data.prediction = 'girl';
        reply = `💗 Team Boss Lady! Love the confidence!\n\nAny parenting tips or sweet messages for Avani & Rupam?\n(Or reply *SKIP* to finish up)`;
      } else if (['boy','💙','blue'].includes(msg)) {
        user.data.prediction = 'boy';
        reply = `💙 Team Little Gentleman! Classy choice!\n\nAny parenting tips or sweet messages for Avani & Rupam?\n(Or reply *SKIP* to finish up)`;
      } else if (['surprise','🎊','wait'].includes(msg)) {
        user.data.prediction = 'surprise';
        reply = `🎊 A true suspense-lover! We respect it!\n\nAny parenting tips or sweet messages for Avani & Rupam?\n(Or reply *SKIP* to finish up)`;
      } else {
        reply = `Please reply *GIRL*, *BOY*, or *SURPRISE* 🔮`;
        break;
      }
      user.step = STEPS.MESSAGE;
      break;

    case STEPS.MESSAGE:
      if (msg !== 'skip') user.data.message = incomingMsg.trim();
      saveRsvp({ from, ...user.data, timestamp: new Date().toISOString() });
      reply = `🎊 *You're officially on the list!*\n\nAvani & Rupam are SO excited to celebrate with you!\n\n📅 April 26, 2026 — 11:00 AM\n📍 Nuvo Event Space, Brampton\n👗 Traditional attire (colourful vibes encouraged!)\n\nSee you there! 💕\n\n_— Avani & Rupam_`;
      user.step = STEPS.DONE;
      break;

    case STEPS.DONE:
      reply = `You're already on the list! 🎉 We'll see you April 26th at Nuvo Event Space, Brampton! 💕\n\n_(Reply *RESET* to start over)_`;
      break;

    default:
      user.step = 'awaiting_attending';
      reply = `🎊 *You're Invited!*\n\nAvani & Rupam's Baby Shower\n📅 Sunday, April 26, 2026\n⏰ 11:00 AM – 2:30 PM\n📍 Nuvo Event Space, Brampton\n\nWill you be joining us? Reply:\n👉 *YES* | *NO* | *MAYBE*`;
  }

  // Advance step machine
  if (user.step === STEPS.ATTENDING) user.step = 'awaiting_attending';
  if (user.step === STEPS.GUESTS) user.step = STEPS.GUESTS;

  state[from] = user;
  saveState(state);
  return reply;
}

// ── TWILIO WEBHOOK ───────────────────────────────────────────────────────
app.post('/whatsapp', (req, res) => {
  const from = req.body.From || '';
  const body = req.body.Body || '';

  console.log(`[WhatsApp] From: ${from} | Msg: ${body}`);
  const reply = getReply(from, body);

  // Twilio TwiML response
  res.set('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${reply.replace(/\*/g, '').replace(/&/g,'&amp;')}</Message>
</Response>`);
});

// ── ADMIN: VIEW ALL RSVPs ────────────────────────────────────────────────
app.get('/bot-rsvps', (req, res) => {
  if (req.query.key !== 'babyshower2026') return res.status(401).json({ error: 'Unauthorized' });
  const rsvps = loadRsvps();
  res.json({ count: rsvps.length, rsvps });
});

app.get('/', (req, res) => res.send('🎊 Baby Shower WhatsApp Bot is running!'));

app.listen(PORT, () => {
  console.log(`\n🤖 WhatsApp RSVP Bot running on port ${PORT}`);
  console.log(`📌 Webhook URL: http://localhost:${PORT}/whatsapp`);
  console.log(`📊 View RSVPs: http://localhost:${PORT}/bot-rsvps?key=babyshower2026`);
  console.log(`\n💡 Expose with: npx ngrok http ${PORT}\n`);
});
