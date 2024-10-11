import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { Sun, Cloud, CloudRain, Thermometer, Search, Wind, Droplets } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}

const weatherCodes: { [key: number]: string } = {
  0: '快晴',
  1: 'ほぼ晴れ',
  2: '一部曇り',
  3: '曇り',
  45: '霧',
  48: '霧氷',
  51: '軽い霧雨',
  53: '霧雨',
  55: '強い霧雨',
  61: '小雨',
  63: '雨',
  65: '大雨',
  71: '小雪',
  73: '雪',
  75: '大雪',
  95: '雷雨',
};

function getClothingAdvice(temperature: number): string {
  if (temperature < 5) {
    return '厚手のコート、マフラー、手袋を忘れずに！'
  } else if (temperature < 10) {
    return 'コートと暖かいセーターがおすすめです。'
  } else if (temperature < 15) {
    return 'ジャケットや軽めのコートが適しています。'
  } else if (temperature < 20) {
    return '長袖シャツやカーディガンがちょうどいいでしょう。'
  } else if (temperature < 25) {
    return '半袖シャツと薄手の上着があれば快適です。'
  } else {
    return '涼しい服装で、日よけ対策もお忘れなく！'
  }
}

function App() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [city, setCity] = useState('東京')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6895, 139.6917]) // Tokyo coordinates

  useEffect(() => {
    fetchWeather(city)
  }, [])

  const fetchWeather = async (searchCity: string) => {
    setLoading(true)
    setError(null)
    try {
      const encodedCity = encodeURIComponent(searchCity)
      const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodedCity}&count=1&language=ja&format=json`)
      if (!geoResponse.ok) {
        throw new Error(`位置情報の取得エラー! ステータス: ${geoResponse.status}`)
      }
      const geoData = await geoResponse.json()
      if (geoData.results && geoData.results.length > 0) {
        const { latitude, longitude, name } = geoData.results[0]
        setMapCenter([latitude, longitude])
        await fetchWeatherByCoordinates(latitude, longitude)
        setCity(name)
      } else {
        throw new Error('都市が見つかりません')
      }
    } catch (error) {
      console.error('天気データの取得中にエラーが発生しました:', error)
      if (error instanceof Error) {
        setError(`エラー: ${error.message}`)
      } else {
        setError('天気データの取得に失敗しました。')
      }
      setWeather(null)
    }
    setLoading(false)
  }

  const fetchWeatherByCoordinates = async (latitude: number, longitude: number) => {
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia/Tokyo`
    )
    if (!weatherResponse.ok) {
      throw new Error(`天気情報の取得エラー! ステータス: ${weatherResponse.status}`)
    }
    const weatherData = await weatherResponse.json()
    setWeather(weatherData)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    fetchWeather(city)
  }

  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) {
      return <Sun className="w-16 h-16 text-yellow-400" />
    } else if (code >= 2 && code <= 48) {
      return <Cloud className="w-16 h-16 text-gray-400" />
    } else if (code >= 51 && code <= 67) {
      return <CloudRain className="w-16 h-16 text-blue-400" />
    } else {
      return <Thermometer className="w-16 h-16 text-red-400" />
    }
  }

  function MapEvents() {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng
        await fetchWeatherByCoordinates(lat, lng)
        setCity(`緯度: ${lat.toFixed(4)}, 経度: ${lng.toFixed(4)}`)
      },
    })
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-5xl w-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">天気検索</h1>
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="都市名を入力"
              className="flex-grow px-4 py-2 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 transition duration-300 ease-in-out"
            >
              <Search className="w-6 h-6" />
            </button>
          </div>
        </form>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/3 h-64 lg:h-auto">
            <MapContainer center={mapCenter} zoom={10} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapEvents />
            </MapContainer>
          </div>

          <div className="w-full lg:w-2/3">
            {loading && <p className="text-center">読み込み中...</p>}
            {error && <p className="text-center text-red-500">{error}</p>}
            
            {weather && (
              <div className="text-center bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-lg shadow-md">
                <h2 className="text-3xl font-semibold mb-4">{city}</h2>
                <div className="flex justify-center mb-4">
                  {getWeatherIcon(weather.current.weather_code)}
                </div>
                <p className="text-5xl font-bold mb-2">{Math.round(weather.current.temperature_2m)}°C</p>
                <p className="text-2xl mb-4">{weatherCodes[weather.current.weather_code]}</p>
                <div className="flex justify-center space-x-6 mb-6">
                  <div className="flex items-center">
                    <Droplets className="w-6 h-6 mr-2 text-blue-500" />
                    <p className="text-lg">湿度: {weather.current.relative_humidity_2m}%</p>
                  </div>
                  <div className="flex items-center">
                    <Wind className="w-6 h-6 mr-2 text-gray-500" />
                    <p className="text-lg">風速: {weather.current.wind_speed_10m} km/h</p>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-yellow-100 rounded-lg">
                  <p className="text-lg font-medium text-gray-800">
                    {getClothingAdvice(weather.current.temperature_2m)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App