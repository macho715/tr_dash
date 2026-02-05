# Weather Forecast 실시간 업데이트 구현 계획

> **작성일**: 2026-02-04  
> **우선순위**: P2 (개선 사항)  
> **예상 시간**: 2-3시간  
> **기반**: Phase 1-4 Weather Delay Preview 완료

---

## 📋 Executive Summary

| 항목 | 내용 |
|-----|------|
| **목표** | 정적 JSON에서 실시간 Weather API 연동으로 업그레이드 |
| **비즈니스 가치** | 최신 기상 데이터 자동 반영 → 의사결정 정확도 향상 |
| **권장 접근** | **Hybrid (API + Static Fallback)** |
| **예상 시간** | 2-3시간 (API 통합 + 캐싱 + 테스트) |
| **배포 영향** | 무중단 (기존 인터페이스 유지) |

---

## 🎯 기술 접근 비교

### Option A: PDF Parsing 📄

**Pros:**
- ✅ 외부 의존성 없음
- ✅ 비용 0원
- ✅ 기존 `files/weather/` PDF 활용 가능

**Cons:**
- ❌ PDF 형식 변경 시 파싱 실패 위험
- ❌ 정규식 유지보수 복잡
- ❌ 실시간성 낮음 (수동 업로드 필요)

**구현 복잡도:** Medium-High  
**Libraries:** `pdf-parse` (500KB), `pdfjs-dist` (2MB)

```typescript
// 예상 구현
async function parseWeatherPDF(pdfPath: string): Promise<WeatherForecastData> {
  const dataBuffer = fs.readFileSync(pdfPath)
  const data = await pdf(dataBuffer)
  const text = data.text
  
  // 정규식으로 Hs, Wind 추출
  const hsMatch = text.match(/Hs[:\s]+(\d+\.?\d*)\s*m/)
  const windMatch = text.match(/Wind[:\s]+(\d+)\s*kt/)
  
  return normalizeWeatherForecast({ ... })
}
```

---

### Option B: API Integration 🌐

**Pros:**
- ✅ 표준화된 포맷 (JSON)
- ✅ 실시간 업데이트 자동화
- ✅ 신뢰성 높음 (99.9% uptime)
- ✅ 다양한 데이터 (forecast, historical, alerts)

**Cons:**
- ❌ API 비용 발생 (Free tier 제한)
- ❌ Rate limit 관리 필요
- ❌ 외부 의존성 (API 장애 시 영향)

**구현 복잡도:** Low-Medium  
**Providers:**
- **OpenWeatherMap**: Free 1,000 calls/day, Marine Weather API
- **WeatherAPI.com**: Free 1M calls/month
- **NOAA Marine**: Free, US Government data

```typescript
// 예상 구현
async function fetchWeatherAPI(): Promise<WeatherForecastData> {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/marine?` +
    `lat=24.5&lon=54.4&appid=${API_KEY}`
  )
  const data = await response.json()
  
  return normalizeWeatherForecast({
    updatedAt: new Date().toISOString(),
    location: "Arabian Gulf",
    series: data.list.map(point => ({
      ts: point.dt_txt,
      hs_m: point.waves?.height,
      wind_kt: point.wind.speed * 1.94384, // m/s → knots
      wind_gust_kt: point.wind.gust * 1.94384
    }))
  })
}
```

---

### Option C: Hybrid (권장 ⭐)

**Pros:**
- ✅ API 우선 (실시간성)
- ✅ Static JSON fallback (안정성)
- ✅ 무중단 운영 보장
- ✅ 점진적 전환 가능

**Cons:**
- ⚠️ 두 시스템 유지보수
- ⚠️ 복잡도 약간 증가

**구현 복잡도:** Medium  
**권장 이유:**
1. **무중단 보장**: API 장애 시에도 Static fallback
2. **점진적 전환**: API 테스트 후 완전 전환 가능
3. **운영 안정성**: 기존 Phase 1-4 기능 영향 0%

```typescript
// Hybrid 접근
export async function getWeatherForecast(): Promise<WeatherForecastData> {
  try {
    // 1. Try API (실시간)
    const apiData = await fetchWeatherAPI()
    if (isValid(apiData)) return apiData
  } catch (error) {
    console.warn("Weather API failed, falling back to static", error)
  }
  
  // 2. Fallback to static JSON
  return normalizeWeatherForecast(weatherForecastRaw)
}
```

---

## 🏗️ Architecture Design

### 파일 구조
```
lib/weather/
  ├── weather-service.ts          (기존 - 인터페이스 유지)
  ├── weather-fetch.ts             (신규 - 데이터 fetching)
  ├── weather-api-client.ts        (신규 - API 클라이언트)
  ├── weather-cache.ts             (신규 - 캐싱 레이어)
  └── __tests__/
      ├── weather-fetch.test.ts    (신규)
      └── weather-cache.test.ts    (신규)

app/api/weather/
  ├── route.ts                     (신규 - API 엔드포인트)
  └── cron/
      └── route.ts                 (신규 - Vercel Cron)

data/schedule/
  ├── weather_forecast.json        (기존 - fallback용 유지)
  └── weather_limits.json          (기존 - 유지)
```

### 데이터 흐름
```
┌─────────────────┐
│ Vercel Cron     │ (매 6시간)
│ /api/weather/   │
│ cron/route.ts   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ weather-fetch   │ → External API
│ .ts             │   (OpenWeatherMap)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ weather-cache   │ → Vercel KV
│ .ts             │   (6 hours TTL)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ weather-service │ → App (Phase 1-4)
│ .ts (기존)      │   (Ghost Bars, Alerts)
└─────────────────┘
         ▲
         │ (fallback)
         │
┌─────────────────┐
│ Static JSON     │
│ (fallback)      │
└─────────────────┘
```

---

## 📊 Phase Breakdown

### Phase 1: API Client & Fetching (1-1.5h)

#### 1.1 weather-api-client.ts
```typescript
// lib/weather/weather-api-client.ts
export interface WeatherAPIConfig {
  provider: "openweathermap" | "weatherapi" | "noaa"
  apiKey?: string
  location: { lat: number; lon: number } // Arabian Gulf: 24.5, 54.4
}

export async function fetchWeatherFromAPI(
  config: WeatherAPIConfig
): Promise<WeatherForecastRaw> {
  const { provider, apiKey, location } = config
  
  switch (provider) {
    case "openweathermap":
      return fetchOpenWeatherMap(location, apiKey!)
    case "weatherapi":
      return fetchWeatherAPI(location, apiKey!)
    case "noaa":
      return fetchNOAA(location) // Free, no key
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

async function fetchOpenWeatherMap(
  location: { lat: number; lon: number },
  apiKey: string
): Promise<WeatherForecastRaw> {
  const url = new URL("https://api.openweathermap.org/data/2.5/forecast")
  url.searchParams.set("lat", location.lat.toString())
  url.searchParams.set("lon", location.lon.toString())
  url.searchParams.set("appid", apiKey)
  url.searchParams.set("units", "metric")
  
  const response = await fetch(url.toString(), {
    headers: { "User-Agent": "TR-Dashboard/1.0" },
    next: { revalidate: 21600 }, // 6 hours
  })
  
  if (!response.ok) {
    throw new Error(`OpenWeatherMap API error: ${response.status}`)
  }
  
  const data = await response.json()
  
  // Transform to WeatherForecastRaw format
  return {
    updatedAt: new Date().toISOString(),
    timezone: "UTC",
    location: "Arabian Gulf",
    series: data.list.map((point: any) => ({
      ts: new Date(point.dt * 1000).toISOString(),
      hs_m: point.waves?.height ?? null, // Requires Marine API
      wind_kt: Math.round(point.wind.speed * 1.94384), // m/s → knots
      wind_gust_kt: point.wind.gust
        ? Math.round(point.wind.gust * 1.94384)
        : null,
    })),
  }
}
```

**환경 변수:**
```bash
# .env.local
WEATHER_API_PROVIDER=openweathermap
OPENWEATHERMAP_API_KEY=your_api_key_here
WEATHER_LOCATION_LAT=24.5
WEATHER_LOCATION_LON=54.4
```

---

#### 1.2 weather-fetch.ts (Hybrid Logic)
```typescript
// lib/weather/weather-fetch.ts
import { fetchWeatherFromAPI } from "./weather-api-client"
import { normalizeWeatherForecast } from "./weather-service"
import weatherForecastRaw from "../../data/schedule/weather_forecast.json"

export async function getWeatherForecast(): Promise<WeatherForecastData> {
  // Try cache first (implemented in Phase 2)
  const cached = await getWeatherFromCache()
  if (cached) return cached
  
  // Try API
  try {
    const apiConfig: WeatherAPIConfig = {
      provider: process.env.WEATHER_API_PROVIDER as any || "openweathermap",
      apiKey: process.env.OPENWEATHERMAP_API_KEY,
      location: {
        lat: Number(process.env.WEATHER_LOCATION_LAT) || 24.5,
        lon: Number(process.env.WEATHER_LOCATION_LON) || 54.4,
      },
    }
    
    const rawData = await fetchWeatherFromAPI(apiConfig)
    const normalized = normalizeWeatherForecast(rawData)
    
    // Validate data quality
    if (normalized.series.length === 0) {
      throw new Error("Empty forecast data")
    }
    
    // Cache for next time (Phase 2)
    await setWeatherCache(normalized)
    
    return normalized
  } catch (error) {
    console.warn("Weather API fetch failed, using static fallback:", error)
    
    // Fallback to static JSON
    return normalizeWeatherForecast(weatherForecastRaw as any)
  }
}
```

---

### Phase 2: Caching & API Layer (0.5-1h)

#### 2.1 weather-cache.ts (Vercel KV)
```typescript
// lib/weather/weather-cache.ts
import { kv } from "@vercel/kv"
import type { WeatherForecastData } from "./weather-service"

const CACHE_KEY = "weather:forecast:arabian_gulf"
const CACHE_TTL = 6 * 60 * 60 // 6 hours in seconds

export async function getWeatherFromCache(): Promise<WeatherForecastData | null> {
  try {
    const cached = await kv.get<WeatherForecastData>(CACHE_KEY)
    
    if (!cached) return null
    
    // Check if cache is stale (older than TTL)
    const age = Date.now() - new Date(cached.updatedAt).getTime()
    if (age > CACHE_TTL * 1000) {
      return null
    }
    
    return cached
  } catch (error) {
    console.error("Cache read error:", error)
    return null
  }
}

export async function setWeatherCache(data: WeatherForecastData): Promise<void> {
  try {
    await kv.set(CACHE_KEY, data, { ex: CACHE_TTL })
  } catch (error) {
    console.error("Cache write error:", error)
    // Non-critical, don't throw
  }
}

export async function clearWeatherCache(): Promise<void> {
  await kv.del(CACHE_KEY)
}
```

**Vercel KV Setup:**
```bash
# Vercel Dashboard → Storage → Create KV Database
# Auto-generates: KV_REST_API_URL, KV_REST_API_TOKEN
```

---

#### 2.2 app/api/weather/route.ts
```typescript
// app/api/weather/route.ts
import { NextResponse } from "next/server"
import { getWeatherForecast } from "@/lib/weather/weather-fetch"

export const runtime = "edge"
export const revalidate = 21600 // 6 hours

export async function GET() {
  try {
    const forecast = await getWeatherForecast()
    
    return NextResponse.json({
      success: true,
      data: forecast,
      cachedAt: forecast.updatedAt,
    })
  } catch (error) {
    console.error("Weather API route error:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
```

---

#### 2.3 app/api/weather/cron/route.ts (Vercel Cron)
```typescript
// app/api/weather/cron/route.ts
import { NextResponse } from "next/server"
import { getWeatherForecast } from "@/lib/weather/weather-fetch"
import { clearWeatherCache } from "@/lib/weather/weather-cache"

export const runtime = "edge"

export async function GET(request: Request) {
  // Verify cron secret (security)
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  try {
    // Clear cache to force fresh fetch
    await clearWeatherCache()
    
    // Fetch and cache new data
    const forecast = await getWeatherForecast()
    
    return NextResponse.json({
      success: true,
      message: "Weather forecast updated",
      updatedAt: forecast.updatedAt,
      dataPoints: forecast.series.length,
    })
  } catch (error) {
    console.error("Weather cron job failed:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
```

**vercel.json (Cron 설정):**
```json
{
  "crons": [
    {
      "path": "/api/weather/cron",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**환경 변수:**
```bash
CRON_SECRET=generate_random_secret_here
```

---

### Phase 3: Integration & Testing (0.5-1h)

#### 3.1 weather-service.ts 업데이트
```typescript
// lib/weather/weather-service.ts
import weatherForecastRaw from "../../data/schedule/weather_forecast.json"
import weatherLimitsRaw from "../../data/schedule/weather_limits.json"

// ... existing interfaces and functions ...

// Option 1: Keep static exports (backward compatible)
export const weatherForecast = normalizeWeatherForecast(
  weatherForecastRaw as WeatherForecastRaw
)
export const weatherLimits = normalizeWeatherLimits(
  weatherLimitsRaw as WeatherLimitsRaw
)

// Option 2: Add async function (recommended)
export async function getWeatherForecastLive(): Promise<WeatherForecastData> {
  // Dynamic import to avoid circular dependency
  const { getWeatherForecast } = await import("./weather-fetch")
  return getWeatherForecast()
}
```

---

#### 3.2 page.tsx 업데이트 (Client-side)
```typescript
// app/page.tsx
import { weatherLimits } from "@/lib/weather/weather-service"
// Remove: import { weatherForecast } from "@/lib/weather/weather-service"

export default function Page() {
  // Add state for dynamic weather
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecastData | null>(null)
  
  // Fetch weather on mount
  useEffect(() => {
    async function fetchWeather() {
      try {
        const response = await fetch("/api/weather")
        const json = await response.json()
        if (json.success) {
          setWeatherForecast(json.data)
        }
      } catch (error) {
        console.error("Failed to fetch weather:", error)
        // Fallback to static (already imported in weather-service)
      }
    }
    
    fetchWeather()
    
    // Refresh every 6 hours
    const interval = setInterval(fetchWeather, 6 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])
  
  // Use weatherForecast (null check)
  const weatherPreview = useMemo(() => {
    if (!weatherForecast) return null
    // ... existing logic
  }, [weatherForecast, ...])
  
  // ... rest of component
}
```

---

#### 3.3 Unit Tests
```typescript
// lib/weather/__tests__/weather-fetch.test.ts
import { describe, it, expect, vi } from "vitest"
import { getWeatherForecast } from "@/lib/weather/weather-fetch"

describe("weather-fetch", () => {
  it("fetches from API successfully", async () => {
    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          list: [
            {
              dt: 1707091200,
              wind: { speed: 10, gust: 15 },
              waves: { height: 2.5 },
            },
          ],
        }),
      })
    ) as any
    
    const forecast = await getWeatherForecast()
    
    expect(forecast.series).toHaveLength(1)
    expect(forecast.series[0].hsM).toBe(2.5)
    expect(forecast.series[0].windKt).toBeGreaterThan(0)
  })
  
  it("falls back to static JSON on API failure", async () => {
    // Mock fetch failure
    global.fetch = vi.fn(() => Promise.reject(new Error("Network error")))
    
    const forecast = await getWeatherForecast()
    
    // Should return static data
    expect(forecast.location).toBe("Arabian Gulf")
    expect(forecast.series.length).toBeGreaterThan(0)
  })
  
  it("validates empty data and falls back", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ list: [] }),
      })
    ) as any
    
    const forecast = await getWeatherForecast()
    
    // Should fallback due to empty data
    expect(forecast.series.length).toBeGreaterThan(0)
  })
})
```

```typescript
// lib/weather/__tests__/weather-cache.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { getWeatherFromCache, setWeatherCache } from "@/lib/weather/weather-cache"

vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}))

describe("weather-cache", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it("returns null when cache is empty", async () => {
    const { kv } = await import("@vercel/kv")
    vi.mocked(kv.get).mockResolvedValue(null)
    
    const cached = await getWeatherFromCache()
    expect(cached).toBeNull()
  })
  
  it("returns cached data when fresh", async () => {
    const { kv } = await import("@vercel/kv")
    const mockData = {
      updatedAt: new Date().toISOString(),
      series: [],
    }
    vi.mocked(kv.get).mockResolvedValue(mockData)
    
    const cached = await getWeatherFromCache()
    expect(cached).toEqual(mockData)
  })
  
  it("returns null when cache is stale", async () => {
    const { kv } = await import("@vercel/kv")
    const staleData = {
      updatedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(), // 7h ago
      series: [],
    }
    vi.mocked(kv.get).mockResolvedValue(staleData)
    
    const cached = await getWeatherFromCache()
    expect(cached).toBeNull()
  })
})
```

---

## 📁 파일 변경 목록

### 신규 파일 (6개)
```
lib/weather/
  ├── weather-fetch.ts              (Hybrid fetching logic)
  ├── weather-api-client.ts         (API provider abstraction)
  ├── weather-cache.ts              (Vercel KV caching)
  └── __tests__/
      ├── weather-fetch.test.ts     (Fetch + fallback tests)
      └── weather-cache.test.ts     (Cache logic tests)

app/api/weather/
  ├── route.ts                      (Public API endpoint)
  └── cron/
      └── route.ts                  (Vercel Cron job)
```

### 수정 파일 (3개)
```
lib/weather/
  └── weather-service.ts            (Add getWeatherForecastLive())

app/
  └── page.tsx                      (Use dynamic weather fetch)

vercel.json                         (Add cron configuration)
```

### 환경 변수 (.env.local)
```bash
# Weather API
WEATHER_API_PROVIDER=openweathermap
OPENWEATHERMAP_API_KEY=your_key
WEATHER_LOCATION_LAT=24.5
WEATHER_LOCATION_LON=54.4

# Cron Security
CRON_SECRET=generate_random_secret

# Vercel KV (auto-generated)
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

---

## 🧪 Testing Strategy

### Unit Tests (최소 5개)

**weather-fetch.test.ts:**
1. ✓ API fetch 성공
2. ✓ API 실패 → Static fallback
3. ✓ 빈 데이터 → Static fallback

**weather-cache.test.ts:**
4. ✓ Cache hit (fresh data)
5. ✓ Cache miss (stale data)

### Integration Tests (E2E)

**시나리오 1: 정상 플로우**
```
1. Cron job 실행 (/api/weather/cron)
2. API fetch → normalize → cache
3. Client fetch (/api/weather) → cache hit
4. Ghost Bars 표시 (빨강/주황)
5. Alert card 표시
```

**시나리오 2: API 장애 플로우**
```
1. API fetch 실패 (network error)
2. Fallback to static JSON
3. Ghost Bars 표시 (static data 기반)
4. Console warning 확인
```

**시나리오 3: Cache 만료 플로우**
```
1. Cache 7시간 경과 (stale)
2. Client fetch → cache miss
3. API re-fetch → cache update
4. Fresh data 표시
```

---

## 📋 Deployment Checklist

### Vercel Dashboard 설정

- [ ] **KV Database 생성**
  - Storage → Create KV Database
  - Name: `weather-cache`
  - Auto-generates: `KV_REST_API_URL`, `KV_REST_API_TOKEN`

- [ ] **Environment Variables 설정**
  - Settings → Environment Variables
  - Add: `WEATHER_API_PROVIDER`, `OPENWEATHERMAP_API_KEY`, etc.
  - Scope: Production + Preview + Development

- [ ] **Cron Secret 생성**
  - `CRON_SECRET`: `openssl rand -base64 32`

### API Key 발급

- [ ] **OpenWeatherMap**
  1. https://openweathermap.org/api 회원가입
  2. API Keys → Create
  3. Free Tier: 1,000 calls/day (충분)
  4. Marine API 추가 구독 (선택, 파도 데이터)

### vercel.json 업데이트

- [ ] Cron 설정 추가
  ```json
  {
    "crons": [
      {
        "path": "/api/weather/cron",
        "schedule": "0 */6 * * *"
      }
    ]
  }
  ```

### Monitoring 설정

- [ ] **Vercel Logs**
  - Deployments → Functions → `/api/weather/cron`
  - 실행 성공/실패 확인

- [ ] **API 사용량 모니터링**
  - OpenWeatherMap Dashboard → Usage
  - Free tier 한계 (1,000 calls/day) 확인

- [ ] **Cache 통계**
  - Vercel KV → Metrics
  - Hit/Miss ratio 확인

### Fallback 검증

- [ ] Static JSON 최신 상태 유지
  - `data/schedule/weather_forecast.json`
  - 최소 1주일 이내 데이터

- [ ] API 장애 시뮬레이션
  - API key 무효화 → Static fallback 확인
  - Console warning 출력 확인

---

## ⚠️ Risks & Mitigation

| Risk | 확률 | 영향 | Mitigation |
|------|------|------|------------|
| **API Rate Limit 초과** | Medium | High | Cache (6h TTL) + Static fallback |
| **API 장애 (Downtime)** | Low | Medium | Hybrid 접근 + Fallback 자동화 |
| **API 비용 증가** | Low | Low | Free tier 1,000 calls/day (현재 144 calls/day) |
| **Cache 장애** | Very Low | Low | Cache 실패 시 직접 fetch + fallback |
| **Data 형식 변경** | Low | Medium | 정규화 함수 유지 + Unit tests |
| **환경 변수 누락** | Medium | High | .env.example 제공 + Deployment checklist |

---

## 📈 Success Metrics

### 운영 지표
- **Data Freshness**: < 6시간 (목표: 99% 달성)
- **API Success Rate**: > 95% (목표: Hybrid 접근으로 100% 가용성)
- **Cache Hit Rate**: > 80% (6시간 TTL 기준)
- **Fallback Activation**: < 5% (API 신뢰도 지표)

### 성능 지표
- **API Response Time**: < 2초 (OpenWeatherMap 평균 500ms)
- **Cache Response Time**: < 100ms (Vercel KV)
- **Page Load Impact**: < 50ms 증가 (async fetch)

### 비용 지표
- **API 호출 횟수**: ~144 calls/day (6h 간격, 24h = 4 calls)
- **Vercel KV 사용량**: < 1MB (forecast 데이터 작음)
- **예상 비용**: $0/month (Free tier 충분)

---

## 🚀 Phase 요약

| Phase | 작업 | 예상 시간 | 파일 |
|-------|------|----------|------|
| **Phase 1** | API Client + Fetching | 1-1.5h | 3개 신규 |
| **Phase 2** | Caching + API Routes | 0.5-1h | 3개 신규 |
| **Phase 3** | Integration + Tests | 0.5-1h | 3개 수정 + 2개 테스트 |
| **Total** | - | **2-3시간** | **11개 파일** |

---

## 📚 참조 문서

- **API Providers:**
  - OpenWeatherMap Marine API: https://openweathermap.org/api/marine-weather-api
  - WeatherAPI.com: https://www.weatherapi.com/docs/
  - NOAA Marine: https://www.weather.gov/marine/

- **Vercel:**
  - Vercel KV: https://vercel.com/docs/storage/vercel-kv
  - Vercel Cron: https://vercel.com/docs/cron-jobs

- **기존 구현:**
  - `lib/weather/weather-service.ts` (현재 인터페이스)
  - `docs/plan/weather-delay-preview-plan.md` (Phase 1-4)
  - `AGENTS.md` (SSOT 원칙, 테스트 요구사항)

---

**계획 완료!** Phase 1부터 순차 구현 가능합니다. 🚀
