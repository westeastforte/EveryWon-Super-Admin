"use client";

// Loaders for the two Korean address APIs we use:
//   - Daum Postcode: free, no key required, gives a structured address
//     and region/district fields. https://postcode.map.daum.net
//   - Kakao Maps Geocoder: needs a free JS key from developers.kakao.com,
//     converts the chosen address to (lat, lng).
//
// Both are loaded on demand via injected <script> tags so the admin tool
// works with a normal `next dev` setup without any custom config.

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: DaumPostcodeOptions) => { open(): void };
    };
    kakao?: {
      maps: {
        load: (cb: () => void) => void;
        services: {
          Geocoder: new () => {
            addressSearch: (
              q: string,
              cb: (
                result: KakaoGeocodeResult[],
                status: "OK" | "ZERO_RESULT" | "ERROR",
              ) => void,
            ) => void;
          };
          Places: new () => {
            keywordSearch: (
              q: string,
              cb: (
                result: KakaoPlace[],
                status: "OK" | "ZERO_RESULT" | "ERROR",
                pagination: { totalCount: number },
              ) => void,
              options?: { size?: number; page?: number; category_group_code?: string },
            ) => void;
          };
        };
      };
    };
  }
}

export interface DaumPostcodeData {
  address: string;
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
  sido: string;
  sigungu: string;
  bname: string;
  buildingName: string;
}

interface DaumPostcodeOptions {
  oncomplete: (data: DaumPostcodeData) => void;
  onclose?: () => void;
  width?: string | number;
  height?: string | number;
}

export interface KakaoGeocodeResult {
  address_name: string;
  x: string; // lng
  y: string; // lat
  road_address?: { address_name: string };
}

export interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;        // e.g. "의료,건강 > 병원 > 이비인후과"
  category_group_code: string;  // "HP8" for hospitals, "PM9" for pharmacies
  category_group_name: string;
  phone: string;
  address_name: string;         // jibun address
  road_address_name: string;    // road address
  x: string;                    // lng
  y: string;                    // lat
  place_url: string;
}

const DAUM_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

const kakaoSrc = (key: string) =>
  `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const tag = document.createElement("script");
    tag.src = src;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(tag);
  });

let kakaoReady: Promise<void> | null = null;

export const ensureKakao = (key: string): Promise<void> => {
  if (kakaoReady) return kakaoReady;
  kakaoReady = (async () => {
    await loadScript(kakaoSrc(key));
    await new Promise<void>((resolve) => {
      if (!window.kakao?.maps) {
        throw new Error("Kakao SDK loaded but window.kakao is missing");
      }
      window.kakao.maps.load(() => resolve());
    });
  })();
  return kakaoReady;
};

export const ensureDaumPostcode = (): Promise<void> => loadScript(DAUM_SRC);

export const openPostcode = async (
  onComplete: (data: DaumPostcodeData) => void,
): Promise<void> => {
  await ensureDaumPostcode();
  if (!window.daum?.Postcode) {
    throw new Error("Daum Postcode SDK failed to load");
  }
  new window.daum.Postcode({ oncomplete: onComplete }).open();
};

export const searchPlaces = async (
  keyword: string,
  kakaoKey: string,
  opts?: { size?: number; page?: number },
): Promise<{ results: KakaoPlace[]; total: number }> => {
  if (!kakaoKey) throw new Error("Kakao API key is missing");
  await ensureKakao(kakaoKey);
  if (!window.kakao?.maps?.services) {
    throw new Error("Kakao services library missing");
  }
  return new Promise((resolve, reject) => {
    const places = new window.kakao!.maps.services.Places();
    places.keywordSearch(
      keyword,
      (result, status, pagination) => {
        if (status === "OK") {
          resolve({
            results: result,
            total: pagination?.totalCount ?? result.length,
          });
        } else if (status === "ZERO_RESULT") {
          resolve({ results: [], total: 0 });
        } else {
          reject(new Error(`Kakao places failed: ${status}`));
        }
      },
      // HP8 = hospitals/clinics. Restrict the search so we don't get
      // restaurants when someone types a clinic name that collides.
      { size: opts?.size ?? 15, page: opts?.page ?? 1, category_group_code: "HP8" },
    );
  });
};

export const geocodeAddress = async (
  address: string,
  kakaoKey: string,
): Promise<{ lat: number; lng: number } | null> => {
  if (!kakaoKey) return null;
  await ensureKakao(kakaoKey);
  if (!window.kakao?.maps?.services) {
    throw new Error("Kakao services library missing");
  }
  return new Promise((resolve, reject) => {
    const geocoder = new window.kakao!.maps.services.Geocoder();
    geocoder.addressSearch(address, (result, status) => {
      if (status === "OK" && result[0]) {
        resolve({ lat: Number(result[0].y), lng: Number(result[0].x) });
      } else if (status === "ZERO_RESULT") {
        resolve(null);
      } else {
        reject(new Error(`Kakao geocode failed: ${status}`));
      }
    });
  });
};

// Pull the Kakao key from env first, then localStorage so an admin can
// paste a key into the settings dialog without restarting the dev server.
const STORAGE_KEY = "everywonadmin:kakaoKey";

export const getKakaoKey = (): string => {
  const fromEnv = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  if (fromEnv) return fromEnv;
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) || "";
};

export const setKakaoKey = (key: string): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, key.trim());
  // Force the next ensureKakao call to reload with the new key.
  kakaoReady = null;
};
