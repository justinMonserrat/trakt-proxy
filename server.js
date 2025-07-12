const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Required for server-side fetch
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables
const TRAKT_USERNAME = process.env.TRAKT_USERNAME;
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

app.use(cors());

// Route: GET /api/recent
app.get('/api/recent', async (req, res) => {
  try {
    console.log('📡 Fetching from Trakt...');

    const traktRes = await fetch(`https://api.trakt.tv/users/${TRAKT_USERNAME}/history/movies?limit=4`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': TRAKT_CLIENT_ID
      }
    });

    const traktText = await traktRes.text();

    if (!traktRes.ok) {
      console.error('❌ Trakt API error:', traktText);
      return res.status(traktRes.status).json({ error: 'Trakt API error', details: traktText });
    }

    const traktData = JSON.parse(traktText);
    console.log('✅ Trakt data received');

    // Enrich with TMDb posters
    const enrichedMovies = await Promise.all(
      traktData.map(async ({ movie }) => {
        const { title, year, ids } = movie;
        let poster = '';

        try {
          const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${ids.tmdb}?api_key=${TMDB_API_KEY}`);
          const tmdbData = await tmdbRes.json();

          if (!tmdbRes.ok) {
            console.warn(`⚠️ TMDb error for "${title}":`, tmdbData);
          }

          if (tmdbData.poster_path) {
            poster = `https://image.tmdb.org/t/p/w300_and_h450_bestv2${tmdbData.poster_path}`;
          }
        } catch (err) {
          console.warn(`⚠️ TMDb fetch failed for "${title}":`, err.message);
        }

        return { title, year, poster };
      })
    );

    console.log('🎬 Final movie list:', enrichedMovies);
    res.json(enrichedMovies);
  } catch (error) {
    console.error('🔥 Server error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Trakt data' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
