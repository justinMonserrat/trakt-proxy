const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const TRAKT_USERNAME = process.env.TRAKT_USERNAME;
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

app.use(cors());

app.get('/api/recent', async (req, res) => {
  try {
    console.log('📡 Fetching recent history from Trakt...');

    const historyRes = await fetch(`https://api.trakt.tv/users/${TRAKT_USERNAME}/history/movies?limit=4`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': TRAKT_CLIENT_ID
      }
    });

    if (!historyRes.ok) {
      const errorText = await historyRes.text();
      console.error('❌ Trakt history error:', errorText);
      return res.status(historyRes.status).json({ error: errorText });
    }

    const historyData = await historyRes.json();
    const traktIds = historyData.map(item => item.movie.ids.trakt);

    // Fetch all personal movie ratings
    console.log('📡 Fetching personal ratings from Trakt...');
    const ratingsRes = await fetch(`https://api.trakt.tv/users/${TRAKT_USERNAME}/ratings/movies`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': TRAKT_CLIENT_ID
      }
    });

    const ratingsData = await ratingsRes.json();
    const ratingsMap = new Map();
    ratingsData.forEach(item => {
      ratingsMap.set(item.movie.ids.trakt, item.rating);
    });

    // Enrich each movie
    const enrichedMovies = await Promise.all(
      historyData.map(async ({ movie }) => {
        const { title, year, ids } = movie;
        let poster = '';
        let rating = ratingsMap.get(ids.trakt) || null;

        try {
          const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${ids.tmdb}?api_key=${TMDB_API_KEY}`);
          const tmdbData = await tmdbRes.json();
          if (tmdbData.poster_path) {
            poster = `https://image.tmdb.org/t/p/w300_and_h450_bestv2${tmdbData.poster_path}`;
          }
        } catch (err) {
          console.warn(`⚠️ TMDb fetch failed for "${title}":`, err.message);
        }

        return { title, year, poster, rating };
      })
    );

    res.json(enrichedMovies);
  } catch (err) {
    console.error('🔥 Server error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Trakt data' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
