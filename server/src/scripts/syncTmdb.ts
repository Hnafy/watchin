import { connectDB, disconnectDB } from '../db/index.js';
import { tmdbService } from '../services/tmdbService.js';

const MOVIES = [
  'The Shawshank Redemption',
  'Pulp Fiction',
  'The Lord of the Rings: The Fellowship of the Ring',
  'The Godfather',
  'Spider-Man: Into the Spider-Verse',
  'Oppenheimer',
  'Everything Everywhere All at Once',
  'Whiplash',
  'Your Name',
  'La La Land',
];

const TV_SHOWS = [
  'Game of Thrones',
  'The Office (US)',
  'Friends',
  'The Mandalorian',
  'The Last of Us',
  'Severance',
  'Succession',
  'The Bear',
];

const ANIME = [
  'Fullmetal Alchemist: Brotherhood',
  'Jujutsu Kaisen',
  'Chainsaw Man',
  'Spy x Family',
  'Vinland Saga',
  'Hunter x Hunter',
  'Cowboy Bebop',
  'Neon Genesis Evangelion',
  'Steins;Gate',
  'Code Geass: Lelouch of the Rebellion',
  'Re:Zero - Starting Life in Another World',
  'Solo Leveling',
  'Frieren: Beyond Journey\'s End',
  'Kaiju No. 8',
  'Blue Lock',
  'One Piece',
  'Haikyu!!',
  'Berserk',
];

async function importTitle(title: string, type: 'MOVIE' | 'TV_SHOW' | 'ANIME') {
  const searchType = type === 'MOVIE' ? 'movie' : 'tv';
  const results = await tmdbService.search(title, searchType);
  const match = results[0];

  if (!match) {
    console.log(`  ✗ ${title}: no TMDB result`);
    return false;
  }

  try {
    await tmdbService.import(match.tmdbId, type);
    console.log(`  ✓ imported "${match.title}" (${match.tmdbId}) as ${type}`);
    return true;
  } catch (error: any) {
    console.log(`  - ${title}: ${error.message || 'skipped'}`);
    return false;
  }
}

async function main() {
  console.log('Syncing real content from TMDB...');

  let total = 0;

  console.log('\n[Movies]');
  for (const title of MOVIES) {
    if (await importTitle(title, 'MOVIE')) total += 1;
  }

  console.log('\n[TV Shows]');
  for (const title of TV_SHOWS) {
    if (await importTitle(title, 'TV_SHOW')) total += 1;
  }

  console.log('\n[Anime]');
  for (const title of ANIME) {
    if (await importTitle(title, 'ANIME')) total += 1;
  }

  console.log(`\nDone. Imported ${total} new titles.`);
}

(async () => {
  try {
    await connectDB();
    await main();
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('TMDB sync failed:', error);
    process.exit(1);
  }
})();
