# Atmos — Modern Weather Application

A premium, fully functional weather web app built with **HTML5**, **CSS3**, and **vanilla JavaScript**. Atmos shows live conditions, hourly and 7-day forecasts, charts, air quality, dynamic weather backgrounds, and theme/unit preferences — with no frameworks required.

## Live demo

GitHub Pages: [https://sdundlovu.github.io/weather-app/](https://sdundlovu.github.io/weather-app/)

## How to run locally

1. Clone this repository.
2. Open `index.html` in a modern browser, or serve the folder:

```bash
npx serve .
```

Then visit the URL shown in the terminal (for example `http://localhost:3000`).

No build step, bundler, or API key is required.

## Features

- Live current weather for any searchable city
- City search with disambiguation (country / region)
- Geolocation (“Locate”) with friendly permission messaging
- Hourly forecast (next 24 hours) and 7-day outlook
- Temperature and precipitation charts (Chart.js)
- Humidity, wind, UV, pressure, visibility, clouds, precipitation chance, dew point
- Sunrise / sunset, daylight duration, air quality (European AQI when available)
- Data-driven weather summary and condition-based notices
- Celsius / Fahrenheit toggle with localStorage persistence
- Dark / light themes (defaults to OS preference on first visit)
- Recently searched cities saved locally
- Dynamic backgrounds (clear, cloudy, rain, thunder, snow, fog, night)
- Loading states, error banners with retry, keyboard-friendly search
- Responsive layout for desktop, tablet, and mobile
- `prefers-reduced-motion` support

## APIs used

| Service | Purpose | Auth |
|---------|---------|------|
| [Open-Meteo Forecast API](https://open-meteo.com/) | Current, hourly, and daily weather | None |
| [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) | City name → coordinates | None |
| [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | European / US AQI | None |
| [BigDataCloud reverse geocode](https://www.bigdatacloud.com/free-api) | Label for geolocation results | None (client endpoint) |

Open-Meteo is free for non-commercial use under its terms and does not require an API key for standard request volumes.

## External libraries (CDN)

- [Chart.js](https://www.chartjs.org/) `4.4.7` — temperature & precipitation charts
- [Lucide Icons](https://lucide.dev/) — UI and weather icons
- [Google Fonts](https://fonts.google.com/) — Outfit & DM Sans

## Project structure

```
weather-app/
├── index.html   # Semantic layout & sections
├── style.css    # Themes, glass UI, responsive layout, weather backgrounds
├── script.js    # API, search, geolocation, charts, storage, rendering
└── README.md    # This file
```

## Preferences & caching

Stored in `localStorage`:

- Temperature unit (`atmos_unit`)
- Theme (`atmos_theme`)
- Recent cities (`atmos_recents`, up to 6)

Weather responses are cached in memory for **10 minutes** per coordinate pair to avoid redundant requests. Cached payloads are still real API data, not fabricated values.

## API limitations

- Open-Meteo free usage is subject to fair-use rate limits; heavy traffic may return HTTP 429.
- Some “current” fields (UV, visibility, dew point, precipitation probability) are enriched from the matching hourly timestep when not present on the current endpoint.
- Air quality coverage varies by region; if unavailable, the UI shows an honest “Unavailable” state.
- Severe-weather “notices” are derived only from measured extremes (e.g. thunderstorm codes, high UV, strong winds, poor AQI) — not from a dedicated warning feed.
- Geolocation requires HTTPS (or localhost) and user permission in most browsers.

## Browser support

Modern evergreen browsers with ES6+, CSS Grid/Flexbox, `fetch`, Geolocation, and `localStorage`.
