import type { SiteLink } from "../types/api";
import type { MatchesResponse } from "../types/matches";
import type { ApiDifferentMatch, ComparedMatchesResponse } from "../types/comparison";

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

/**
 * Live on two sites while Mavi Bet still lists 20:30. The backend writes this
 * row under both `farkliMaclar` and `canliAmaBaslamamisGorunen`.
 */
const arsenalChelsea: ApiDifferentMatch = {
  sport: "FUTBOL",
  league: "Premier League",
  date: "2026-09-18",
  home: "Arsenal",
  away: "Chelsea",
  saatler: { virus_bet: "20:00", mavi_bet: "20:30", zlot: "20:00" },
  tarihler: { virus_bet: "2026-09-18", mavi_bet: "2026-09-18", zlot: "2026-09-18" },
  tarihFarkli: false,
  maxFarkDakika: 30,
  sapanSiteler: [{ site: "mavi_bet", farkDakika: 30 }],
  eksikSiteler: ["betist"],
  ligler: {
    virus_bet: "England - Premier League",
    mavi_bet: "England - Premier League",
    zlot: "England - Premier League",
  },
  takimlar: {
    virus_bet: "Arsenal - Chelsea",
    mavi_bet: "Arsenal FC - Chelsea FC",
    zlot: "Arsenal - Chelsea",
  },
  eslesme: [
    { siteA: "virus_bet", siteB: "zlot", kimlik: "exact", ters: false, guven: 1 },
    { siteA: "virus_bet", siteB: "mavi_bet", kimlik: "core", ters: false, guven: 0.96 },
  ],
  canli: {
    durum: "live",
    siteler: {
      virus_bet: { durum: "live", skor: "1:0", periyot: "1st half", dakika: "24", bildirilenBaslama: "20:02" },
      zlot: { durum: "live", skor: "1:0", dakika: "23" },
    },
    baslamamisGosteren: ["mavi_bet"],
  },
};

export const sampleComparedMatches: ComparedMatchesResponse = {
  olusturulma: "2026-09-16T02:12:22.017Z",
  siteler: ["virus_bet", "mavi_bet", "betist", "zlot"],
  kaynaklar: {},
  okunamayan: [],
  ayarlar: {
    toleransDakika: 0,
    takimEsigi: 78,
    ligEsigi: 55,
    ligZorunlu: false,
    tarihToleransGun: 3,
  },
  ozet: {
    toplamMacGrubu: 5776,
    karsilastirilabilir: 3686,
    saatiFarkli: 254,
    saatiAyni: 3432,
    kapsam: { "1_sitede": 2090, "2_sitede": 1281, "3_sitede": 1038, "4_sitede": 1367 },
    canli: {
      kaynaklar: {
        virus_bet: { durum: "ok", fetchedAt: "2026-09-16T02:11:40.000Z", yasDakika: 0.7, kayit: 38, birlesen: 31, eklenen: 7, saatiGeriYuklenen: 2 },
        mavi_bet: { durum: "eski", fetchedAt: "2026-09-16T01:49:00.000Z", yasDakika: 23.4 },
        betist: { durum: "ok", fetchedAt: "2026-09-16T02:10:55.000Z", yasDakika: 1.5, kayit: 22, birlesen: 0, eklenen: 22, saatiGeriYuklenen: 0 },
        zlot: { durum: "ok", fetchedAt: "2026-09-16T02:11:05.000Z", yasDakika: 1.3, kayit: 41, birlesen: 12, eklenen: 29, saatiGeriYuklenen: 0 },
      },
      canliMacGrubu: 2,
      cokSitedeCanli: 2,
      bitmis: 1,
      saatiFarkliCanli: 1,
      baslamamisGosterilen: 2,
      canliKanitliEslesme: 0,
    },
  },
  farkliMaclar: {
    FUTBOL: {
      "Premier League": {
        "2026-09-18": [
          arsenalChelsea,
        ],
      },
      "Süper Lig": {
        "2026-09-19": [
          {
            sport: "FUTBOL",
            league: "Süper Lig",
            date: "2026-09-19",
            home: "Fenerbahçe",
            away: "Galatasaray",
            saatler: { virus_bet: "18:00", mavi_bet: "19:00", betist: "18:00", zlot: "18:30" },
            tarihler: {
              virus_bet: "2026-09-19",
              mavi_bet: "2026-09-19",
              betist: "2026-09-19",
              zlot: "2026-09-19",
            },
            tarihFarkli: false,
            maxFarkDakika: 60,
            sapanSiteler: [
              { site: "mavi_bet", farkDakika: 60 },
              { site: "zlot", farkDakika: 30 },
            ],
            eksikSiteler: [],
            ligler: {
              virus_bet: "Turkey - Süper Lig",
              mavi_bet: "Turkey - Super Lig",
              betist: "Türkiye - Süper Lig",
              zlot: "Turkey - Super League",
            },
            takimlar: {
              virus_bet: "Fenerbahçe - Galatasaray",
              mavi_bet: "Fenerbahce SK - Galatasaray SK",
              betist: "Fenerbahçe - Galatasaray",
              zlot: "Galatasaray - Fenerbahce",
            },
            eslesme: [
              { siteA: "virus_bet", siteB: "betist", kimlik: "exact", ters: false, guven: 1 },
              { siteA: "virus_bet", siteB: "mavi_bet", kimlik: "alias", ters: false, guven: 1 },
              { siteA: "virus_bet", siteB: "zlot", kimlik: "reversed", ters: true, guven: 0.94 },
            ],
          },
        ],
      },
      "U19 Elit Lig": {
        "2026-09-18": [
          {
            sport: "FUTBOL",
            league: "U19 Elit Lig",
            date: "2026-09-18",
            home: "Galatasaray U19",
            away: "Fenerbahce U19",
            saatler: { virus_bet: "14:00", betist: "15:00" },
            tarihler: { virus_bet: "2026-09-18", betist: "2026-09-18" },
            tarihFarkli: false,
            maxFarkDakika: 60,
            sapanSiteler: [{ site: "betist", farkDakika: 60 }],
            eksikSiteler: ["mavi_bet", "zlot"],
            ligler: { virus_bet: "Turkey - U19 Elit Lig", betist: "Türkiye - U19 Ligi" },
            takimlar: {
              virus_bet: "Galatasaray U19 - Fenerbahce U19",
              betist: "Galatasaray U19 - Fenerbahçe U19",
            },
            eslesme: [
              { siteA: "virus_bet", siteB: "betist", kimlik: "exact", ters: false, guven: 1 },
            ],
          },
        ],
      },
    },
    BASKETBOL: {
      WNBA: {
        "2026-09-18": [
          {
            sport: "BASKETBOL",
            league: "WNBA",
            date: "2026-09-18",
            home: "New York Liberty",
            away: "Atlanta Dream",
            saatler: { virus_bet: "03:00", mavi_bet: "20:00", zlot: "23:00" },
            tarihler: { virus_bet: "2026-09-18", mavi_bet: "2026-09-17", zlot: "2026-09-17" },
            tarihFarkli: true,
            maxFarkDakika: 420,
            sapanSiteler: [
              { site: "virus_bet", farkDakika: 420 },
              { site: "zlot", farkDakika: 180 },
            ],
            eksikSiteler: ["betist"],
            ligler: {
              virus_bet: "North America - WNBA",
              mavi_bet: "United States - WNBA Including Playoffs",
              zlot: "USA - WNBA",
            },
            takimlar: {
              virus_bet: "New York Liberty - Atlanta Dream",
              mavi_bet: "Atlanta Dream (W) - New York Liberty (W)",
              zlot: "Atlanta Dream (W) - New York Liberty (W)",
            },
            eslesme: [
              { siteA: "mavi_bet", siteB: "zlot", kimlik: "exact", ters: false, guven: 1 },
              { siteA: "virus_bet", siteB: "zlot", kimlik: "exact", ters: true, guven: 1 },
            ],
            canli: { durum: "finished", siteler: { zlot: { durum: "finished", skor: "79:84" } } },
          },
        ],
      },
    },
    BUZ_HOKEYI: {
      KHL: {
        "2026-09-19": [
          {
            sport: "BUZ_HOKEYI",
            league: "KHL",
            date: "2026-09-19",
            home: "SKA St. Petersburg",
            away: "CSKA Moscow",
            saatler: { mavi_bet: "17:30", zlot: "16:30" },
            tarihler: { mavi_bet: "2026-09-19", zlot: "2026-09-19" },
            tarihFarkli: false,
            maxFarkDakika: 60,
            sapanSiteler: [{ site: "mavi_bet", farkDakika: 60 }],
            eksikSiteler: ["virus_bet", "betist"],
            ligler: { mavi_bet: "Russia - KHL", zlot: "Russia - KHL" },
            takimlar: {
              mavi_bet: "SKA St. Petersburg - CSKA Moscow",
              zlot: "SKA Saint Petersburg - CSKA Moskva",
            },
            eslesme: [
              { siteA: "mavi_bet", siteB: "zlot", kimlik: "fuzzy", ters: false, guven: 0.9 },
            ],
          },
        ],
      },
    },
  },
  canliAmaBaslamamisGorunen: {
    FUTBOL: { "Premier League": { "2026-09-18": [arsenalChelsea] } },
    BASKETBOL: {
      EuroLeague: {
        "2026-09-18": [
          {
            // Betist's live menu carries no scheduled time, so the kick-offs
            // cannot be compared; the fixture is only reported here.
            sport: "BASKETBOL",
            league: "EuroLeague",
            date: "2026-09-18",
            home: "Anadolu Efes",
            away: "Real Madrid",
            saatler: { virus_bet: "21:45", betist: "" },
            tarihler: { virus_bet: "2026-09-18", betist: "2026-09-18" },
            tarihFarkli: false,
            maxFarkDakika: null,
            sapanSiteler: [],
            eksikSiteler: ["mavi_bet", "zlot"],
            ligler: { virus_bet: "Europe - EuroLeague", betist: "Avrupa - " },
            takimlar: {
              virus_bet: "Anadolu Efes - Real Madrid",
              betist: "Anadolu Efes SK - Real Madrid",
            },
            eslesme: [
              { siteA: "virus_bet", siteB: "betist", kimlik: "core", ters: false, guven: 0.97 },
            ],
            canli: {
              durum: "live",
              siteler: { betist: { durum: "live", skor: "41:38", periyot: "Q2" } },
              baslamamisGosteren: ["virus_bet"],
            },
          },
        ],
      },
    },
  },
};

export const sampleSiteLinks: SiteLink[] = [
  { site: "VIRUS_BET", link: "https://virus-bet.example.com" },
  { site: "MAVI_BET", link: "https://mavi-bet.example.com" },
];
