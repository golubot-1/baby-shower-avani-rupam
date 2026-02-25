# 🎊 Baby Shower Project Rules

### 🛠 Tech stack
- **Backend:** Node.js (Express)
- **Frontend:** HTML5 / CSS3 / GSAP (Cinematic Noir Theme)
- **Database:** Supabase (Table: `rsvps`)
- **Status:** Local-Only UI Dev Mode (Local changes not pushed to Vercel/GitHub)
- **Database:** Supabase (Table: `rsvps`)
- **Hosting:** Vercel (Production - currently on older version)

### 📜 Development Rules
1. **Local First:** Always run and verify on `localhost:3333`.
2. **Explicit Push Only:** Do NOT push to GitHub or Vercel unless Raju explicitly says "Push" or "Commit and Push".
3. **Current Mode:** Local-only development. New animations and cinematic images added to `index.html` are NOT pushed to Vercel until approved by Raju.
3. **UI Preservation:** The "Cinematic / A Universe Production" theme is the base.
4. **Data Integrity:** All RSVP data must live in Supabase. Do not revert to local `rsvps.json` storage.
5. **Admin Security:** The Admin Panel must remain at `/admin` and use the persistent key `babyshower2026`.
6. **Bot Protection:** Basic validation on `/api/rsvp` endpoint is enabled.

### 🔐 Admin Info
- **URL:** `https://baby-shower-avani-rupam.vercel.app/admin`
- **Access Key:** `babyshower2026`

### 🏗 Database Schema (Supabase)
```sql
create table rsvps (
  id uuid default gen_random_uuid() primary key,
  name text, 
  attending text, 
  guests int default 1,
  prediction text, 
  message text, 
  timestamp timestamptz default now()
);
```
