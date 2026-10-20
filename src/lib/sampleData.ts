import type { SiteLink } from "../types/api";
import type { MatchesResponse } from "../types/matches";
import type { ComparedMatchesResponse } from "../types/comparison";

/**
 * Development fixtures used only when VITE_USE_SAMPLE_DATA is "true".
 * Shapes mirror the API exactly so views behave identically against the backend.
 */

export const sampleMatches: MatchesResponse = {
  VIRUS_BET: [
    {
      _id: "sample-virus-football",
      site: "sample-site-virus",
      sport: "FOOTBALL",
      updatedAt: "2026-09-16T01:58:00.000Z",
      leagues: [
        {
          league: "Premier League",
          dates: [
            {
              date: "2026-09-18",
              matches: [
                { home: "Arsenal", away: "Chelsea", time: "20:00" },
                { home: "Liverpool", away: "Everton", time: "17:30" },
              ],
            },
            {
              date: "2026-09-19",
              matches: [{ home: "Manchester City", away: "Brighton", time: "19:00" }],
            },
          ],
        },
        {
          league: "LaLiga",
          dates: [
            {
              date: "2026-09-18",
              matches: [{ home: "Real Madrid", away: "Sevilla FC", time: "22:00" }],
            },
          ],
        },
      ],
    },
    {
      _id: "sample-virus-basketball",
      site: "sample-site-virus",
      sport: "BASKETBALL",
      updatedAt: "2026-09-16T01:58:00.000Z",
      leagues: [
        {
          league: "EuroLeague",
          dates: [
            {
              date: "2026-09-18",
              matches: [
                { home: "Fenerbahce Beko", away: "Real Madrid", time: "19:45" },
                { home: "Anadolu Efes", away: "Panathinaikos", time: "20:15" },
              ],
            },
          ],
        },
      ],
    },
    {
      _id: "sample-virus-tennis",
      site: "sample-site-virus",
      sport: "TENNIS",
      updatedAt: "2026-09-16T01:58:00.000Z",
      leagues: [
        {
          league: "ATP Tokyo",
          dates: [
            {
              date: "2026-09-19",
              matches: [{ home: "C. Alcaraz", away: "J. Sinner", time: "09:30" }],
            },
          ],
        },
      ],
    },
  ],
  MAVI_BET: [
    {
      _id: "sample-mavi-football",
      site: "sample-site-mavi",
      sport: "FOOTBALL",
      updatedAt: "2026-09-16T02:04:00.000Z",
      leagues: [
        {
          league: "Premier League",
          dates: [
            {
              date: "2026-09-18",
              matches: [
                { home: "Arsenal FC", away: "Chelsea FC", time: "20:00" },
                { home: "Liverpool FC", away: "Everton FC", time: "17:30" },
              ],
            },
          ],
        },
        {
          league: "La Liga",
          dates: [
            {
              date: "2026-09-18",
              matches: [{ home: "Real Madrid CF", away: "Sevilla", time: "21:45" }],
            },
          ],
        },
      ],
    },
    {
      _id: "sample-mavi-basketball",
      site: "sample-site-mavi",
      sport: "BASKETBALL",
      updatedAt: "2026-09-16T02:04:00.000Z",
      leagues: [
        {
          league: "EuroLeague",
          dates: [
            {
              date: "2026-09-18",
              matches: [
                { home: "Fenerbahce", away: "Real Madrid Baloncesto", time: "19:45" },
                { home: "Anadolu Efes Istanbul", away: "Panathinaikos BC", time: "20:15" },
              ],
            },
          ],
        },
      ],
    },
    {
      _id: "sample-mavi-volleyball",
      site: "sample-site-mavi",
      sport: "VOLLEYBALL",
      updatedAt: "2026-09-16T02:04:00.000Z",
      leagues: [
        {
          league: "CEV Champions League",
          dates: [
            {
              date: "2026-09-18",
              matches: [{ home: "Ziraat Bankkart", away: "Halkbank", time: "18:00" }],
            },
          ],
        },
      ],
    },
    {
      _id: "sample-mavi-tennis",
      site: "sample-site-mavi",
      sport: "TENNIS",
      updatedAt: "2026-09-16T02:04:00.000Z",
      leagues: [
        {
          league: "ATP Tokyo",
          dates: [
            {
              date: "2026-09-19",
              matches: [{ home: "Carlos Alcaraz", away: "Jannik Sinner", time: "10:00" }],
            },
          ],
        },
      ],
    },
  ],
  BETIST: [
    {
      _id: "sample-betist-football",
      site: "sample-site-betist",
      sport: "FOOTBALL",
      updatedAt: "2026-09-16T02:09:00.000Z",
      leagues: [
        {
          league: "Premier League",
          dates: [
            {
              date: "2026-09-18",
              matches: [
                { home: "Arsenal", away: "Chelsea", time: "20:30" },
                { home: "Liverpool", away: "Everton", time: "17:30" },
              ],
            },
          ],
        },
        {
          league: "LaLiga",
          dates: [
            {
              date: "2026-09-18",
              matches: [{ home: "Real Madrid", away: "Sevilla", time: "22:00" }],
            },
          ],
        },
      ],
    },
    {
      _id: "sample-betist-volleyball",
      site: "sample-site-betist",
      sport: "VOLLEYBALL",
      updatedAt: "2026-09-16T02:09:00.000Z",
      leagues: [
        {
          league: "CEV Champions League",
          dates: [
            {
              date: "2026-09-18",
              matches: [{ home: "Ziraat Bankkart Ankara", away: "Halkbank Ankara", time: "18:00" }],
            },
          ],
        },
      ],
    },
  ],
};

export const sampleComparedMatches: ComparedMatchesResponse = {
  olusturulma: "2026-09-16T02:12:22.017Z",
  siteler: ["virus_bet", "mavi_bet", "betist"],
  kaynaklar: {},
  ayarlar: {
    toleransDakika: 0,
    takimEsigi: 78,
    ligEsigi: 55,
    ligZorunlu: false,
    tarihToleransGun: 1,
  },
  ozet: {
    toplamMacGrubu: 3414,
    karsilastirilabilir: 1248,
    saatiFarkli: 152,
    saatiAyni: 1096,
  },
  farkliMaclar: {
    FUTBOL: {
      "Premier League": {
        "2026-09-18": [
          {
            sport: "FUTBOL",
            league: "Premier League",
            date: "2026-09-18",
            home: "Arsenal",
            away: "Chelsea",
            time: "20:00",
          },
        ],
      },
      LaLiga: {
        "2026-09-18": [
          {
            sport: "FUTBOL",
            league: "LaLiga",
            date: "2026-09-18",
            home: "Real Madrid",
            away: "Sevilla FC",
            time: "22:00",
          },
        ],
      },
      "2. Bundesliga": {
        "2026-09-18": [
          {
            sport: "FUTBOL",
            league: "2. Bundesliga",
            date: "2026-09-18",
            home: "Eintracht Braunschweig",
            away: "Holstein Kiel",
            saatler: { virus_bet: "23:30", mavi_bet: "00:30", betist: "00:30" },
            tarihler: {
              virus_bet: "2026-09-18",
              mavi_bet: "2026-09-19",
              betist: "2026-09-19",
            },
            tarihFarkli: true,
            maxFarkDakika: 60,
            sapanSiteler: [{ site: "virus_bet", farkDakika: -60 }],
            eksikSiteler: [],
            takimlar: {
              virus_bet: "Eintracht Braunschweig - Holstein Kiel",
              mavi_bet: "Eintracht Braunschweig - Holstein Kiel",
              betist: "E. Braunschweig - Holstein Kiel",
            },
          },
        ],
      },
    },
    TENIS: {
      "ATP Tokyo": {
        "2026-09-19": [
          {
            sport: "TENIS",
            league: "ATP Tokyo",
            date: "2026-09-19",
            home: "C. Alcaraz",
            away: "J. Sinner",
            time: "09:30",
          },
        ],
      },
    },
  },
  dusukBenzerlik: {
    ayarlar: { otomatikEsik: 78, altSinir: 30, maksKayit: 1500, algoritma: "similarityRatio" },
    toplam: 3,
    kayitlar: [
      {
        sport: "FUTBOL",
        takimA: "Colombia",
        takimB: "Kolombiya",
        normalizeA: "colombia",
        normalizeB: "kolombiya",
        aliasA: null,
        aliasB: null,
        benzerlik: 77.8,
        asama: "weak",
        algoritma: {
          belirleyen: "levenshtein",
          bilesenler: { levenshtein: 77.8, tokenSort: 77.8, tokenOverlap: 0, acronym: 0 },
        },
        ret: "team-below-threshold",
        siteler: ["betist", "virus_bet"],
        adet: 1,
        ornekler: [
          {
            taraf: "home",
            ters: false,
            rakipBenzerlik: 100,
            rakipAsama: "exact",
            a: {
              site: "virus_bet",
              league: "World - International Friendlies",
              date: "2026-09-18",
              time: "03:00",
              eventId: "48211",
              home: "Colombia",
              away: "Brazil",
            },
            b: {
              site: "betist",
              league: "International - Friendlies",
              date: "2026-09-18",
              time: "03:00",
              eventId: "77120931",
              home: "Kolombiya",
              away: "Brazil",
            },
          },
        ],
      },
      {
        sport: "BASKETBOL",
        takimA: "IA Central Cordoba",
        takimB: "Instituto Atletico Central Cordoba",
        normalizeA: "ia central cordoba",
        normalizeB: "instituto atletico central cordoba",
        aliasA: null,
        aliasB: null,
        benzerlik: 57.1,
        asama: "weak",
        algoritma: {
          belirleyen: "tokenOverlap",
          bilesenler: { levenshtein: 52.9, tokenSort: 41.2, tokenOverlap: 57.1, acronym: 0 },
        },
        ret: "team-below-threshold",
        siteler: ["betist", "mavi_bet"],
        adet: 1,
        ornekler: [
          {
            taraf: "home",
            ters: false,
            rakipBenzerlik: 100,
            rakipAsama: "exact",
            a: {
              site: "betist",
              league: "Argentina - Liga Nacional",
              date: "2026-09-19",
              time: "02:05",
              eventId: "77125004",
              home: "IA Central Cordoba",
              away: "Boca Juniors",
            },
            b: {
              site: "mavi_bet",
              league: "Argentina - Liga Nacional",
              date: "2026-09-19",
              time: "03:00",
              eventId: "9917344",
              home: "Instituto Atletico Central Cordoba",
              away: "Boca Juniors",
            },
          },
        ],
      },
      {
        sport: "BASKETBOL",
        takimA: "Nevada Las Vegas Rebels",
        takimB: "UNLV Rebels",
        normalizeA: "nevada las vegas rebels",
        normalizeB: "unlv rebels",
        aliasA: null,
        aliasB: null,
        benzerlik: 39.1,
        asama: "weak",
        algoritma: {
          belirleyen: "levenshtein",
          bilesenler: { levenshtein: 39.1, tokenSort: 34.8, tokenOverlap: 25, acronym: 0 },
        },
        ret: "team-below-threshold",
        siteler: ["mavi_bet", "virus_bet"],
        adet: 2,
        ornekler: [
          {
            taraf: "home",
            ters: true,
            rakipBenzerlik: 100,
            rakipAsama: "exact",
            a: {
              site: "virus_bet",
              league: "USA - NCAA",
              date: "2026-09-19",
              time: "02:00",
              eventId: "48377",
              home: "Nevada Las Vegas Rebels",
              away: "California Golden Bears",
            },
            b: {
              site: "mavi_bet",
              league: "USA - NCAA, Men",
              date: "2026-09-19",
              time: "02:00",
              eventId: "9917402",
              home: "California Golden Bears",
              away: "UNLV Rebels",
            },
          },
        ],
      },
    ],
  },
};

export const sampleSiteLinks: SiteLink[] = [
  { site: "VIRUS_BET", link: "https://virus-bet.example.com" },
  { site: "MAVI_BET", link: "https://mavi-bet.example.com" },
];
