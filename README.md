# Spotify Rater

Rate Spotify tracks on a 0.00–10.00 scale, with live playback, analytics histograms, album mass-rating, and artist discography browsing.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api) (OAuth + user library)
- [Supabase](https://supabase.com/) (Postgres for ratings & profiles)

## Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/lunargirl/spotify-rater.git
   cd spotify-rater
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` and fill in your Spotify and Supabase credentials.

3. **Database**

   Run the SQL migrations in `supabase/migrations/` in order in your Supabase SQL editor.

4. **Spotify app**

   In the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), add this redirect URI:

   `http://127.0.0.1:3000/api/auth/callback`

5. **Run locally**

   ```bash
   npm run dev
   ```

   Open **http://127.0.0.1:3000** (not `localhost`) so session cookies and OAuth stay consistent.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Development server       |
| `npm run build`| Production build         |
| `npm run start`| Production server        |
| `npm run lint` | ESLint                   |

## License

MIT
