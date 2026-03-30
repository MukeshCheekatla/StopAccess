# NextDNS API Reference Notes
> Internal summary for FocusGate
> Updated: 30 Mar 2026

This file is a safe working summary. Do not paste real API keys into docs.

## Base URL

`https://api.nextdns.io`

## Authentication

Send the API key in the `X-Api-Key` header on every request.

Example:

```http
X-Api-Key: <user-api-key>
```

## Response Shapes We Care About

Successful responses usually look like:

```json
{ "data": [...] }
```

or

```json
{ "data": { ... } }
```

Some endpoints may also return an empty body on success, so our client must not assume JSON is always present.

## Endpoints Used By FocusGate

### Profile denylist

- `GET /profiles/:profile/denylist`
- `PUT /profiles/:profile/denylist`

Used for:
- custom domain blocking
- browser + NextDNS hybrid mode

### Parental control services

- `GET /profiles/:profile/parentalControl/services`
- `PUT /profiles/:profile/parentalControl/services`

Used for:
- profile-wide service toggles like TikTok, Instagram, YouTube, Reddit, ChatGPT, Zoom

### Parental control categories

- `GET /profiles/:profile/parentalControl/categories`
- `PUT /profiles/:profile/parentalControl/categories`

Used for:
- profile-wide category toggles like social networks, porn, or streaming

### Logs

- `GET /profiles/:profile/logs`

Used for:
- recent block events
- extension insights

### Analytics

- `GET /profiles/:profile/analytics/domains`

Used for:
- top blocked domains

## Integration Rules

- Do not overwrite user state blindly when a merge is required
- Handle auth, validation, rate limit, and server errors separately
- Treat empty successful bodies as valid
- Surface profile-wide impact clearly in the UI
…
The errors array will contain at least one Error object with the following format:

{
  "code": "invalid",
  "detail": "\"HeLlO\" is not an integer.",
  "source": {
    "parameter": "limit" // for query string parameters, or "pointer" when the error is in the body.
  }
}
Pagination
Most endpoints that return an array for the data key are paginated.

Cursors are strings returned in the meta section of the response and should be passed as query string argument cursor to get the next page:

{
  "data": [...],
  "meta": {
    "pagination": {
      "cursor": "j2k3zl3b4v"
     }
   }
}

// get the next page with /endpoint?...&cursor=j2k3zl3b4v
Use the limit query string argument to adjust the number of results per page (e.g. /endpoint?...&limit=50).

cursor will be null when there is no more page.

Profiles
Profile
A entire profile can be represented with the following JSON:

{
  "name": "My profile",
  "security": {
    "threatIntelligenceFeeds": true,
    "aiThreatDetection": true,
    "googleSafeBrowsing": true,
    "cryptojacking": true,
    "dnsRebinding": true,
    "idnHomographs": true,
    "typosquatting": true,
    "dga": true,
    "nrd": true,
    "ddns": true,
    "parking": true,
    "csam": true,
    "tlds": [
      {
        "id": "ru"
      },
      {
        "id": "cn"
      },
      {
        "id": "cf"
      },
      {
        "id": "accountants"
      }
    ]
  },
  "privacy": {
    "blocklists": [
      {
        "id": "nextdns-recommended"
      },
      {
        "id": "oisd"
      }
    ],
    "natives": [
      {
        "id": "huawei"
      },
      {
        "id": "samsung"
      }
    ],
    "disguisedTrackers": true,
    "allowAffiliate": true
  },
  "parentalControl": {
    "services": [
      {
        "id": "tiktok",
        "active": true
      },
      {
        "id": "facebook",
        "active": false
      }
    ],
    "categories": [
      {
        "id": "porn",
        "active": true
      },
      {
        "id": "social-networks",
        "active": false
      }
    ],
    "safeSearch": true,
    "youtubeRestrictedMode": true,
    "blockBypass": false
  },
  "denylist": [
    {
      "id": "badwebsite.com",
      "active": true
    },
    {
      "id": "pornhub.com",
      "active": false
    }
  ],
  "allowlist": [
    {
      "id": "goodwebsite.com",
      "active": true
    },
    {
      "id": "nytimes.com",
      "active": false
    }
  ],
  "settings": {
    "logs": {
      "enabled": true,
      "drop": {
        "ip": false,
        "domain": false
      },
      "retention": 7776000,
      "location": "eu"
    },
    "blockPage": {
      "enabled": true
    },
    "performance": {
      "ecs": true,
      "cacheBoost": false,
      "cnameFlattening": true
    },
    "web3": true
  }
}
To create a new profile, POST at https://api.nextdns.io/profiles the above JSON. The API will return:

{
  "data": {
    "id": "abc123" // the id of the newly created profile
  }
}
You can then GET, PATCH and DELETE a profile at: https://api.nextdns.io/profiles/:profile (:profile in our example should be abc123).

Nested objects and arrays
All nested objects and arrays also have their own API child endpoints.

For example, you can GET or PATCH performance settings at: https://api.nextdns.io/profiles/:profile/settings/performance

…or add a domain to the Denylist by POST‘ing at: https://api.nextdns.io/profiles/:profile/denylist

Objects endpoints (such as .../privacy) support the GET and PATCH methods.

Arrays endpoints (such as .../privacy/blocklists) support the GET, PUT and POST methods. Each child supports the PATCH and DELETE method (you should use the first key as id).

Analytics
Analytics are available at https://api.nextdns.io/profiles/:profile/analytics/* (e.g. .../analytics/protocols).

Query string parameters
from
Type: Date

Filter out entities with older date (inclusive).

to
Type: Date

Filter out entities with newer or equal date (exclusive).

limit
Type: Integer
Default: 10

Limit the number of results returned (see Pagination).

limit should be >= 1 and <= 500.

cursor
Type: String

Use cursor to get the next page (see Pagination).

device
Type: String

Only get entities related to a specific device.

Use __UNIDENTIFIED__ to filter against all unidentified devices.

Endpoints
/profiles/:profile/analytics/status
{
  "data": [
    {
      "status": "default",
      "queries": 819491
    },
    {
      "status": "blocked",
      "queries": 132513
    },
    {
      "status": "allowed",
      "queries": 6923
    },
    ...
  ],
  ...
}
/profiles/:profile/analytics/domains
Specific query parameters:

status (optional, default | blocked | allowed)
root (optional, boolean, default false)
{
  "data": [
    {
      "domain": "app-measurement.com",
      "queries": 29801
    },
    {
      "domain": "gateway.icloud.com",
      "root": "icloud.com",
      "queries": 18468
    },
    {
      "domain": "app.smartmailcloud.com",
      "root": "smartmailcloud.com",
      "queries": 16414
    },
    ...
  ],
  ...
}
/profiles/:profile/analytics/reasons
{
  "data": [
    {
      "id": "blocklist:nextdns-recommended",
      "name": "NextDNS Ads & Trackers Blocklist",
      "queries": 131833
    },
    {
      "id": "native:apple",
      "name": "Native Tracking (Apple)",
      "queries": 402
    },
    {
      "id": "disguised-trackers",
      "name": "Disguised Third-Party Trackers",
      "queries": 269
    },
    ...
  ],
  ...
}
/profiles/:profile/analytics/ips
{
  "data": [
    {
      "ip": "91.171.12.34",
      "network": {
        "cellular": false,
        "vpn": false,
        "isp": "Free",
        "asn": 12322
      },
      "geo": {
        "latitude": 48.8998,
        "longitude": 2.703,
        "countryCode": "FR",
        "country": "France",
        "city": "Gagny"
      },
      "queries": 136935
    },
    {
      "ip": "2a01:e0a:2cd:1234:312a:4c24:215d:185",
      "network": {
        "cellular": false,
        "vpn": false,
        "isp": "Free",
        "asn": 12322
      },
      "geo": {
        "latitude": 48.5136,
        "longitude": -1.9042,
        "countryCode": "FR",
        "country": "France",
        "city": "Miniac-Morvan"
      },
      "queries": 40410
    },
    ...
  ],
  ...
}
/profiles/:profile/analytics/devices
{
  "data": [
    {
      "id": "8TD1G",
      "name": "Romain’s iPhone",
      "model": "iPhone 12 Pro Max",
      "queries": 489885
    },
    {
      "id": "E24AR",
      "name": "MBP",
      "model": "Macbook Pro",
      "localIp": "192.168.0.11",
      "queries": 215663
    },
    {
      "id": "__UNIDENTIFIED__",
      "queries": 74242
    },
    ...
  ],
  ...
}
/profiles/:profile/analytics/protocols
{
  "data": [
    {
      "protocol": "DNS-over-HTTPS",
      "queries": 958757
    },
    {
      "protocol": "DNS-over-TLS",
      "queries": 39582
    },
    {
      "protocol": "UDP",
      "queries": 2334
    },
    ...
  ],
  ...
}
/profiles/:profile/analytics/queryTypes
{
  "data": [
    {
      "type": 28,
      "name": "AAAA",
      "queries": 356230
    },
    {
      "type": 1,
      "name": "A",
      "queries": 341812
    },
    {
      "type": 65,
      "name": "HTTPS",
      "queries": 260478
    },
    ...
  ],
  ...
}
/profiles/:profile/analytics/ipVersions
{
  "data": [
    {
      "version": 6,
      "queries": 784154
    },
    {
      "version": 4,
      "queries": 174308
    },
    ...
  ],
  ...
}
/profiles/:profile/analytics/dnssec
{
  "data": [
    {
      "validated": false,
      "queries": 817664
    },
    {
      "validated": true,
      "queries": 8199
    },
    ...
  ],
  ...
}
/profiles/:profile/analytics/encryption
{
  "data": [
    {
      "encrypted": true,
      "queries": 958331
    },
    {
      "encrypted": false,
      "queries": 1
    },
    ...
  ],
  ...
}
/profiles/:profile/analytics/destinations?type=countries
{
  "data": [
    {
      "code": "US",
      "domains": [
        "app.smartmailcloud.com",
        "imap.gmail.com",
        "api.coinbase.com",
        "events-service.coinbase.com",
        "ws.coinbase.com"
      ],
      "queries": 209851
    },
    {
      "code": "FR",
      "domains": [
        "inappcheck.itunes.apple.com",
        "iphone-ld.apple.com",
        "bag.itunes.apple.com",
        "itunes.apple.com",
        "www.apple.com"
      ],
      "queries": 105497
    },
    ...
  ],
  ...
}
/profiles/:profile/analytics/destinations?type=gafam
{
  "data": [
    {
      "company": "others",
      "queries": 478732
    },
    {
      "company": "apple",
      "queries": 284832
    },
    {
      "company": "google",
      "queries": 159488
    },
    ...
  ],
  ...
}
Time series
All the endpoints above can return time series data to easily create charts.

Time series endpoints are built by appending ;series to any of the endpoints above (e.g. .../analytics/status;series?...).

Time series responses return an array of values for queries instead of a single value.

All query string parameters mentioned here are supported and should be used, with the addition of the following parameters:

interval
Type: Seconds | Duration

By default, the API uses an appropriate duration for each tumbling window based on the full window size (from -> to).

alignment
Values: start | end | clock
Default: end

Useful when the full window doesn’t fit an exact number of tumbling windows, or when you want to align windows on the clock.

timezone
Type: TimeZone
Default: GMT

Use this in correlation with alignment=clock.

partials
Values: none | start | end | all
Default: none

Decide if you want partial tumbling windows to be returned.

// https://api.nextdns.io/profiles/abc123/analytics/queryTypes;series?from=-7d&interval=1d&limit=2

{
  "data": [
    {
      "type": 28,
      "name": "AAAA",
      "queries": [
        4019,
        5801,
        2667,
        2817,
        3314,
        3128,
        3810
      ]
    },
    {
      "type": 1,
      "name": "A",
      "queries": [
        3873,
        5421,
        2691,
        2865,
        3387,
        3192,
        3864
      ]
    }
  ],
  "meta": {
    "series": {
      "times": [ // the starting date of each tumbling window
        "2021-03-08T16:51:36.623Z",
        "2021-03-09T16:51:36.623Z",
        "2021-03-10T16:51:36.623Z",
        "2021-03-11T16:51:36.623Z",
        "2021-03-12T16:51:36.623Z",
        "2021-03-13T16:51:36.623Z",
        "2021-03-14T16:51:36.623Z"
      ],
      "interval": 86400 // the duration (in seconds) of each tumbling window
    },
    "pagination": {
      "cursor": "jS8sl16m"
    }
  }
}
Logs
Analytics are available at https://api.nextdns.io/profiles/:profile/logs.

Query string parameters
from
Type: Date

Filter out logs with older date (inclusive).

to
Type: Date

Filter out logs with newer or equal date (exclusive).

sort
Values: asc | desc
Default: desc

Using asc will return logs from oldest to newest, desc from newest to oldest.

limit
Type: Integer
Default: 100

Limit the number of results returned (see Pagination).

limit should be >= 10 and <= 1000.

cursor
Type: String

Use cursor to get the next page (see Pagination).

device
Type: String

Only get logs made for a specific device.

Use __UNIDENTIFIED__ to filter against all unidentified devices.

status
Values: default | error | blocked | allowed
Optional

Filter by status.

search
Type: String

Only returns logs matching the search query.

e.g. facebook will show logs from facebook.com, facebook.hello.com and hellofacebookhello.com.

raw
Type: Boolean
Default: false

By default, only navigational query types (A, AAAA and HTTPS) are returned, and are automatically deduplicated. Irrelevant domains considered noise (like Google Chrome random DNS lookups) are also not returned. This gives a clearer overview of network access. Use raw=1 to show all DNS queries.

{
  "data": [
    {
      "timestamp": "2021-03-18T03:00:10.338Z",
      "domain": "21-courier.push.apple.com",
      "root": "apple.com",
      "tracker": "apple",
      "encrypted": true,
      "protocol": "DNS-over-HTTPS",
      "clientIp": "2a01:e0a:2cd:87a0:1b23:2832:57cd:aa1d",
      "client": "apple-profile",
      "device": {
        "id": "8TD1G",
        "name": "Romain’s iPhone",
        "model": "iPhone 12 Pro Max"
      },
      "status": "default",
      "reasons": []
    },
    {
      "timestamp": "2021-03-18T02:56:14.182Z",
      "domain": "sb.scorecardresearch.com",
      "root": "scorecardresearch.com",
      "tracker": "scorecard_research_beacon",
      "encrypted": false,
      "protocol": "UDP",
      "clientIp": "91.172.51.28",
      "status": "blocked",
      "reasons": [
        {
          "id": "blocklist:nextdns-recommended",
          "name": "NextDNS Ads & Trackers Blocklist"
        },
        {
          "id": "blocklist:oisd",
          "name": "oisd"
        }
      ]
    },
    ...
  ],
  ...
}
Streaming
Stream new logs in real-time with Server-sent events (or SSE) by using the endpoint GET /profiles/:profile/logs/stream.

The /logs/stream endpoint supports all query string parameters supported by the /logs endpoint with the exception of from, to, sort, limit and cursor.

Events have the following format:

id: 64v32d9r6rwkcctg6cu38e9g60
data: {"timestamp":"2021-03-16T04:40:30.344Z","domain":"g.whatsapp.net","root":"whatsapp.net","encrypted":true,"protocol":"DNS-over-HTTPS","clientIp":"2a01:e0a:2cd:87a0:5540:d573:57cd:aa1d","client":"apple-profile","device":{"id":"8TD1G","name":"Romainâ€™s iPhone","model":"iPhone 12 Pro Max"},"status":"default","reasons":[]}
Pass the last id received as query string parameter to resume where you left off (e.g. .../logs/stream?id=64v32d9r6rwkcctg6cu38e9g60).

:bulb: The standard /logs endpoint will return an id when getting the most recent logs:

{
  "data": [...],
  "meta": {
    ...
    "stream": {
      "id": "64v32d9r6rwkcctg6cu38e9g60"
    }
  }
}
Pass this id as query string parameter to the /logs/stream endpoint when you need to stitch recent logs and new logs received from the streaming endpoint without any duplicate or missing logs.

Download
GET https://api.nextdns.io/profiles/:profile/logs/download

:bulb: By default, this endpoint will automatically redirect to the public URL of the file. Use ?redirect=0 to get a JSON containing that URL (useful when showing a loader while the file is being generated).

Clear
DELETE https://api.nextdns.io/profiles/:profile/logs

:bulb: Logs are automatically cleared when a profile is deleted.

Miscellaneous
Date format in query parameters
The API accepts different formats for dates in query string parameters:

ISO 8601 (e.g. 2021-03-15T16:34:05.203Z)
Unix timestamp in seconds (e.g. 1615826071)
Unix timestamp in milliseconds (e.g. 1615826071284)
Relative (e.g. -6h, -1d, -3M or now)
Common date formats (e.g. 2021-03-15)
TimeZone format
The API only accepts time zone names from the Time Zone Database.

In JavaScript, you can get this with:

Intl.DateTimeFormat().resolvedOptions().timeZone
> "Europe/Paris"
