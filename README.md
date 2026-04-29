# Everywon Admin

A small Next.js admin app for onboarding Korean clinics into the same Firebase project the Everywon patient app subscribes to. Sidebar nav, three different ways to add clinics depending on volume, and a live list view.

## Routes

| Path | What it does |
|---|---|
| `/` | Overview — counts, links to the three add flows |
| `/clinics` | Live list of every clinic in Firestore (delete supported) |
| `/clinics/add` | Manual form: Daum Postcode picker + Kakao geocoder. One clinic at a time. |
| `/clinics/search` | Kakao Place keyword search ("강남이비인후과"), one-click save. Fastest for ad-hoc adds. |
| `/clinics/import` | Drop a HIRA / data.go.kr CSV. Preview, filter, bulk-write thousands. |
| `/settings` | Kakao API key, Firebase project status |

## Setup

```bash
cd everywonadmin
cp .env.local.example .env.local   # then fill in
npm install
npm run dev
# open http://localhost:3000
```

### Firebase env vars

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Same values as the patient app's `.env`. Firebase web config is **not secret** — security is enforced by Firestore rules in the shared project.

### Kakao Maps key

Used by `Add by Address` (geocoding) and `Search & Add` (Place keyword search).

1. <https://developers.kakao.com/console/app> → create a free app.
2. **플랫폼 → Web** → add `http://localhost:3000` (and any deploy origins).
3. Copy the **JavaScript 키**.
4. Either set `NEXT_PUBLIC_KAKAO_MAP_KEY` in `.env.local`, or paste it in `/settings` (saved in `localStorage`).

Without a Kakao key, `Add by Address` still saves clinics — they just ship without coordinates and the patient app falls back to a Seoul pin (`../data/clinicsRepo.ts:23` `SEOUL_FALLBACK`). `Search & Add` requires the key.

## The three flows, when to use which

**Search & Add** — fastest for one-off additions when you know the clinic name. Type "강남이비인후과", Kakao returns matching hospitals with address/phone/coords/category prefilled, click `+ 등록`. ~3 seconds per clinic.

**Add by Address** — when the clinic isn't in Kakao's index, or you want full control over the saved fields. Daum Postcode picker → Kakao geocoder fills lat/lng. ~30 seconds per clinic.

**Bulk Import** — for getting from 0 to thousands. Download the **건강보험심사평가원_병의원 및 약국 현황** CSV from <https://www.data.go.kr/data/15095099/fileData.do>, upload, filter by region (서울특별시, 경기도, etc.), preview, write. Batched in chunks of 400 (Firestore's 500-op limit).

## CSV column auto-mapping

The bulk importer looks for these Korean column names (each accepts a few synonyms):

| Field | HIRA column |
|---|---|
| 이름 | `요양기관명` / `병원명` / `기관명` |
| 종별 (specialty) | `종별코드명` / `종별명` |
| 시도 | `시도코드명` / `시도` |
| 시군구 | `시군구코드명` / `시군구` |
| 주소 | `주소` / `도로명주소` |
| 전화 | `전화번호` / `대표전화` |
| 위도 | `좌표(Y)` / `y좌표` / `위도` |
| 경도 | `좌표(X)` / `x좌표` / `경도` |

> **Coordinate caveat:** Modern HIRA exports (post-2018) are WGS84 (lat/lng directly). Some older exports use EPSG:5174 (Korea TM Central). If pins look shifted ~700m on the patient app, the source CSV needs reprojecting. The importer rejects coords outside Korea's bounding box (lat 30–45, lng 120–135) so obviously-wrong values just get skipped.

## What gets written

Each clinic becomes a `clinics/{auto-id}` doc shaped to the patient app's `types/dashboard.ts` with sane defaults: `services: []`, `doctors: []`, `availableSlots: 0`, `rating: 0`, `isActive: true`, `isVerified: false`. The patient app's `adaptDashClinicToApp` (`../data/clinicsRepo.ts:29`) turns these into the renderable shape with no extra mapping.

## Firestore rules

If saves fail with `permission-denied`, the shared rules don't allow the current user to write to `clinics/`. Two paths:

- temporarily relax the `clinics` write rule for an admin uid, or
- layer Firebase Auth on this admin tool and sign in as the same admin account the dashboard uses.

We're starting unauthenticated for speed; happy to wire admin sign-in once the rules story is settled.
