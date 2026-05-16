const express = require('express');
const router = express.Router();
require('dotenv').config();

const API_KEY = process.env.WEATHER_API_KEY;
const SearchHistory = require('../models/SearchHistory');
const Favourite = require('../models/Favourite');

function getWeatherClass(description, icon) {
    const d = description.toLowerCase();
    const isNight = icon && icon.endsWith('n');

    if (isNight) {
        if (d.includes('clear'))                                             return 'weather-clear-night';
        if (d.includes('cloud'))                                             return 'weather-clouds-night';
        if (d.includes('rain') || d.includes('drizzle'))                    return 'weather-rain-night';
        if (d.includes('snow'))                                              return 'weather-snow-night';
        if (d.includes('thunder') || d.includes('storm'))                   return 'weather-thunder-night';
        if (d.includes('haze') || d.includes('mist') || d.includes('fog')) return 'weather-haze-night';
        return 'weather-default-night';
    }

    if (d.includes('clear'))                                             return 'weather-clear-day';
    if (d.includes('cloud'))                                             return 'weather-clouds-day';
    if (d.includes('rain') || d.includes('drizzle'))                    return 'weather-rain-day';
    if (d.includes('snow'))                                              return 'weather-snow-day';
    if (d.includes('thunder') || d.includes('storm'))                   return 'weather-thunder-day';
    if (d.includes('haze') || d.includes('mist') || d.includes('fog')) return 'weather-haze-day';
    return 'weather-default-day';
}

function formatTime(unixTimestamp, timezoneOffset) {
    const date = new Date((unixTimestamp + timezoneOffset) * 1000);
    let hours = date.getUTCHours();
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}

async function getRecentSearches() {
    const recent = await SearchHistory.find()
        .sort({ searchedAt: -1 })
        .limit(20)
        .lean();

    const seen = new Set();
    const unique = [];
    for (const entry of recent) {
        const cityLower = entry.city.toLowerCase();
        if (!seen.has(cityLower)) {
            seen.add(cityLower);
            unique.push(entry);
        }
        if (unique.length === 5) break;
    }
    return unique;
}

async function getFavourites() {
    return await Favourite.find().sort({ savedAt: -1 }).lean();
}

async function buildWeatherData(currentData) {
    const description = currentData.weather[0].description;
    const icon = currentData.weather[0].icon;
    const timezoneOffset = currentData.timezone;

    const weather = {
        city: currentData.name,
        country: currentData.sys.country,
        temp: Math.round(currentData.main.temp),
        feels_like: Math.round(currentData.main.feels_like),
        humidity: currentData.main.humidity,
        description,
        icon,
        wind: currentData.wind.speed,
        sunrise: formatTime(currentData.sys.sunrise, timezoneOffset),
        sunset: formatTime(currentData.sys.sunset, timezoneOffset),
    };

    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${currentData.name}&appid=${API_KEY}&units=metric`;
    const forecastRes = await fetch(forecastUrl);
    const forecastData = await forecastRes.json();

    const forecast = forecastData.list
        .filter(entry => entry.dt_txt.includes('12:00:00'))
        .map(entry => ({
            date: new Date(entry.dt_txt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            temp: Math.round(entry.main.temp),
            description: entry.weather[0].description,
            icon: entry.weather[0].icon,
            humidity: entry.main.humidity,
        }));

    const hourly = forecastData.list.slice(0, 8).map(entry => ({
        time: formatTime(entry.dt, timezoneOffset),
        temp: Math.round(entry.main.temp),
        icon: entry.weather[0].icon,
        description: entry.weather[0].description,
    }));

    const bgClass = getWeatherClass(description, icon);

    return { weather, forecast, hourly, bgClass };
}

router.get('/', (req, res) => {
    res.render('home');
});

router.get('/about', (req, res) => res.render('about'));

router.get('/weather', async (req, res) => {
    const [recentSearches, favourites] = await Promise.all([getRecentSearches(), getFavourites()]);
    res.render('weather', { weather: null, forecast: null, hourly: null, error: null, bgClass: 'weather-default-day', recentSearches, favourites });
});

router.post('/weather', async (req, res) => {
    const city = req.body.city;
    const [recentSearches, favourites] = await Promise.all([getRecentSearches(), getFavourites()]);

    if (!city) {
        return res.render('weather', { weather: null, forecast: null, hourly: null, error: 'Please enter a city name.', bgClass: 'weather-default-day', recentSearches, favourites });
    }

    try {
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
        const currentRes = await fetch(currentUrl);
        const currentData = await currentRes.json();

        if (currentData.cod !== 200) {
            return res.render('weather', { weather: null, forecast: null, hourly: null, error: `City "${city}" not found. Please try again.`, bgClass: 'weather-default-day', recentSearches, favourites });
        }

        await SearchHistory.create({ city: currentData.name });

        const { weather, forecast, hourly, bgClass } = await buildWeatherData(currentData);
        const isFavourite = await Favourite.findOne({ city: weather.city });

        const updatedFavourites = await getFavourites();
        res.render('weather', { weather, forecast, hourly, error: null, bgClass, recentSearches, favourites: updatedFavourites, isFavourite: !!isFavourite });

    } catch (err) {
        console.error(err);
        res.render('weather', { weather: null, forecast: null, hourly: null, error: 'Something went wrong. Please try again.', bgClass: 'weather-default-day', recentSearches, favourites });
    }
});

router.get('/weather/location', async (req, res) => {
    const { lat, lon } = req.query;
    const [recentSearches, favourites] = await Promise.all([getRecentSearches(), getFavourites()]);

    if (!lat || !lon) {
        return res.render('weather', { weather: null, forecast: null, hourly: null, error: 'Could not get location.', bgClass: 'weather-default-day', recentSearches, favourites });
    }

    try {
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
        const currentRes = await fetch(currentUrl);
        const currentData = await currentRes.json();

        if (currentData.cod !== 200) {
            return res.render('weather', { weather: null, forecast: null, hourly: null, error: 'Could not fetch weather for your location.', bgClass: 'weather-default-day', recentSearches, favourites });
        }

        await SearchHistory.create({ city: currentData.name });

        const { weather, forecast, hourly, bgClass } = await buildWeatherData(currentData);
        const isFavourite = await Favourite.findOne({ city: weather.city });

        const updatedFavourites = await getFavourites();
        res.render('weather', { weather, forecast, hourly, error: null, bgClass, recentSearches, favourites: updatedFavourites, isFavourite: !!isFavourite });

    } catch (err) {
        console.error(err);
        res.render('weather', { weather: null, forecast: null, hourly: null, error: 'Something went wrong. Please try again.', bgClass: 'weather-default-day', recentSearches, favourites });
    }
});

router.post('/weather/favourite', async (req, res) => {
    const { city } = req.body;
    try {
        await Favourite.findOneAndUpdate(
            { city },
            { city },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error('Favourite save error:', err);
    }
    res.redirect(`/weather?saved=${encodeURIComponent(city)}`);
});

router.post('/weather/unfavourite', async (req, res) => {
    const { city } = req.body;
    try {
        await Favourite.deleteOne({ city });
    } catch (err) {
        console.error('Unfavourite error:', err);
    }
    res.redirect(`/weather?saved=${encodeURIComponent(city)}`);
});

router.get('/weather', async (req, res) => {
    const [recentSearches, favourites] = await Promise.all([getRecentSearches(), getFavourites()]);
    res.render('weather', { weather: null, forecast: null, hourly: null, error: null, bgClass: 'weather-default-day', recentSearches, favourites });
});

module.exports = router;
