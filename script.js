// Put your API key here
const apiKey = "eaeee67b6c878efd5f4470e4f817eaa4";

// DOM refs
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const currentWeatherEl = document.getElementById("currentWeather");
const forecastEl = document.getElementById("forecast");
const forecastTitle = document.querySelector(".forecast-title");

// Helper: show element with fade animation
function showElement(el) {
  if (el.classList.contains("hidden")) el.classList.remove("hidden");
  el.classList.add("show");
  el.classList.remove("fade");
  // ensure reflow to trigger transition if needed
  void el.offsetWidth;
  el.classList.add("fade", "show");
}

// Helper: hide element
function hideElement(el) {
  el.classList.remove("show");
  el.classList.add("hidden");
}

// Attach event listener (works even if script loads before DOM)
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (!city) {
    alert("Please enter a city name.");
    return;
  }
  fetchWeather(city);
});

// Also allow Enter key from input
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchBtn.click();
  }
});

async function fetchWeather(city) {
  // Clear previous UI
  currentWeatherEl.innerHTML = "";
  forecastEl.innerHTML = "";
  forecastTitle.classList.add("hidden");
  hideElement(currentWeatherEl);
  hideElement(forecastEl);

  // Show a temporary loading state
  currentWeatherEl.innerHTML = `<p>Loading weather for <strong>${escapeHtml(city)}</strong>…</p>`;
  if (currentWeatherEl.classList.contains("hidden")) currentWeatherEl.classList.remove("hidden");
  currentWeatherEl.classList.add("show");

  const weatherURL = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
  const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

  try {
    const [wRes, fRes] = await Promise.all([fetch(weatherURL), fetch(forecastURL)]);
    const weatherData = await wRes.json();
    const forecastData = await fRes.json();

    if (weatherData.cod && weatherData.cod !== 200) {
      throw new Error(weatherData.message || "Weather data error");
    }
    if (forecastData.cod && forecastData.cod !== "200") {
      throw new Error(forecastData.message || "Forecast data error");
    }

    displayCurrentWeather(weatherData);
    displayForecast(forecastData);
  } catch (err) {
    currentWeatherEl.innerHTML = `<p>Error: ${escapeHtml(err.message || "Unable to fetch")}</p>`;
    console.error(err);
  }
}

function displayCurrentWeather(data) {
  const city = data.name || "Unknown";
  const temp = Math.round(data.main?.temp);
  const description = data.weather?.[0]?.description || "";
  const humidity = data.main?.humidity;
  const wind = data.wind?.speed;
  const icon = data.weather?.[0]?.icon;

  const iconUrl = icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : "";

  currentWeatherEl.innerHTML = `
    <h2>${escapeHtml(city)}</h2>
    ${iconUrl ? `<img src="${iconUrl}" alt="${escapeHtml(description)}">` : ""}
    <p><strong>${temp ?? "N/A"}°C</strong></p>
    <p style="text-transform:capitalize">${escapeHtml(description)}</p>
    <p>Humidity: ${humidity ?? "N/A"}%</p>
    <p>Wind: ${wind ?? "N/A"} m/s</p>
  `;

  // show with animation class
  currentWeatherEl.classList.remove("hidden");
  currentWeatherEl.classList.add("show");
}

function displayForecast(data) {
  // Get 5 items at 12:00 each day (API returns 3-hour intervals)
  const list = data.list || [];
  const daily = list.filter(item => item.dt_txt && item.dt_txt.includes("12:00:00"));

  // if forecast length < 5, fall back to sampling every 8 items
  const samples = (daily.length >= 5) ? daily.slice(0,5) : list.filter((_,i)=>i%8===0).slice(0,5);

  forecastEl.innerHTML = "";
  samples.forEach((day, idx) => {
    const date = new Date(day.dt_txt);
    const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
    const temp = Math.round(day.main.temp);
    const desc = day.weather?.[0]?.description || "";
    const icon = day.weather?.[0]?.icon;
    const iconUrl = icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : "";

    const card = document.createElement("div");
    card.className = "forecast-card";
    // stagger animation using inline delay
    card.style.animationDelay = `${idx * 120}ms`;

    card.innerHTML = `
      <h4>${escapeHtml(weekday)}</h4>
      ${iconUrl ? `<img src="${iconUrl}" alt="${escapeHtml(desc)}">` : ""}
      <p><strong>${temp}°C</strong></p>
      <p style="text-transform:capitalize">${escapeHtml(desc)}</p>
    `;
    forecastEl.appendChild(card);
  });

  // show forecast and title
  forecastTitle.classList.remove("hidden");
  forecastTitle.classList.add("show");
  forecastEl.classList.remove("hidden");
  forecastEl.classList.add("show");
}

// Very small helper to avoid basic XSS when inserting strings
function escapeHtml(unsafe) {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
