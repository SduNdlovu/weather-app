/**
 * Atmos — Modern Weather Application
 * Open-Meteo API · Geolocation · Chart.js · Local Storage
 */

(() => {
  "use strict";

  /* ========== Constants ========== */
  const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
  const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
  const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

  const STORAGE = {
    unit: "atmos_unit",
    theme: "atmos_theme",
    recents: "atmos_recents",
    reduceMotion: "atmos_reduce_motion",
  };

  const MAX_RECENTS = 6;
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const weatherCache = new Map();

  const WMO = {
    0: { label: "Clear sky", icon: "sun", nightIcon: "moon", bg: "clear" },
    1: { label: "Mainly clear", icon: "sun", nightIcon: "moon", bg: "clear" },
    2: { label: "Partly cloudy", icon: "cloud-sun", nightIcon: "cloud-moon", bg: "cloudy" },
    3: { label: "Overcast", icon: "cloud", nightIcon: "cloud", bg: "cloudy" },
    45: { label: "Fog", icon: "cloud-fog", nightIcon: "cloud-fog", bg: "fog" },
    48: { label: "Depositing rime fog", icon: "cloud-fog", nightIcon: "cloud-fog", bg: "fog" },
    51: { label: "Light drizzle", icon: "cloud-drizzle", nightIcon: "cloud-drizzle", bg: "rain" },
    53: { label: "Moderate drizzle", icon: "cloud-drizzle", nightIcon: "cloud-drizzle", bg: "rain" },
    55: { label: "Dense drizzle", icon: "cloud-drizzle", nightIcon: "cloud-drizzle", bg: "rain" },
    56: { label: "Freezing drizzle", icon: "cloud-drizzle", nightIcon: "cloud-drizzle", bg: "rain" },
    57: { label: "Dense freezing drizzle", icon: "cloud-drizzle", nightIcon: "cloud-drizzle", bg: "rain" },
    61: { label: "Slight rain", icon: "cloud-rain", nightIcon: "cloud-rain", bg: "rain" },
    63: { label: "Moderate rain", icon: "cloud-rain", nightIcon: "cloud-rain", bg: "rain" },
    65: { label: "Heavy rain", icon: "cloud-rain", nightIcon: "cloud-rain", bg: "rain" },
    66: { label: "Freezing rain", icon: "cloud-rain", nightIcon: "cloud-rain", bg: "rain" },
    67: { label: "Heavy freezing rain", icon: "cloud-rain", nightIcon: "cloud-rain", bg: "rain" },
    71: { label: "Slight snow", icon: "snowflake", nightIcon: "snowflake", bg: "snow" },
    73: { label: "Moderate snow", icon: "snowflake", nightIcon: "snowflake", bg: "snow" },
    75: { label: "Heavy snow", icon: "snowflake", nightIcon: "snowflake", bg: "snow" },
    77: { label: "Snow grains", icon: "snowflake", nightIcon: "snowflake", bg: "snow" },
    80: { label: "Slight rain showers", icon: "cloud-rain", nightIcon: "cloud-rain", bg: "rain" },
    81: { label: "Moderate rain showers", icon: "cloud-rain", nightIcon: "cloud-rain", bg: "rain" },
    82: { label: "Violent rain showers", icon: "cloud-rain", nightIcon: "cloud-rain", bg: "rain" },
    85: { label: "Slight snow showers", icon: "cloud-snow", nightIcon: "cloud-snow", bg: "snow" },
    86: { label: "Heavy snow showers", icon: "cloud-snow", nightIcon: "cloud-snow", bg: "snow" },
    95: { label: "Thunderstorm", icon: "cloud-lightning", nightIcon: "cloud-lightning", bg: "thunder" },
    96: { label: "Thunderstorm with hail", icon: "cloud-lightning", nightIcon: "cloud-lightning", bg: "thunder" },
    99: { label: "Thunderstorm with heavy hail", icon: "cloud-lightning", nightIcon: "cloud-lightning", bg: "thunder" },
  };

  /* ========== State ========== */
  const state = {
    unit: "celsius",
    theme: "dark",
    location: null,
    weather: null,
    air: null,
    searchResults: [],
    searchIndex: -1,
    tempChart: null,
    precipChart: null,
    abortController: null,
  };

  /* ========== DOM ========== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const els = {
    html: document.documentElement,
    searchForm: $("#searchForm"),
    searchInput: $("#searchInput"),
    searchResults: $("#searchResults"),
    locationBtn: $("#locationBtn"),
    unitC: $("#unitC"),
    unitF: $("#unitF"),
    themeToggle: $("#themeToggle"),
    recentsBar: $("#recentsBar"),
    recentsList: $("#recentsList"),
    statusBanner: $("#statusBanner"),
    loader: $("#loader"),
    heroSkeleton: $("#heroSkeleton"),
    heroContent: $("#heroContent"),
    locationName: $("#locationName"),
    localDateTime: $("#localDateTime"),
    conditionText: $("#conditionText"),
    currentIcon: $("#currentIcon"),
    currentTemp: $("#currentTemp"),
    feelsLike: $("#feelsLike"),
    highLow: $("#highLow"),
    sunTimes: $("#sunTimes"),
    hourlyTrack: $("#hourlyTrack"),
    dailyList: $("#dailyList"),
    weatherEffects: $("#weatherEffects"),
    weatherSummary: $("#weatherSummary"),
    insightSunrise: $("#insightSunrise"),
    insightSunset: $("#insightSunset"),
    insightDaylight: $("#insightDaylight"),
    daylightFill: $("#daylightFill"),
    aqiValue: $("#aqiValue"),
    aqiLabel: $("#aqiLabel"),
    aqiDetail: $("#aqiDetail"),
    alertsBox: $("#alertsBox"),
    alertsList: $("#alertsList"),
    tempChart: $("#tempChart"),
    precipChart: $("#precipChart"),
    stats: {
      humidity: $("#statHumidity"),
      wind: $("#statWind"),
      uv: $("#statUv"),
      pressure: $("#statPressure"),
      visibility: $("#statVisibility"),
      clouds: $("#statClouds"),
      precip: $("#statPrecip"),
      dew: $("#statDew"),
    },
    hints: {
      humidity: $("#hintHumidity"),
      wind: $("#hintWind"),
      uv: $("#hintUv"),
      pressure: $("#hintPressure"),
      visibility: $("#hintVisibility"),
      clouds: $("#hintClouds"),
      precip: $("#hintPrecip"),
      dew: $("#hintDew"),
    },
  };

  /* ========== Utilities ========== */
  function refreshIcons() {
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  function setIcon(container, name) {
    container.innerHTML = `<i data-lucide="${name}"></i>`;
    refreshIcons(container);
  }

  function cToF(c) {
    return (c * 9) / 5 + 32;
  }

  function convertTemp(celsius) {
    if (celsius == null || Number.isNaN(celsius)) return null;
    return state.unit === "fahrenheit" ? cToF(celsius) : celsius;
  }

  function formatTemp(celsius, { rounded = true, withUnit = true } = {}) {
    const v = convertTemp(celsius);
    if (v == null) return "—";
    const n = rounded ? Math.round(v) : Math.round(v * 10) / 10;
    const unit = state.unit === "fahrenheit" ? "°F" : "°C";
    return withUnit ? `${n}°` : String(n);
  }

  function formatTempFull(celsius) {
    const v = convertTemp(celsius);
    if (v == null) return "—";
    const unit = state.unit === "fahrenheit" ? "°F" : "°C";
    return `${Math.round(v)}${unit}`;
  }

  function windDir(deg) {
    if (deg == null) return "";
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(deg / 45) % 8];
  }

  function uvHint(uv) {
    if (uv == null) return "";
    if (uv < 3) return "Low — little protection needed";
    if (uv < 6) return "Moderate — wear sunscreen";
    if (uv < 8) return "High — limit midday sun";
    if (uv < 11) return "Very high — take extra care";
    return "Extreme — avoid prolonged exposure";
  }

  function humidityHint(h) {
    if (h == null) return "";
    if (h < 30) return "Dry air";
    if (h < 60) return "Comfortable";
    if (h < 80) return "Somewhat humid";
    return "Very humid";
  }

  function pressureHint(p) {
    if (p == null) return "";
    if (p < 1000) return "Low pressure";
    if (p > 1025) return "High pressure";
    return "Normal range";
  }

  function aqiInfo(aqi) {
    if (aqi == null) return { label: "Unavailable", detail: "Air quality data is not available for this location.", color: "var(--text-muted)" };
    if (aqi <= 20) return { label: "Good", detail: "Air quality is satisfactory; little or no risk.", color: "var(--success)" };
    if (aqi <= 40) return { label: "Fair", detail: "Acceptable air quality for most people.", color: "#84cc16" };
    if (aqi <= 60) return { label: "Moderate", detail: "Sensitive individuals may notice mild effects.", color: "var(--warning)" };
    if (aqi <= 80) return { label: "Poor", detail: "Consider reducing outdoor activity if sensitive.", color: "#f97316" };
    if (aqi <= 100) return { label: "Very Poor", detail: "Health effects may be noticeable; limit outdoor exertion.", color: "var(--danger)" };
    return { label: "Hazardous", detail: "Avoid outdoor activity when possible.", color: "#b91c1c" };
  }

  function isDaytime(weather) {
    const cur = weather?.current;
    if (!cur) return true;
    if (typeof cur.is_day === "number") return cur.is_day === 1;
    return true;
  }

  function getWmo(code) {
    return WMO[code] || { label: "Unknown", icon: "cloud", nightIcon: "cloud", bg: "cloudy" };
  }

  function formatLocalTime(iso, timezone, options) {
    try {
      return new Intl.DateTimeFormat(undefined, { timeZone: timezone, ...options }).format(new Date(iso));
    } catch {
      return "—";
    }
  }

  function parseLocalParts(iso, timezone) {
    try {
      const d = new Date(iso);
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        hour12: false,
        weekday: "short",
        month: "short",
        day: "numeric",
      }).formatToParts(d);
      const get = (t) => parts.find((p) => p.type === t)?.value;
      return {
        hour: Number(get("hour") === "24" ? 0 : get("hour")),
        weekday: get("weekday"),
        month: get("month"),
        day: get("day"),
      };
    } catch {
      return { hour: 0, weekday: "", month: "", day: "" };
    }
  }

  function daylightDuration(sunriseIso, sunsetIso) {
    const ms = new Date(sunsetIso) - new Date(sunriseIso);
    if (!Number.isFinite(ms) || ms <= 0) return "—";
    const h = Math.floor(ms / 3600000);
    const m = Math.round((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  function showLoader(show) {
    els.loader.hidden = !show;
  }

  function showBanner(message, { type = "error", retry = null } = {}) {
    els.statusBanner.hidden = false;
    els.statusBanner.className = `status-banner${type === "info" ? " status-banner--info" : ""}`;
    els.statusBanner.innerHTML = "";
    const text = document.createElement("p");
    text.textContent = message;
    els.statusBanner.appendChild(text);
    if (retry) {
      const actions = document.createElement("div");
      actions.className = "status-banner__actions";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--primary";
      btn.textContent = "Retry";
      btn.addEventListener("click", retry);
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className = "btn btn--ghost";
      dismiss.textContent = "Dismiss";
      dismiss.addEventListener("click", hideBanner);
      actions.append(btn, dismiss);
      els.statusBanner.appendChild(actions);
    } else {
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className = "btn btn--ghost";
      dismiss.textContent = "Dismiss";
      dismiss.addEventListener("click", hideBanner);
      els.statusBanner.appendChild(dismiss);
    }
  }

  function hideBanner() {
    els.statusBanner.hidden = true;
    els.statusBanner.innerHTML = "";
  }

  /* ========== Local Storage ========== */
  function loadPrefs() {
    const unit = localStorage.getItem(STORAGE.unit);
    if (unit === "celsius" || unit === "fahrenheit") state.unit = unit;

    let theme = localStorage.getItem(STORAGE.theme);
    if (!theme) {
      theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    state.theme = theme === "light" ? "light" : "dark";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.body.classList.add("reduce-motion");
    }
  }

  function saveUnit() {
    localStorage.setItem(STORAGE.unit, state.unit);
  }

  function saveTheme() {
    localStorage.setItem(STORAGE.theme, state.theme);
  }

  function getRecents() {
    try {
      const raw = localStorage.getItem(STORAGE.recents);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function saveRecent(loc) {
    const entry = {
      id: loc.id,
      name: loc.name,
      country: loc.country || "",
      admin1: loc.admin1 || "",
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezone: loc.timezone,
    };
    let list = getRecents().filter((r) => r.id !== entry.id);
    list.unshift(entry);
    list = list.slice(0, MAX_RECENTS);
    localStorage.setItem(STORAGE.recents, JSON.stringify(list));
    renderRecents();
  }

  function renderRecents() {
    const list = getRecents();
    els.recentsList.innerHTML = "";
    if (!list.length) {
      els.recentsBar.hidden = true;
      return;
    }
    els.recentsBar.hidden = false;
    list.forEach((r) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "recent-chip";
      btn.textContent = r.country ? `${r.name}, ${r.country}` : r.name;
      btn.addEventListener("click", () => {
        loadWeatherForLocation(r);
      });
      els.recentsList.appendChild(btn);
    });
  }

  /* ========== Theme & Unit ========== */
  function applyTheme() {
    els.html.setAttribute("data-theme", state.theme);
    const next = state.theme === "dark" ? "light" : "dark";
    els.themeToggle.setAttribute("aria-label", `Switch to ${next} theme`);
    if (state.weather) updateCharts();
  }

  function applyUnitUI() {
    const isC = state.unit === "celsius";
    els.unitC.classList.toggle("is-active", isC);
    els.unitF.classList.toggle("is-active", !isC);
    els.unitC.setAttribute("aria-pressed", String(isC));
    els.unitF.setAttribute("aria-pressed", String(!isC));
  }

  function setUnit(unit) {
    if (unit !== "celsius" && unit !== "fahrenheit") return;
    state.unit = unit;
    saveUnit();
    applyUnitUI();
    if (state.weather) renderAll();
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveTheme();
    applyTheme();
  }

  /* ========== API ========== */
  async function fetchJson(url, signal) {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      if (res.status === 429) throw new Error("RATE_LIMIT");
      throw new Error(`HTTP_${res.status}`);
    }
    return res.json();
  }

  async function searchCities(query) {
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
    const data = await fetchJson(url);
    return data.results || [];
  }

  function forecastParams(lat, lon) {
    // Current endpoint supports a subset; UV / visibility / dew / precip % come from hourly
    const current = [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "rain",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(",");

    const hourly = [
      "temperature_2m",
      "precipitation_probability",
      "weather_code",
      "is_day",
      "relative_humidity_2m",
      "apparent_temperature",
      "uv_index",
      "visibility",
      "dew_point_2m",
      "cloud_cover",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(",");

    const daily = [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "sunrise",
      "sunset",
      "uv_index_max",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(",");

    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current,
      hourly,
      daily,
      timezone: "auto",
      forecast_days: "7",
    });
    return `${FORECAST_URL}?${params}`;
  }

  function enrichCurrentFromHourly(data) {
    if (!data?.current || !data?.hourly?.time?.length) return data;
    const idx = findCurrentHourIndex(data.hourly, data.timezone);
    const h = data.hourly;
    const cur = { ...data.current };

    const pick = (key) => {
      if (cur[key] == null && h[key] && h[key][idx] != null) {
        cur[key] = h[key][idx];
      }
    };

    pick("uv_index");
    pick("visibility");
    pick("dew_point_2m");
    pick("precipitation_probability");
    pick("relative_humidity_2m");
    pick("cloud_cover");
    pick("pressure_msl");
    pick("wind_speed_10m");
    pick("wind_direction_10m");

    if (cur.uv_index == null && data.daily?.uv_index_max?.[0] != null) {
      cur.uv_index = data.daily.uv_index_max[0];
    }

    return { ...data, current: cur };
  }

  async function fetchWeather(lat, lon, signal) {
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    const cached = weatherCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return { ...enrichCurrentFromHourly(cached.data), fromCache: true };
    }

    const data = enrichCurrentFromHourly(await fetchJson(forecastParams(lat, lon), signal));
    weatherCache.set(key, { ts: Date.now(), data });
    return { ...data, fromCache: false };
  }

  async function fetchAirQuality(lat, lon, signal) {
    try {
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        current: "european_aqi,us_aqi,pm2_5,pm10",
        timezone: "auto",
      });
      return await fetchJson(`${AIR_URL}?${params}`, signal);
    } catch {
      return null;
    }
  }

  /* ========== Background Effects ========== */
  function setWeatherBackground(code, isDay) {
    const info = getWmo(code);
    let bg = info.bg;
    if (!isDay && (bg === "clear" || bg === "cloudy")) bg = "night";

    document.body.classList.remove(
      "wx-clear", "wx-cloudy", "wx-rain", "wx-thunder", "wx-snow", "wx-fog", "wx-night"
    );
    document.body.classList.add(`wx-${bg}`);

    const effects = els.weatherEffects;
    effects.innerHTML = "";

    if (document.body.classList.contains("reduce-motion")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (bg === "rain" || bg === "thunder") {
      for (let i = 0; i < 40; i++) {
        const drop = document.createElement("div");
        drop.className = "rain-drop";
        drop.style.left = `${Math.random() * 100}%`;
        drop.style.animationDuration = `${0.5 + Math.random() * 0.7}s`;
        drop.style.animationDelay = `${Math.random() * 2}s`;
        drop.style.opacity = String(0.3 + Math.random() * 0.5);
        effects.appendChild(drop);
      }
    } else if (bg === "snow") {
      for (let i = 0; i < 30; i++) {
        const flake = document.createElement("div");
        flake.className = "snow-flake";
        flake.style.left = `${Math.random() * 100}%`;
        flake.style.width = flake.style.height = `${3 + Math.random() * 5}px`;
        flake.style.animationDuration = `${4 + Math.random() * 6}s`;
        flake.style.animationDelay = `${Math.random() * 4}s`;
        effects.appendChild(flake);
      }
    } else if (bg === "night") {
      for (let i = 0; i < 50; i++) {
        const star = document.createElement("div");
        star.className = "star";
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 60}%`;
        star.style.animationDuration = `${2 + Math.random() * 3}s`;
        star.style.animationDelay = `${Math.random() * 2}s`;
        effects.appendChild(star);
      }
    }
  }

  /* ========== Rendering ========== */
  function renderHero() {
    const { location, weather } = state;
    if (!location || !weather) return;

    const cur = weather.current;
    const daily = weather.daily;
    const tz = weather.timezone;
    const wmo = getWmo(cur.weather_code);
    const day = isDaytime(weather);
    const icon = day ? wmo.icon : wmo.nightIcon;

    const place = [location.name, location.admin1, location.country].filter(Boolean);
    // Avoid duplicating admin1 if same as name
    const unique = [...new Set(place)];
    els.locationName.textContent = unique.join(", ");

    const nowIso = cur.time;
    els.localDateTime.textContent = formatLocalTime(nowIso, tz, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    els.conditionText.textContent = wmo.label;
    setIcon(els.currentIcon, icon);
    els.currentTemp.textContent = formatTemp(cur.temperature_2m);
    els.feelsLike.textContent = `Feels like ${formatTempFull(cur.apparent_temperature)}`;

    const hi = daily.temperature_2m_max?.[0];
    const lo = daily.temperature_2m_min?.[0];
    els.highLow.textContent = `H: ${formatTemp(hi)} · L: ${formatTemp(lo)}`;

    const sunrise = daily.sunrise?.[0];
    const sunset = daily.sunset?.[0];
    const sr = formatLocalTime(sunrise, tz, { hour: "numeric", minute: "2-digit" });
    const ss = formatLocalTime(sunset, tz, { hour: "numeric", minute: "2-digit" });
    els.sunTimes.textContent = `Sunrise ${sr} · Sunset ${ss}`;

    setWeatherBackground(cur.weather_code, day);
  }

  function renderStats() {
    const cur = state.weather?.current;
    if (!cur) return;

    const h = cur.relative_humidity_2m;
    els.stats.humidity.textContent = h != null ? `${Math.round(h)}%` : "—";
    els.hints.humidity.textContent = humidityHint(h);

    const wind = cur.wind_speed_10m;
    const dir = windDir(cur.wind_direction_10m);
    els.stats.wind.textContent = wind != null ? `${Math.round(wind)} km/h` : "—";
    els.hints.wind.textContent = dir ? `From the ${dir}` : "";

    const uv = cur.uv_index;
    els.stats.uv.textContent = uv != null ? String(Math.round(uv * 10) / 10) : "—";
    els.hints.uv.textContent = uvHint(uv);

    const pressure = cur.pressure_msl ?? cur.surface_pressure;
    els.stats.pressure.textContent = pressure != null ? `${Math.round(pressure)} hPa` : "—";
    els.hints.pressure.textContent = pressureHint(pressure);

    const vis = cur.visibility;
    if (vis != null) {
      const km = vis / 1000;
      els.stats.visibility.textContent = km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
      els.hints.visibility.textContent = km >= 10 ? "Clear visibility" : km >= 5 ? "Moderate" : "Reduced";
    } else {
      els.stats.visibility.textContent = "—";
      els.hints.visibility.textContent = "";
    }

    const clouds = cur.cloud_cover;
    els.stats.clouds.textContent = clouds != null ? `${Math.round(clouds)}%` : "—";
    els.hints.clouds.textContent = clouds != null ? (clouds < 20 ? "Mostly clear" : clouds < 70 ? "Partly cloudy" : "Mostly cloudy") : "";

    const precipProb = cur.precipitation_probability;
    const precipAmt = cur.precipitation;
    if (precipProb != null) {
      els.stats.precip.textContent = `${Math.round(precipProb)}%`;
      els.hints.precip.textContent = precipAmt > 0 ? `${precipAmt} mm falling` : "Chance of precipitation";
    } else if (precipAmt != null) {
      els.stats.precip.textContent = `${precipAmt} mm`;
      els.hints.precip.textContent = precipAmt > 0 ? "Current precipitation" : "None currently";
    } else {
      els.stats.precip.textContent = "—";
      els.hints.precip.textContent = "";
    }

    const dew = cur.dew_point_2m;
    els.stats.dew.textContent = formatTempFull(dew);
    els.hints.dew.textContent = dew != null ? "Moisture in the air" : "";
  }

  function findCurrentHourIndex(hourly, timezone) {
    const times = hourly.time || [];
    const now = Date.now();
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(new Date(times[i]).getTime() - now);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return best;
  }

  function renderHourly() {
    const weather = state.weather;
    if (!weather?.hourly) return;

    const { hourly, timezone } = weather;
    const start = findCurrentHourIndex(hourly, timezone);
    const end = Math.min(start + 24, hourly.time.length);

    els.hourlyTrack.innerHTML = "";
    const frag = document.createDocumentFragment();

    for (let i = start; i < end; i++) {
      const item = document.createElement("div");
      item.className = "hourly-item" + (i === start ? " is-now" : "");
      item.setAttribute("role", "listitem");

      const parts = parseLocalParts(hourly.time[i], timezone);
      const hourLabel = i === start ? "Now" : formatLocalTime(hourly.time[i], timezone, { hour: "numeric" });

      const wmo = getWmo(hourly.weather_code[i]);
      const day = hourly.is_day?.[i] === 1;
      const icon = day ? wmo.icon : wmo.nightIcon;
      const precip = hourly.precipitation_probability?.[i];

      item.innerHTML = `
        <span class="hourly-item__hour">${hourLabel}</span>
        <span class="hourly-item__icon"><i data-lucide="${icon}"></i></span>
        <span class="hourly-item__temp">${formatTemp(hourly.temperature_2m[i])}</span>
        <span class="hourly-item__precip"><i data-lucide="droplet"></i> ${precip != null ? Math.round(precip) + "%" : "—"}</span>
      `;
      frag.appendChild(item);
    }

    els.hourlyTrack.appendChild(frag);
    refreshIcons(els.hourlyTrack);
  }

  function renderDaily() {
    const weather = state.weather;
    if (!weather?.daily) return;

    const { daily, timezone } = weather;
    const temps = [...(daily.temperature_2m_min || []), ...(daily.temperature_2m_max || [])].filter((n) => n != null);
    const globalMin = Math.min(...temps);
    const globalMax = Math.max(...temps);
    const span = globalMax - globalMin || 1;

    els.dailyList.innerHTML = "";
    const frag = document.createDocumentFragment();
    const count = Math.min(7, daily.time?.length || 0);

    for (let i = 0; i < count; i++) {
      const row = document.createElement("article");
      row.className = "daily-row";

      const dayName = i === 0 ? "Today" : formatLocalTime(daily.time[i], timezone, { weekday: "short" });
      const dateStr = formatLocalTime(daily.time[i], timezone, { month: "short", day: "numeric" });
      const wmo = getWmo(daily.weather_code[i]);
      const lo = daily.temperature_2m_min[i];
      const hi = daily.temperature_2m_max[i];
      const left = ((lo - globalMin) / span) * 100;
      const width = ((hi - lo) / span) * 100;
      const precip = daily.precipitation_probability_max?.[i];

      row.innerHTML = `
        <div class="daily-row__day">
          <span class="daily-row__day-name">${dayName}</span>
          <span class="daily-row__date">${dateStr}</span>
        </div>
        <div class="daily-row__icon"><i data-lucide="${wmo.icon}"></i></div>
        <div class="daily-row__condition">${wmo.label}</div>
        <div class="daily-row__temps">
          <span class="daily-row__low">${formatTemp(lo)}</span>
          <div class="temp-bar" aria-hidden="true">
            <div class="temp-bar__fill" style="left:${left}%;width:${Math.max(width, 4)}%"></div>
          </div>
          <span class="daily-row__high">${formatTemp(hi)}</span>
        </div>
        <div class="daily-row__precip">${precip != null ? Math.round(precip) + "%" : "—"}</div>
      `;
      frag.appendChild(row);
    }

    els.dailyList.appendChild(frag);
    refreshIcons(els.dailyList);
  }

  function renderInsights() {
    const weather = state.weather;
    if (!weather) return;

    const { daily, current, timezone } = weather;
    const sunrise = daily.sunrise?.[0];
    const sunset = daily.sunset?.[0];

    els.insightSunrise.textContent = formatLocalTime(sunrise, timezone, { hour: "numeric", minute: "2-digit" });
    els.insightSunset.textContent = formatLocalTime(sunset, timezone, { hour: "numeric", minute: "2-digit" });
    els.insightDaylight.textContent = daylightDuration(sunrise, sunset);

    // Daylight progress bar based on current local time
    if (sunrise && sunset) {
      const now = new Date(current.time).getTime();
      const sr = new Date(sunrise).getTime();
      const ss = new Date(sunset).getTime();
      let pct = 0;
      if (now <= sr) pct = 0;
      else if (now >= ss) pct = 100;
      else pct = ((now - sr) / (ss - sr)) * 100;
      els.daylightFill.style.width = `${pct}%`;
    }

    // Air quality
    const aqi = state.air?.current?.european_aqi ?? state.air?.current?.us_aqi ?? null;
    const info = aqiInfo(aqi);
    els.aqiValue.textContent = aqi != null ? String(Math.round(aqi)) : "—";
    els.aqiLabel.textContent = info.label;
    els.aqiLabel.style.color = info.color;
    els.aqiDetail.textContent = info.detail;

    // Summary from real data only
    els.weatherSummary.textContent = buildSummary();

    // Notices derived from measured extremes (not invented alerts)
    const notices = buildNotices();
    if (notices.length) {
      els.alertsBox.hidden = false;
      els.alertsList.innerHTML = notices.map((n) => `<li>${n}</li>`).join("");
    } else {
      els.alertsBox.hidden = true;
      els.alertsList.innerHTML = "";
    }
  }

  function buildSummary() {
    const { location, weather } = state;
    if (!location || !weather) return "Search for a city or use your location to see live weather.";

    const cur = weather.current;
    const daily = weather.daily;
    const wmo = getWmo(cur.weather_code);
    const hi = formatTempFull(daily.temperature_2m_max?.[0]);
    const lo = formatTempFull(daily.temperature_2m_min?.[0]);
    const precip = daily.precipitation_probability_max?.[0];
    const wind = cur.wind_speed_10m;

    let text = `Right now in ${location.name}, conditions are ${wmo.label.toLowerCase()} at ${formatTempFull(cur.temperature_2m)}`;
    text += ` (feels like ${formatTempFull(cur.apparent_temperature)}). `;
    text += `Today’s range is ${lo} to ${hi}. `;
    if (precip != null) text += `Peak chance of precipitation is ${Math.round(precip)}%. `;
    if (wind != null) text += `Winds around ${Math.round(wind)} km/h from the ${windDir(cur.wind_direction_10m)}.`;
    return text.trim();
  }

  function buildNotices() {
    const notices = [];
    const cur = state.weather?.current;
    const daily = state.weather?.daily;
    if (!cur) return notices;

    const code = cur.weather_code;
    if ([95, 96, 99].includes(code)) {
      notices.push("Thunderstorm conditions reported for this location.");
    }
    if ([65, 67, 82].includes(code)) {
      notices.push("Heavy rain is currently indicated by weather observations.");
    }
    if ([75, 86].includes(code)) {
      notices.push("Heavy snow conditions are indicated.");
    }
    const uv = cur.uv_index ?? daily?.uv_index_max?.[0];
    if (uv != null && uv >= 8) {
      notices.push(`Elevated UV index (${Math.round(uv * 10) / 10}) — protect skin and eyes outdoors.`);
    }
    const wind = cur.wind_speed_10m;
    const gust = cur.wind_gusts_10m;
    if ((gust != null && gust >= 70) || (wind != null && wind >= 50)) {
      notices.push("Strong winds detected — secure loose outdoor items.");
    }
    const aqi = state.air?.current?.european_aqi;
    if (aqi != null && aqi > 60) {
      notices.push("Air quality is poorer than usual for this area.");
    }
    return notices;
  }

  function chartColors() {
    const isDark = state.theme === "dark";
    return {
      text: isDark ? "#94a3b8" : "#64748b",
      grid: isDark ? "rgba(148,163,184,0.15)" : "rgba(71,85,105,0.12)",
      temp: isDark ? "#38bdf8" : "#0284c7",
      tempFill: isDark ? "rgba(56,189,248,0.2)" : "rgba(2,132,199,0.15)",
      precip: isDark ? "#818cf8" : "#6366f1",
    };
  }

  function destroyCharts() {
    if (state.tempChart) {
      state.tempChart.destroy();
      state.tempChart = null;
    }
    if (state.precipChart) {
      state.precipChart.destroy();
      state.precipChart = null;
    }
  }

  function getHourlySlice() {
    const weather = state.weather;
    if (!weather?.hourly) return null;
    const start = findCurrentHourIndex(weather.hourly, weather.timezone);
    const end = Math.min(start + 24, weather.hourly.time.length);
    const labels = [];
    const temps = [];
    const precip = [];
    for (let i = start; i < end; i++) {
      labels.push(
        i === start
          ? "Now"
          : formatLocalTime(weather.hourly.time[i], weather.timezone, { hour: "numeric" })
      );
      const t = convertTemp(weather.hourly.temperature_2m[i]);
      temps.push(t != null ? Math.round(t * 10) / 10 : null);
      precip.push(weather.hourly.precipitation_probability?.[i] ?? 0);
    }
    return { labels, temps, precip };
  }

  function updateCharts() {
    if (typeof Chart === "undefined") return;
    const slice = getHourlySlice();
    if (!slice) return;

    const colors = chartColors();
    const unit = state.unit === "fahrenheit" ? "°F" : "°C";

    destroyCharts();

    const commonOpts = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: state.theme === "dark" ? "#121c30" : "#fff",
          titleColor: state.theme === "dark" ? "#f1f5f9" : "#0f172a",
          bodyColor: state.theme === "dark" ? "#94a3b8" : "#475569",
          borderColor: state.theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
          borderWidth: 1,
          padding: 10,
          displayColors: false,
        },
      },
      scales: {
        x: {
          ticks: { color: colors.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          grid: { color: colors.grid, drawBorder: false },
        },
        y: {
          ticks: { color: colors.text },
          grid: { color: colors.grid, drawBorder: false },
        },
      },
    };

    state.tempChart = new Chart(els.tempChart, {
      type: "line",
      data: {
        labels: slice.labels,
        datasets: [
          {
            data: slice.temps,
            borderColor: colors.temp,
            backgroundColor: colors.tempFill,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
            borderWidth: 2.5,
          },
        ],
      },
      options: {
        ...commonOpts,
        plugins: {
          ...commonOpts.plugins,
          tooltip: {
            ...commonOpts.plugins.tooltip,
            callbacks: {
              label: (ctx) => `${ctx.parsed.y}${unit}`,
            },
          },
        },
        scales: {
          ...commonOpts.scales,
          y: {
            ...commonOpts.scales.y,
            ticks: {
              ...commonOpts.scales.y.ticks,
              callback: (v) => `${v}°`,
            },
          },
        },
      },
    });

    state.precipChart = new Chart(els.precipChart, {
      type: "bar",
      data: {
        labels: slice.labels,
        datasets: [
          {
            data: slice.precip,
            backgroundColor: colors.precip,
            borderRadius: 4,
            maxBarThickness: 18,
          },
        ],
      },
      options: {
        ...commonOpts,
        plugins: {
          ...commonOpts.plugins,
          tooltip: {
            ...commonOpts.plugins.tooltip,
            callbacks: {
              label: (ctx) => `${ctx.parsed.y}% chance`,
            },
          },
        },
        scales: {
          ...commonOpts.scales,
          y: {
            ...commonOpts.scales.y,
            min: 0,
            max: 100,
            ticks: {
              ...commonOpts.scales.y.ticks,
              callback: (v) => `${v}%`,
            },
          },
        },
      },
    });
  }

  function renderAll() {
    renderHero();
    renderStats();
    renderHourly();
    renderDaily();
    renderInsights();
    updateCharts();
  }

  /* ========== Load Weather ========== */
  async function loadWeatherForLocation(loc) {
    if (state.abortController) state.abortController.abort();
    state.abortController = new AbortController();
    const { signal } = state.abortController;

    hideBanner();
    showLoader(true);
    els.heroSkeleton.hidden = false;
    els.heroContent.style.opacity = "0.35";

    try {
      const [weather, air] = await Promise.all([
        fetchWeather(loc.latitude, loc.longitude, signal),
        fetchAirQuality(loc.latitude, loc.longitude, signal),
      ]);

      if (!weather?.current) {
        throw new Error("MISSING_DATA");
      }

      state.location = {
        id: loc.id ?? `${loc.latitude},${loc.longitude}`,
        name: loc.name,
        country: loc.country || "",
        admin1: loc.admin1 || "",
        latitude: loc.latitude,
        longitude: loc.longitude,
        timezone: weather.timezone || loc.timezone || "UTC",
      };
      state.weather = weather;
      state.air = air;

      saveRecent(state.location);
      renderAll();

      if (weather.fromCache) {
        // Soft notice — cached briefly for performance
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error(err);
      let msg = "Unable to load weather data. Please try again.";
      if (err.message === "RATE_LIMIT") msg = "Too many requests. Please wait a moment and try again.";
      if (err.message === "MISSING_DATA") msg = "Weather data was incomplete for this location.";
      if (!navigator.onLine) msg = "You appear to be offline. Check your connection and retry.";
      showBanner(msg, { retry: () => loadWeatherForLocation(loc) });
    } finally {
      showLoader(false);
      els.heroSkeleton.hidden = true;
      els.heroContent.style.opacity = "1";
    }
  }

  /* ========== Search UI ========== */
  let searchTimer = null;

  function hideSearchResults() {
    els.searchResults.hidden = true;
    els.searchResults.innerHTML = "";
    els.searchInput.setAttribute("aria-expanded", "false");
    state.searchResults = [];
    state.searchIndex = -1;
  }

  function renderSearchResults(results) {
    state.searchResults = results;
    state.searchIndex = -1;
    els.searchResults.innerHTML = "";

    if (!results.length) {
      const li = document.createElement("li");
      li.innerHTML = `<button type="button" class="search__result" disabled>No cities found</button>`;
      els.searchResults.appendChild(li);
      els.searchResults.hidden = false;
      els.searchInput.setAttribute("aria-expanded", "true");
      return;
    }

    results.forEach((r, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search__result";
      btn.id = `search-opt-${i}`;
      const meta = [r.admin1, r.country].filter(Boolean).join(", ");
      btn.innerHTML = `
        <span class="search__result-name">${r.name}</span>
        <span class="search__result-meta">${meta}${r.latitude != null ? ` · ${r.latitude.toFixed(2)}°, ${r.longitude.toFixed(2)}°` : ""}</span>
      `;
      btn.addEventListener("click", () => selectSearchResult(r));
      li.appendChild(btn);
      els.searchResults.appendChild(li);
    });

    els.searchResults.hidden = false;
    els.searchInput.setAttribute("aria-expanded", "true");
  }

  function selectSearchResult(r) {
    hideSearchResults();
    els.searchInput.value = "";
    loadWeatherForLocation({
      id: r.id,
      name: r.name,
      country: r.country || r.country_code || "",
      admin1: r.admin1 || "",
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone,
    });
  }

  function highlightSearchIndex() {
    $$(".search__result", els.searchResults).forEach((el, i) => {
      el.classList.toggle("is-active", i === state.searchIndex);
    });
  }

  async function onSearchInput() {
    const q = els.searchInput.value.trim();
    if (q.length < 2) {
      hideSearchResults();
      return;
    }
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      try {
        const results = await searchCities(q);
        if (els.searchInput.value.trim() !== q) return;
        renderSearchResults(results);
      } catch (err) {
        console.error(err);
        showBanner("City search failed. Check your connection and try again.");
      }
    }, 300);
  }

  async function onSearchSubmit(e) {
    e.preventDefault();
    const q = els.searchInput.value.trim();
    if (!q) {
      showBanner("Please enter a city name to search.", { type: "info" });
      els.searchInput.focus();
      return;
    }
    try {
      showLoader(true);
      const results = await searchCities(q);
      showLoader(false);
      if (!results.length) {
        showBanner(`No locations found for “${q}”. Try a different spelling or include the country.`, {
          type: "info",
        });
        hideSearchResults();
        return;
      }
      if (results.length === 1) {
        selectSearchResult(results[0]);
      } else {
        renderSearchResults(results);
        $$(".search__result", els.searchResults)[0]?.focus();
      }
    } catch (err) {
      showLoader(false);
      console.error(err);
      showBanner("Search failed. Please try again.", { retry: () => onSearchSubmit(e) });
    }
  }

  /* ========== Geolocation ========== */
  function useGeolocation() {
    if (!navigator.geolocation) {
      showBanner("Geolocation is not supported by your browser. Please search for a city instead.", {
        type: "info",
      });
      return;
    }

    showLoader(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          let name = "Current Location";
          let country = "";
          let admin1 = "";
          const id = `geo-${latitude.toFixed(3)}-${longitude.toFixed(3)}`;

          // BigDataCloud free reverse-geocode client (no API key, CORS-enabled)
          try {
            const revData = await fetchJson(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            name = revData.city || revData.locality || revData.principalSubdivision || "Current Location";
            country = revData.countryName || "";
            admin1 = revData.principalSubdivision || "";
          } catch {
            /* keep default label */
          }

          showLoader(false);
          await loadWeatherForLocation({
            id,
            name,
            country,
            admin1,
            latitude,
            longitude,
          });
        } catch (err) {
          showLoader(false);
          console.error(err);
          showBanner("Located you, but weather fetch failed.", {
            retry: () =>
              loadWeatherForLocation({
                id: `geo-${latitude.toFixed(3)}`,
                name: "Current Location",
                latitude,
                longitude,
              }),
          });
        }
      },
      (err) => {
        showLoader(false);
        let msg = "Unable to access your location. You can search for a city instead.";
        if (err.code === 1) msg = "Location permission denied. Search for a city to continue.";
        if (err.code === 2) msg = "Location unavailable. Please try searching for a city.";
        if (err.code === 3) msg = "Location request timed out. Please try again or search manually.";
        showBanner(msg, { type: "info" });
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  }

  /* ========== Events ========== */
  function bindEvents() {
    els.searchForm.addEventListener("submit", onSearchSubmit);
    els.searchInput.addEventListener("input", onSearchInput);
    els.searchInput.addEventListener("keydown", (e) => {
      const items = $$(".search__result", els.searchResults);
      if (els.searchResults.hidden || !items.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        state.searchIndex = Math.min(state.searchIndex + 1, items.length - 1);
        highlightSearchIndex();
        items[state.searchIndex]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        state.searchIndex = Math.max(state.searchIndex - 1, 0);
        highlightSearchIndex();
        items[state.searchIndex]?.focus();
      } else if (e.key === "Escape") {
        hideSearchResults();
      }
    });

    document.addEventListener("click", (e) => {
      if (!els.searchForm.contains(e.target)) hideSearchResults();
    });

    els.locationBtn.addEventListener("click", useGeolocation);
    els.unitC.addEventListener("click", () => setUnit("celsius"));
    els.unitF.addEventListener("click", () => setUnit("fahrenheit"));
    els.themeToggle.addEventListener("click", toggleTheme);

    window.addEventListener("resize", () => {
      if (state.tempChart) state.tempChart.resize();
      if (state.precipChart) state.precipChart.resize();
    });
  }

  /* ========== Init ========== */
  async function init() {
    loadPrefs();
    applyTheme();
    applyUnitUI();
    renderRecents();
    bindEvents();
    refreshIcons();

    // Default: try geolocation, else last recent, else London
    const recents = getRecents();
    if (recents.length) {
      await loadWeatherForLocation(recents[0]);
    } else {
      await loadWeatherForLocation({
        id: 2643743,
        name: "London",
        country: "United Kingdom",
        admin1: "England",
        latitude: 51.5072,
        longitude: -0.1276,
        timezone: "Europe/London",
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
