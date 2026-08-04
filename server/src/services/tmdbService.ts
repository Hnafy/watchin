import { config } from '../config/index.js';
import { Media, Genre, Country, Language, Keyword, Person, CastMember, Director, Season } from '../db/models.js';
import { slugify, ensureGenre, ensureCountry, ensureLanguage } from '../db/utils.js';
import { AppError } from '../utils/AppError.js';

const tmdbFetch = async (path: string, params: Record<string, string> = {}): Promise<any> => {
  const url = new URL(`${config.tmdb.baseUrl}${path}`);
  url.searchParams.set('language', 'en-US');
  url.searchParams.set('api_key', config.tmdb.apiKey!);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) throw AppError.badRequest(`TMDB API error: ${res.statusText}`);
  return res.json();
};

function detectType(mediaType: string): 'MOVIE' | 'TV_SHOW' {
  if (mediaType === 'tv') return 'TV_SHOW';
  return 'MOVIE';
}

async function ensurePerson(name: string, profilePath: string | null) {
  let person = await Person.findOne({ name });
  if (!person) {
    person = await Person.create({ name, profilePath });
  }
  return person;
}

export const tmdbService = {
  async search(query: string, type?: string) {
    const mediaType = type === 'tv' ? 'tv' : type === 'movie' ? 'movie' : 'multi';
    const data = await tmdbFetch(`/search/${mediaType}`, { query });

    return (data.results || []).slice(0, 20).map((item: any) => ({
      tmdbId: item.id,
      type: mediaType === 'multi'
        ? detectType(item.media_type)
        : mediaType === 'tv' ? 'TV_SHOW' : 'MOVIE',
      title: item.title || item.name,
      originalTitle: item.original_title || item.original_name,
      overview: item.overview,
      releaseDate: item.release_date || item.first_air_date,
      posterPath: item.poster_path
        ? `${config.tmdb.imageBaseUrl}/w500${item.poster_path}`
        : null,
      backdropPath: item.backdrop_path
        ? `${config.tmdb.imageBaseUrl}/w1280${item.backdrop_path}`
        : null,
      voteAverage: item.vote_average,
      genreIds: item.genre_ids || [],
    }));
  },

  async getDetails(tmdbId: number, type: string) {
    const endpoint = type === 'TV_SHOW' ? 'tv' : 'movie';
    const data = await tmdbFetch(`/${endpoint}/${tmdbId}`, {
      append_to_response: 'credits,external_ids,videos,keywords',
    });
    return data;
  },

  async import(tmdbId: number, type: string) {
    const endpoint = type === 'TV_SHOW' ? 'tv' : 'movie';
    const data = await tmdbFetch(`/${endpoint}/${tmdbId}`, {
      append_to_response: 'credits,external_ids,videos,keywords',
    });

    const title = data.title || data.name;
    const slug = slugify(title) + '-' + tmdbId;

    const existing = await Media.findOne({ slug });

    if (existing) {
      throw AppError.badRequest('Media with this title already exists');
    }

    const genres = await Promise.all(
      (data.genres || []).map((g: any) => ensureGenre(g.name))
    );

    const countries = await Promise.all(
      (data.production_countries || []).map((c: any) => ensureCountry(c.iso_3166_1, c.name))
    );

    const languages = await Promise.all(
      (data.spoken_languages || []).map((l: any) => ensureLanguage(l.iso_639_1, l.english_name || l.name))
    );

    const trailerVideo = (data.videos?.results || [])
      .find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
    const trailerUrl = trailerVideo
      ? `https://www.youtube.com/embed/${trailerVideo.key}`
      : null;

    const media = await Media.create({
      title,
      slug,
      originalTitle: data.original_title || data.original_name,
      overview: data.overview,
      shortDescription: data.tagline || null,
      type,
      status: 'RELEASED',
      releaseDate: data.release_date ? new Date(data.release_date) : undefined,
      firstAirDate: data.first_air_date ? new Date(data.first_air_date) : undefined,
      lastAirDate: data.last_air_date ? new Date(data.last_air_date) : undefined,
      productionYear: data.release_date
        ? parseInt(data.release_date.slice(0, 4))
        : data.first_air_date
          ? parseInt(data.first_air_date.slice(0, 4))
          : undefined,
      runtime: data.runtime,
      numberOfSeasons: data.number_of_seasons,
      numberOfEpisodes: data.number_of_episodes,
      posterUrl: data.poster_path
        ? `${config.tmdb.imageBaseUrl}/w500${data.poster_path}`
        : null,
      backdropUrl: data.backdrop_path
        ? `${config.tmdb.imageBaseUrl}/w1280${data.backdrop_path}`
        : null,
      trailerUrl,
      imdbRating: data.vote_average,
      tmdbId,
      popularity: data.popularity,
      genres: genres.map((g) => g._id),
      countries: countries.map((c) => c._id),
      languages: languages.map((l) => l._id),
    });

    const castMembers = (data.credits?.cast || []).slice(0, 20);
    for (let i = 0; i < castMembers.length; i++) {
      const c = castMembers[i];
      const person = await ensurePerson(c.name, c.profile_path
        ? `${config.tmdb.imageBaseUrl}/w185${c.profile_path}`
        : null);
      await CastMember.updateOne(
        { mediaId: media._id, personId: person._id, character: c.character || '' },
        { $set: { order: i } },
        { upsert: true }
      );
    }

    const crew = data.credits?.crew || [];
    const directors = crew.filter((c: any) => c.job === 'Director');
    for (let i = 0; i < directors.length; i++) {
      const d = directors[i];
      const person = await ensurePerson(d.name, d.profile_path
        ? `${config.tmdb.imageBaseUrl}/w185${d.profile_path}`
        : null);
      await Director.updateOne(
        { mediaId: media._id, personId: person._id },
        { $set: { order: i } },
        { upsert: true }
      );
    }

    const keywordResults = data.keywords?.keywords || data.keywords?.results || [];
    const keywordIds: any[] = [];
    for (const kw of keywordResults.slice(0, 30)) {
      const slug = slugify(kw.name);
      const keyword = await Keyword.findOneAndUpdate(
        { slug },
        { $setOnInsert: { name: kw.name, slug } },
        { upsert: true, new: true }
      );
      keywordIds.push(keyword._id);
    }
    if (keywordIds.length) {
      await Media.updateOne({ _id: media._id }, { $addToSet: { keywords: { $each: keywordIds } } });
    }

    if (type === 'TV_SHOW' && data.seasons) {
      for (const s of data.seasons) {
        if (s.season_number === 0) continue;
        await Season.create({
          mediaId: media._id,
          seasonNumber: s.season_number,
          name: s.name || null,
          overview: s.overview || null,
          posterUrl: s.poster_path
            ? `${config.tmdb.imageBaseUrl}/w500${s.poster_path}`
            : null,
          airDate: s.air_date ? new Date(s.air_date) : null,
          episodeCount: s.episode_count || 0,
        });
      }
    }

    return media;
  },
};
