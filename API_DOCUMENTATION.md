# Precise Bet API Documentation

## Base URL

```text
http://localhost:3005
```

The base URL and port are controlled by `APP_URL` and `APP_PORT`.

## Authentication

Protected endpoints require the exact value of the backend `AUTH_TOKEN` environment variable:

```http
Authorization: YOUR_AUTH_TOKEN
```

The backend compares the header directly with `AUTH_TOKEN`. Do not prefix the value with `Bearer`.

There is currently no login or token-generation endpoint.

Example development configuration:

```env
VITE_API_URL=http://localhost:3005
VITE_AUTH_TOKEN=your-development-auth-token
```

Do not expose a long-lived production `AUTH_TOKEN` directly in a browser application. Use a server-side proxy or backend-for-frontend in production.

## Endpoints

### GET `/health-check`

Public health check.

Response: HTML

```html
<div>SERVER IS RUNNING</div>
```

### GET `/user/test`

Public test endpoint.

Response:

```json
"test"
```

### GET `/user/me`

Protected endpoint.

Headers:

```http
Authorization: YOUR_AUTH_TOKEN
```

Response: returns the current Express `req.user` value. The current authentication middleware only validates the static token and does not populate `req.user`, so this endpoint may return an empty or undefined response until user population is implemented.

### GET `/panel/site-links`

Protected endpoint.

Headers:

```http
Authorization: YOUR_AUTH_TOKEN
```

Returns the configured betting-site links.

Response:

```json
[
  {
    "site": "VIRUS_BET",
    "link": "https://example.com"
  }
]
```

The response may be an empty array when no site links have been configured.

### POST `/panel/save-site-link`

Protected endpoint.

Headers:

```http
Authorization: YOUR_AUTH_TOKEN
Content-Type: application/json
```

Request body:

```json
{
  "site": "VIRUS_BET",
  "link": "https://example.com"
}
```

Valid `site` values:

```text
MAVI_BET
BETIST
VIRUS_BET
ZLOT
```

Successful response:

```json
{
  "_id": "mongodb-object-id",
  "site": "VIRUS_BET",
  "link": "https://example.com",
  "createdAt": "2026-09-16T00:00:00.000Z",
  "updatedAt": "2026-09-16T00:00:00.000Z"
}
```

Possible errors:

```json
{
  "statusCode": 400,
  "locale_key": "api.error.missingParameters",
  "message": "Missing parameters"
}
```

```json
{
  "statusCode": 400,
  "locale_key": "api.error.invalid_site",
  "message": "Invalid site"
}
```

### GET `/panel/matches`

Protected endpoint.

Headers:

```http
Authorization: YOUR_AUTH_TOKEN
```

Response shape:

```json
{
  "VIRUS_BET": [
    {
      "_id": "mongodb-object-id",
      "site": "mongodb-object-id",
      "sport": "FOOTBALL",
      "leagues": [
        {
          "league": "LFPB",
          "dates": [
            {
              "date": "2026-09-18",
              "matches": [
                {
                  "home": "CD Real Tomayapo",
                  "away": "CD Oriente Petrolero",
                  "time": "20:00"
                }
              ]
            }
          ]
        }
      ],
      "createdAt": "2026-09-16T00:00:00.000Z",
      "updatedAt": "2026-09-16T00:00:00.000Z"
    }
  ],
  "MAVI_BET": [],
  "BETIST": [],
  "ZLOT": []
}
```

`sport` is a catalog id from the backend (`EMatchSport`): `FOOTBALL`, `BASKETBALL`, `VOLLEYBALL`, `ICE_HOCKEY`, `MMA`, `ESPORTS_CS2` and more. Tennis is no longer fetched.

### GET `/panel/compared-matches`

Protected endpoint.

Headers:

```http
Authorization: YOUR_AUTH_TOKEN
```

The response is read from `match-times-diff.json`. Its exact contents may change when the comparison process runs.

Each entry in `farkliMaclar` is **one real-world fixture** that the backend matched across two or more sites and whose kick-off times differ. Fixtures where every site agrees are only counted in `ozet`. The frontend shows these groups as they are and never re-matches teams.

Current response shape:

```json
{
  "olusturulma": "2026-10-02T22:32:59.845Z",
  "siteler": ["virus_bet", "mavi_bet", "betist", "zlot"],
  "kaynaklar": {},
  "okunamayan": [],
  "ayarlar": {
    "toleransDakika": 0,
    "takimEsigi": 78,
    "ligEsigi": 55,
    "ligZorunlu": false,
    "tarihToleransGun": 3
  },
  "ozet": {
    "toplamMacGrubu": 5776,
    "karsilastirilabilir": 3686,
    "saatiFarkli": 254,
    "saatiAyni": 3432,
    "kapsam": { "1_sitede": 2090, "2_sitede": 1281, "3_sitede": 1038, "4_sitede": 1367 },
    "siteBazinda": {},
    "ikiliEslesme": [],
    "eslestirme": {}
  },
  "farkliMaclar": {
    "FUTBOL": {
      "2. Liga": {
        "2026-10-09": [
          {
            "sport": "FUTBOL",
            "league": "2. Liga",
            "date": "2026-10-09",
            "home": "Kapfenberger SV",
            "away": "FK Austria Wien II",
            "saatler": { "virus_bet": "19:30", "mavi_bet": "19:30", "betist": "19:00" },
            "tarihler": { "virus_bet": "2026-10-09", "mavi_bet": "2026-10-09", "betist": "2026-10-09" },
            "tarihFarkli": false,
            "maxFarkDakika": 30,
            "sapanSiteler": [{ "site": "betist", "farkDakika": -30 }],
            "eksikSiteler": ["zlot"],
            "ligler": { "virus_bet": "Austria - 2. Liga", "mavi_bet": "Austria - 2. Liga", "betist": "Austria - 2. Liga" },
            "takimlar": {
              "virus_bet": "Kapfenberger SV - FK Austria Wien II",
              "mavi_bet": "Kapfenberg - Austria Wien II",
              "betist": "Kapfenberger SV - Avusturya (A)"
            },
            "eslesme": [
              { "siteA": "virus_bet", "siteB": "mavi_bet", "kimlik": "fuzzy", "ters": false, "guven": 1 }
            ]
          }
        ]
      }
    }
  }
}
```

Entry fields:

| Field | Meaning |
| --- | --- |
| `home`, `away`, `league`, `date` | Canonical fixture, taken from the first site (in `siteler` order) that lists it. Variants such as U19, II or Women are part of the name. |
| `saatler` / `tarihler` | Kick-off time and date exactly as each site publishes them. All sites are read as Turkey local time (UTC+3); no conversion is applied. |
| `tarihFarkli` | The sites disagree on the day, not only the clock time. |
| `maxFarkDakika` | Earliest to latest kick-off in minutes, date differences included. |
| `sapanSiteler` | Sites whose kick-off differs from the most reported one (ties go to the earliest), with the signed difference in minutes. |
| `eksikSiteler` | Compared sites that do not list the fixture. |
| `ligler` / `takimlar` | League and "Home - Away" exactly as each site writes them, in that site's own order. |
| `eslesme` | How pairs of sites were matched: identity stage (`kimlik`), whether home and away were swapped (`ters`), and confidence in [0, 1] (`guven`). |
| `okunamayan` | Source files the run could not read, with the reason. |

#### Live matches

When the fetcher has written a fresh `<site>-live-matches.json` beside a site's match file, the run merges that site's live records into its scheduled list before matching. They go through the same name matcher as scheduled records. A record in both feeds (same event id) stays one record and keeps its scheduled time. If no live file is present, or every one is stale, none of the fields below appear and the response is unchanged.

`GET /panel/matches` is not affected: live records are never written to the stored match documents.

```json
{
  "ozet": {
    "canli": {
      "kaynaklar": {
        "virus_bet": { "durum": "ok", "fetchedAt": "2026-10-16T18:31:02.000Z", "yasDakika": 0.8, "kayit": 38, "birlesen": 31, "eklenen": 7, "saatiGeriYuklenen": 2 },
        "mavi_bet": { "durum": "eski", "fetchedAt": "2026-10-16T18:08:00.000Z", "yasDakika": 23.4 }
      },
      "canliMacGrubu": 2,
      "cokSitedeCanli": 2,
      "bitmis": 1,
      "saatiFarkliCanli": 1,
      "baslamamisGosterilen": 1,
      "canliKanitliEslesme": 0
    }
  },
  "farkliMaclar": {
    "FUTBOL": { "Süper Lig": { "2026-10-16": [
      {
        "home": "Galatasaray",
        "away": "Fenerbahce",
        "saatler": { "virus_bet": "19:30", "mavi_bet": "21:00" },
        "eslesme": [{ "siteA": "virus_bet", "siteB": "mavi_bet", "kimlik": "alias", "ters": false, "guven": 1 }],
        "canli": {
          "durum": "live",
          "siteler": {
            "virus_bet": { "durum": "live", "skor": "1:0", "periyot": "2nd half", "dakika": "63", "bildirilenBaslama": "19:34" }
          },
          "baslamamisGosteren": ["mavi_bet"]
        }
      }
    ] } }
  },
  "canliAmaBaslamamisGorunen": { "FUTBOL": { "Süper Lig": { "2026-10-16": ["…same row shape…"] } } }
}
```

| Field | Meaning |
| --- | --- |
| `ozet.canli.kaynaklar` | How each site's live file was used: `ok` (used), `eski` (older than the backend limit, 15 minutes by default, so ignored) or `hata` (unreadable). `birlesen` counts live records merged into the same event, `eklenen` live records added because the site had already dropped the fixture from its list, and `saatiGeriYuklenen` added records whose scheduled time came from the site's earlier list. |
| `canli.durum` | `live`, `interrupted` or `finished`, taken only from the sites' explicit statuses. `finished` outranks `live`, so a site that is slow to update does not keep a fixture live. A fixture is never live just because its kick-off has passed, and a fixture missing from a live feed is not treated as finished. |
| `canli.siteler` | Per site: status, score (`skor`), period (`periyot`), minute (`dakika`) and the start the live feed reports (`bildirilenBaslama`). That reported start is kept apart from the scheduled time in `saatler`. `saatKaynagi: "onceki-liste"` means the scheduled time came from the site's previous list. |
| `canli.baslamamisGosteren` | Sites that still list the fixture as upcoming, with a scheduled time well after it was first seen live. This is the clearest sign of a wrong scheduled time. |
| `eslesme[].canliKanit` | Live evidence that let a pair past a time guard: `simultaneous` (both live at the same time) or `live-vs-upcoming`. |
| `canliAmaBaslamamisGorunen` | Live fixtures that another site still lists as upcoming. The row shape matches `farkliMaclar` and may repeat rows from it. Rows whose times cannot be compared, such as a live record with no scheduled time, appear only here. |

The frontend shows each row of `farkliMaclar` and adds rows from `canliAmaBaslamamisGorunen` only when they are not an exact repeat of one already shown. It never re-matches teams. A run older than 15 minutes has its live statuses labelled "at last run".

## Common Errors

### Invalid authentication: HTTP 401

```json
{
  "statusCode": 401,
  "message": "auth.error.notAuthenticated",
  "error": "auth.error.notAuthenticated"
}
```

### Rate limit: HTTP 429

The API allows approximately 600 requests per 30 seconds per client/IP.

```json
{
  "statusCode": 429,
  "locale_key": "api.error.too_many_requests",
  "message": "Too many requests, please try again later"
}
```

### General server error: HTTP 500

```json
{
  "statusCode": 500,
  "locale_key": "api.error.unexpected",
  "message": "Unexpected error"
}
```

## Backend Environment Credentials

The backend requires these categories of configuration. Only the frontend-facing token should be provided to a frontend integration, and it should be handled carefully.

```env
AUTH_TOKEN=replace-with-a-real-secret
APP_URL=http://localhost:3005
APP_PORT=3005
FRONTEND_URL=http://localhost:8080
MONGO_URI=mongodb://localhost:27017/cgg
REDIS_URI=localhost
SESSION_SECRET=replace-with-a-session-secret
```

AWS and Google reCAPTCHA configuration are also defined by the backend environment, but they are server-side credentials and must not be placed in a browser frontend.
