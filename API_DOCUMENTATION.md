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
