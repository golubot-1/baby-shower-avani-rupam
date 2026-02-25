const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const sgMail = require('@sendgrid/mail');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// SENDGRID CONFIG (Set this in your Vercel/Environment Variables)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// SUPABASE CONFIG
const supabaseUrl = 'https://lgcqmvrgpnfnyqvjqxab.supabase.co';
const supabaseKey = 'sb_publishable_WezuM1X4TcccJIKr4P9RyQ_mte-rjVe';
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.post('/api/rsvp', async (req, res) => {
  const { name, attending, email } = req.body;
  if (!name || !attending) {
      return res.status(400).json({ error: "Invalid data" });
  }
  try {
    const { error } = await supabase
      .from('rsvps')
      .insert([{ ...req.body, timestamp: new Date().toISOString() }]);
    
    if (error) throw error;

    // Send Confirmation Email if provided and API key exists
    if (email && process.env.SENDGRID_API_KEY) {
        const msg = {
            to: email,
            from: 'confirmations@yourdomain.com', // Change this to your SendGrid verified sender!
            templateId: process.env.SENDGRID_TEMPLATE_ID, // Optional: Use a template if you have one
            subject: "🎬 You're on the Guest List: Avani & Rupam's Baby Shower",
            html: `
              <div style="font-family: serif; max-width: 500px; margin: auto; border: 1px solid #af8f2c; padding: 40px; text-align: center; background-color: #fdfaf5;">
                <h1 style="font-family: 'Cinzel', serif; color: #1a1a1a; letter-spacing: 2px;">ADMIT ONE</h1>
                <p style="text-transform: uppercase; letter-spacing: 3px; font-size: 10px; color: #af8f2c;">A Universe Production</p>
                <hr style="border: 0; border-top: 1px dashed #ccc; margin: 30px 0;">
                <p style="font-style: italic; font-size: 18px;">Reservation Confirmed for</p>
                <h2 style="font-size: 24px; margin: 10px 0;">${name}</h2>
                <div style="text-align: left; background: #fff; padding: 20px; border: 1px solid #eee; margin: 20px 0;">
                    <p><strong>📍 VENUE:</strong> Nuvo Event Space</p>
                    <p style="margin-left: 25px; opacity: 0.8;">7920 Mississauga Rd, Brampton, ON</p>
                    <p style="margin-top: 15px;"><strong>⏰ TIME:</strong> 11:00 AM · April 26, 2026</p>
                </div>
                <p style="font-size: 14px; margin-top: 30px;"><em>"See you on the set!"</em></p>
              </div>
            `
        };
        // We don't await so the user doesn't wait for the email to send
        sgMail.send(msg).catch(err => console.error("SendGrid Error:", err.message));
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save RSVP' });
  }
});

app.get('/api/rsvps', async (req, res) => {
  if (req.query.key !== 'babyshower2026') return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { data, error } = await supabase.from('rsvps').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    res.json({ count: data.length, rsvps: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch RSVPs' });
  }
});

app.delete('/api/rsvps/:id', async (req, res) => {
    if (req.query.key !== 'babyshower2026') return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    try {
        const { error } = await supabase.from('rsvps').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: "Entry deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Export for Vercel
module.exports = app;

// Only listen if running directly
if (require.main === module) {
    const PORT = process.env.PORT || 3333;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🎊 Baby Shower site running on port ${PORT}`);
    });
}
