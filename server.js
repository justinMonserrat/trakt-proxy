const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const TRAKT_USERNAME = process.env.TRAKT_USERNAME;
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

app.use(cors());

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

    if (!traktRes.ok) {
      const errorText = await traktRes.text();
      console.error('❌ Trakt error:', errorText);
      return res.status(traktRes.status).json({ error: errorText });
    }

    const traktData = await traktRes.json();
    console.log('✅ Trakt data received.');

    const enrichedMovies = await Promise.all(
      traktData.map(async ({ movie }) => {
        const { title, year, ids } = movie;
        let poster = '';
        let rating = null;

        // Get TMDb poster
        try {
          const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${ids.tmdb}?api_key=${TMDB_API_KEY}`);
          const tmdbData = await tmdbRes.json();
          if (tmdbData.poster_path) {
            poster = `https://image.tmdb.org/t/p/w300_and_h450_bestv2${tmdbData.poster_path}`;
          }
        } catch (err) {
          console.warn(`⚠️ TMDb fetch failed for "${title}":`, err.message);
        }

        // Get Trakt rating
        try {
          const ratingRes = await fetch(`https://api.trakt.tv/users/${TRAKT_USERNAME}/ratings/movies/${ids.slug}`, {
            headers: {
              'Content-Type': 'application/json',
              'trakt-api-version': '2',
              'trakt-api-key': TRAKT_CLIENT_ID
            }
          });
          const ratingData = await ratingRes.json();
          if (Array.isArray(ratingData) && ratingData.length > 0) {
            rating = ratingData[0].rating;
          }
        } catch (err) {
          console.warn(`⚠️ Rating fetch failed for "${title}":`, err.message);
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
