import { User, Genre, Country, Language, Media, TrendingMedia, Person, CastMember } from './db/models.js';
import { connectDB, disconnectDB } from './db/index.js';

async function main() {
  console.log('Seeding database...');

  // Create genres
  const genreNames = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'];
  const genres = await Promise.all(
    genreNames.map((name) =>
      Genre.updateOne(
        { slug: name.toLowerCase().replace(/\s+/g, '-') },
        { $setOnInsert: { name, slug: name.toLowerCase().replace(/\s+/g, '-') } },
        { upsert: true }
      ).then(() => Genre.findOne({ name }))
    )
  );
  console.log(`Created ${genres.length} genres`);

  // Create countries
  const countryData = [
    { name: 'United States', code: 'US' },
    { name: 'United Kingdom', code: 'GB' },
    { name: 'Canada', code: 'CA' },
    { name: 'France', code: 'FR' },
    { name: 'Germany', code: 'DE' },
    { name: 'Japan', code: 'JP' },
    { name: 'South Korea', code: 'KR' },
    { name: 'India', code: 'IN' },
  ];
  const countries = await Promise.all(
    countryData.map((c) =>
      Country.updateOne(
        { code: c.code },
        { $setOnInsert: c },
        { upsert: true }
      ).then(() => Country.findOne({ code: c.code }))
    )
  );
  console.log(`Created ${countries.length} countries`);

  // Create languages
  const langData = [
    { name: 'English', code: 'en' },
    { name: 'Spanish', code: 'es' },
    { name: 'French', code: 'fr' },
    { name: 'Japanese', code: 'ja' },
    { name: 'Korean', code: 'ko' },
    { name: 'Hindi', code: 'hi' },
    { name: 'German', code: 'de' },
  ];
  const languages = await Promise.all(
    langData.map((l) =>
      Language.updateOne(
        { code: l.code },
        { $setOnInsert: l },
        { upsert: true }
      ).then(() => Language.findOne({ code: l.code }))
    )
  );
  console.log(`Created ${languages.length} languages`);

  const genreByName = (name: string) => genres.find((g) => g && g.name === name)!._id;
  const countryByCode = (code: string) => countries.find((c) => c && c.code === code)!._id;
  const langByCode = (code: string) => languages.find((l) => l && l.code === code)!._id;

  // Create sample media
  const sampleMedia = [
    {
      title: 'The Dark Knight',
      slug: 'the-dark-knight',
      type: 'MOVIE',
      status: 'RELEASED',
      overview: 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.',
      releaseDate: new Date('2008-07-18'),
      runtime: 152,
      imdbRating: 9.0,
      popularity: 100,
      viewCount: 1500,
      posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/gbMYMGE7Hjpq1EcH3fzDLLgQQwi.jpg',
      genres: ['Action', 'Crime', 'Drama'],
      countries: ['US'],
      languages: ['en'],
    },
    {
      title: 'Inception',
      slug: 'inception',
      type: 'MOVIE',
      status: 'RELEASED',
      overview: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
      releaseDate: new Date('2010-07-16'),
      runtime: 148,
      imdbRating: 8.8,
      popularity: 95,
      viewCount: 1200,
      posterUrl: 'https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
      genres: ['Action', 'Sci-Fi', 'Thriller'],
      countries: ['US', 'GB'],
      languages: ['en'],
    },
    {
      title: 'Breaking Bad',
      slug: 'breaking-bad',
      type: 'TV_SHOW',
      status: 'RELEASED',
      overview: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing methamphetamine.',
      firstAirDate: new Date('2008-01-20'),
      lastAirDate: new Date('2013-09-29'),
      runtime: 49,
      numberOfSeasons: 5,
      numberOfEpisodes: 62,
      imdbRating: 9.5,
      popularity: 110,
      viewCount: 2000,
      posterUrl: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
      genres: ['Drama', 'Crime', 'Thriller'],
      countries: ['US'],
      languages: ['en'],
    },
    {
      title: 'Spirited Away',
      slug: 'spirited-away',
      type: 'MOVIE',
      status: 'RELEASED',
      overview: 'During her family\'s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods and witches.',
      releaseDate: new Date('2001-07-20'),
      runtime: 125,
      imdbRating: 8.6,
      popularity: 85,
      viewCount: 900,
      posterUrl: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg',
      genres: ['Animation', 'Adventure', 'Fantasy'],
      countries: ['JP'],
      languages: ['ja'],
    },
    {
      title: 'The Matrix',
      slug: 'the-matrix',
      type: 'MOVIE',
      status: 'RELEASED',
      overview: 'A computer programmer discovers that reality as he knows it is a simulation created by machines.',
      releaseDate: new Date('1999-03-31'),
      runtime: 136,
      imdbRating: 8.7,
      popularity: 90,
      viewCount: 1100,
      posterUrl: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg',
      genres: ['Action', 'Sci-Fi'],
      countries: ['US'],
      languages: ['en'],
    },
    {
      title: 'Stranger Things',
      slug: 'stranger-things',
      type: 'TV_SHOW',
      status: 'RELEASED',
      overview: 'When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces.',
      firstAirDate: new Date('2016-07-15'),
      runtime: 50,
      numberOfSeasons: 4,
      numberOfEpisodes: 34,
      imdbRating: 8.7,
      popularity: 105,
      viewCount: 1800,
      posterUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/56v2KjBlYjXQ3FkvCOrX7LkA1aI.jpg',
      genres: ['Sci-Fi', 'Horror', 'Drama'],
      countries: ['US'],
      languages: ['en'],
    },
    {
      title: 'Interstellar',
      slug: 'interstellar',
      type: 'MOVIE',
      status: 'RELEASED',
      overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
      releaseDate: new Date('2014-11-07'),
      runtime: 169,
      imdbRating: 8.6,
      popularity: 92,
      viewCount: 1300,
      posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK1Dho0Xx.jpg',
      genres: ['Adventure', 'Drama', 'Sci-Fi'],
      countries: ['US', 'GB'],
      languages: ['en'],
    },
    {
      title: 'The Witcher',
      slug: 'the-witcher',
      type: 'TV_SHOW',
      status: 'ONGOING',
      overview: 'Geralt of Rivia, a solitary monster hunter, struggles to find his place in a world where people often prove more wicked than beasts.',
      firstAirDate: new Date('2019-12-20'),
      runtime: 60,
      numberOfSeasons: 3,
      numberOfEpisodes: 24,
      imdbRating: 8.2,
      popularity: 98,
      viewCount: 1600,
      posterUrl: 'https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/jBJWaqoSCiARWtfV0GlqHrcdiJq.jpg',
      genres: ['Action', 'Adventure', 'Fantasy'],
      countries: ['US'],
      languages: ['en'],
    },
    {
      title: 'Parasite',
      slug: 'parasite',
      type: 'MOVIE',
      status: 'RELEASED',
      overview: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
      releaseDate: new Date('2019-05-30'),
      runtime: 132,
      imdbRating: 8.9,
      popularity: 88,
      viewCount: 1000,
      posterUrl: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/TU9728RnVeVY5JnIF3zp41JjWW.jpg',
      genres: ['Comedy', 'Thriller', 'Drama'],
      countries: ['KR'],
      languages: ['ko'],
    },
    {
      title: 'Dune',
      slug: 'dune',
      type: 'MOVIE',
      status: 'RELEASED',
      overview: 'Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe.',
      releaseDate: new Date('2021-10-22'),
      runtime: 155,
      imdbRating: 8.3,
      popularity: 97,
      viewCount: 1400,
      posterUrl: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg',
      genres: ['Sci-Fi', 'Adventure'],
      countries: ['US'],
      languages: ['en'],
    },
  ];

  for (const m of sampleMedia) {
    const existing = await Media.findOne({ slug: m.slug });
    if (existing) continue;

    const { genres, countries, languages, ...mediaData } = m as any;
    const media = await Media.create({
      ...mediaData,
      genres: genres.map((name: string) => genreByName(name)),
      countries: countries.map((code: string) => countryByCode(code)),
      languages: languages.map((code: string) => langByCode(code)),
    });
    console.log(`Created media: ${media.title}`);
  }

  // Create people (actors/directors) so cast search has data
  const personNames = [
    'Christian Bale', 'Heath Ledger', 'Gary Oldman', 'Aaron Eckhart',
    'Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy',
    'Bryan Cranston', 'Aaron Paul', 'Anna Gunn', 'Bob Odenkirk',
    'Rumi Hiiragi', 'Miyu Irino', 'Mari Natsuki',
    'Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss', 'Hugo Weaving',
    'Millie Bobby Brown', 'Finn Wolfhard', 'Winona Ryder', 'David Harbour',
    'Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine',
    'Henry Cavill', 'Freya Allan', 'Anya Chalotra',
    'Song Kang-ho', 'Cho Yeo-jeong', 'Lee Sun-kyun', 'Park So-dam',
    'Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Oscar Isaac',
    'Joaquin Phoenix', 'Margot Robbie', 'Robert Downey Jr.', 'Scarlett Johansson',
  ];
  const people = new Map<string, any>();
  for (const name of personNames) {
    let person = await Person.findOne({ name });
    if (!person) person = await Person.create({ name });
    people.set(name, person);
  }
  console.log(`Created ${personNames.length} people`);

  // Assign cast members to sample media
  const castAssignments: Record<string, Array<[string, string]>> = {
    'the-dark-knight': [['Christian Bale', 'Bruce Wayne'], ['Heath Ledger', 'The Joker'], ['Gary Oldman', 'James Gordon'], ['Aaron Eckhart', 'Harvey Dent']],
    'inception': [['Leonardo DiCaprio', 'Dom Cobb'], ['Joseph Gordon-Levitt', 'Arthur'], ['Elliot Page', 'Ariadne'], ['Tom Hardy', 'Eames']],
    'breaking-bad': [['Bryan Cranston', 'Walter White'], ['Aaron Paul', 'Jesse Pinkman'], ['Anna Gunn', 'Skyler White'], ['Bob Odenkirk', 'Saul Goodman']],
    'spirited-away': [['Rumi Hiiragi', 'Chihiro'], ['Miyu Irino', 'Haku'], ['Mari Natsuki', 'Yubaba']],
    'the-matrix': [['Keanu Reeves', 'Neo'], ['Laurence Fishburne', 'Morpheus'], ['Carrie-Anne Moss', 'Trinity'], ['Hugo Weaving', 'Agent Smith']],
    'stranger-things': [['Millie Bobby Brown', 'Eleven'], ['Finn Wolfhard', 'Mike Wheeler'], ['Winona Ryder', 'Joyce Byers'], ['David Harbour', 'Jim Hopper']],
    'interstellar': [['Matthew McConaughey', 'Cooper'], ['Anne Hathaway', 'Amelia Brand'], ['Jessica Chastain', 'Murph'], ['Michael Caine', 'Professor Brand']],
    'the-witcher': [['Henry Cavill', 'Geralt of Rivia'], ['Freya Allan', 'Ciri'], ['Anya Chalotra', 'Yennefer']],
    'parasite': [['Song Kang-ho', 'Ki-taek'], ['Cho Yeo-jeong', 'Yeon-kyo'], ['Lee Sun-kyun', 'Dong-ik'], ['Park So-dam', 'Ki-jung']],
    'dune': [['Timothée Chalamet', 'Paul Atreides'], ['Zendaya', 'Chani'], ['Rebecca Ferguson', 'Lady Jessica'], ['Oscar Isaac', 'Duke Leto']],
  };
  let castCreated = 0;
  for (const [slug, cast] of Object.entries(castAssignments)) {
    const media = await Media.findOne({ slug });
    if (!media) continue;
    for (let i = 0; i < cast.length; i++) {
      const [name, character] = cast[i];
      const person = people.get(name);
      if (!person) continue;
      const exists = await CastMember.findOne({ mediaId: media._id, personId: person._id });
      if (exists) continue;
      await CastMember.create({ mediaId: media._id, personId: person._id, character, order: i });
      castCreated++;
    }
  }
  console.log(`Created ${castCreated} cast members`);

  // Create trending entries for the hero carousel and trending row
  const trendingSlugs = ['the-dark-knight', 'inception', 'breaking-bad', 'stranger-things', 'interstellar', 'the-witcher', 'dune', 'parasite', 'spirited-away', 'the-matrix'];
  for (let i = 0; i < trendingSlugs.length; i++) {
    const media = await Media.findOne({ slug: trendingSlugs[i] });
    if (!media) continue;
    await TrendingMedia.updateOne(
      { period: 'week', rank: i + 1, date: new Date() },
      { $setOnInsert: { mediaId: media._id, period: 'week', rank: i + 1, score: 100 - i * 5 } },
      { upsert: true }
    );
  }
  console.log('Created trending entries');

  // Create admin user
  const bcrypt = (await import('bcryptjs')).default;
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  await User.updateOne(
    { email: 'admin@streaming.local' },
    { $setOnInsert: { email: 'admin@streaming.local', username: 'admin', passwordHash: adminPasswordHash, role: 'ADMIN', emailVerified: true } },
    { upsert: true }
  );
  console.log('Created admin user (admin@streaming.local / admin123)');

  // Create demo user
  const demoPasswordHash = await bcrypt.hash('demo1234', 12);
  await User.updateOne(
    { email: 'demo@streaming.local' },
    { $setOnInsert: { email: 'demo@streaming.local', username: 'demouser', passwordHash: demoPasswordHash, role: 'USER', emailVerified: true } },
    { upsert: true }
  );
  console.log('Created demo user (demo@streaming.local / demo1234)');

  console.log('Seeding complete!');
}

(async () => {
  try {
    await connectDB();
    await main();
    await disconnectDB();
    process.exit(0);
  } catch (e) {
    console.error('Seeding failed:', e);
    process.exit(1);
  }
})();
