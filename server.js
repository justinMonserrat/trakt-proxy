const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Env variables
const TRAKT_USERNAME = process.env.TRAKT_USERNAME;
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

app.use(cors());

// GET /api/recent - Fetch recently watched movies
app.get('/api/recent', async (req, res) => {
  try {
    // Fetch history from Trakt
    const traktRes = await fetch(`https://api.trakt.tv/users/${TRAKT_USERNAME}/history/movies?limit=4`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': TRAKT_CLIENT_ID
      }
    });

    const traktData = await traktRes.json();

    if (!traktRes.ok) {
      console.error('❌ Trakt API Error:', traktData);
      return res.status(traktRes.status).json({ error: traktData });
    }

    // Enrich with poster data from TMDb
    const enrichedMovies = await Promise.all(
      traktData.map(async ({ movie }) => {
        const { title, year, ids } = movie;
        let poster = '';

        try {
          const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${ids.tmdb}?api_key=${TMDB_API_KEY}`);
          const tmdbData = await tmdbRes.json();
          if (tmdbData.poster_path) {
            poster = `https://image.tmdb.org/t/p/w300_and_h450_bestv2${tmdbData.poster_path}`;
          }
        } catch (err) {
          console.warn(`⚠️ Failed to fetch poster for "${title}"`);
        }

        return { title, year, poster };
      })
    );

    res.json(enrichedMovies);
  } catch (error) {
    console.error('❌ Server Error:', error);
    res.status(500).json({ error: 'Failed to fetch Trakt data' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
