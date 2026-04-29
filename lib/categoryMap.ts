// Best-effort mapping from a Korean specialty string (from Kakao
// `category_name` or HIRA `종별코드명`) to the patient app's category
// vocabulary. Anything we don't recognise falls back to "general" so
// the clinic still surfaces in the unfiltered list.
const KOREAN_TO_CATEGORY: Array<[RegExp, string]> = [
  [/피부/, "dermatology"],
  [/치과/, "dentistry"],
  [/이비인후/, "ent"],
  [/산부인|산부|부인과/, "gynecology"],
  [/정형외/, "orthopedics"],
  [/소아/, "pediatrics"],
  [/안과/, "ophthalmology"],
  [/내과/, "internal"],
  [/가정의/, "family"],
  [/정신|심리/, "psychiatry"],
  [/한의|한방/, "oriental"],
];

export const inferCategory = (...sources: (string | undefined | null)[]): string => {
  const joined = sources.filter(Boolean).join(" ");
  for (const [re, cat] of KOREAN_TO_CATEGORY) {
    if (re.test(joined)) return cat;
  }
  return "general";
};
