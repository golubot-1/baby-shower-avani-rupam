/**
 * send-invites.js
 * Blast the invitation to all guests via WhatsApp (Twilio)
 * Usage: node send-invites.js
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'YOUR_ACCOUNT_SID';
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN  || 'YOUR_AUTH_TOKEN';
const TWILIO_WA_NUMBER   = process.env.TWILIO_WA_NUMBER   || 'whatsapp:+14155238886';

const fs = require('fs');
const https = require('https');

const guests = JSON.parse(fs.readFileSync('./guest-list.json'));

const MESSAGE = `🎊 *You're Invited!*

Avani & Rupam are about to trade sleep for diaper duty 😅 — and they need YOUR love, laughter, and maybe a few parenting tips!

🎬 *The Scene:* Simant Ceremony + Games + The BIG Gender Reveal!
💗 Tiny Boss Lady? 💙 Little Gentleman? Place your bets!

📅 *Sunday, April 26, 2026*
⏰ 11:00 AM – 2:30 PM
📍 Nuvo Event Space, 7920 Mississauga Rd, Brampton
👗 Traditional attire (colourful vibes encouraged!)
🍽 Lunch to follow

Reply to this message to RSVP! 💕
_Kindly respond by March 30, 2026_

With love,
Avani & Rupam 💕`;

async function sendMessage(to) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      From: TWILIO_WA_NUMBER,
      To:   `whatsapp:${to}`,
      Body: MESSAGE,
    }).toString();

    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const options = {
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log(`\n📨 Sending invites to ${guests.length} guests...\n`);
  for (const guest of guests) {
    try {
      const result = await sendMessage(guest.phone);
      console.log(`✅ Sent to ${guest.name} (${guest.phone}) — SID: ${result.sid}`);
    } catch (err) {
      console.error(`❌ Failed for ${guest.name}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 500)); // rate limit
  }
  console.log('\n🎊 All invites sent!\n');
})();
