const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const TRAKT_USERNAME = 'stunji';
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

app.use(cors());

app.get('/api/recent', async (req, res) => {
  try {
    const traktRes = await fetch(`https://api.trakt.tv/users/${TRAKT_USERNAME}/history/movies?limit=4`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': TRAKT_CLIENT_ID
      }
    });

    const traktData = await traktRes.json();

    if (!traktRes.ok) {
      console.error('Trakt error:', traktData);
      return res.status(traktRes.status).json({ error: traktData });
    }

    // Fetch poster URLs from TMDb for each movie
    const enrichedMovies = await Promise.all(
      traktData.map(async entry => {
        const { title, year, ids } = entry.movie;
        let poster = '';

        try {
          const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${ids.tmdb}?api_key=${TMDB_API_KEY}`);
          const tmdbData = await tmdbRes.json();
          if (tmdbData.poster_path) {
            poster = `https://image.tmdb.org/t/p/w300_and_h450_bestv2${tmdbData.poster_path}`;
          }
        } catch (err) {
          console.warn(`Poster fetch failed for ${title}`);
        }

        return { title, year, poster };
      })
    );

    res.json(enrichedMovies);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Failed to fetch Trakt data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
