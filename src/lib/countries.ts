export type CountryMeta = {
  name: string;
  code: string;
  iso2: string;
  flag: string;
};

type CountryRecord = {
  name: string;
  code: string;
  iso2: string;
  aliases?: string[];
};

const COUNTRIES: CountryRecord[] = [
  { name: "Singapore", code: "SGP", iso2: "SG" },
  { name: "Japan", code: "JPN", iso2: "JP" },
  { name: "South Korea", code: "KOR", iso2: "KR", aliases: ["korea", "republic of korea"] },
  { name: "Taiwan", code: "TWN", iso2: "TW" },
  { name: "Hong Kong", code: "HKG", iso2: "HK" },
  { name: "China", code: "CHN", iso2: "CN" },
  { name: "Malaysia", code: "MYS", iso2: "MY" },
  { name: "Thailand", code: "THA", iso2: "TH" },
  { name: "Indonesia", code: "IDN", iso2: "ID" },
  { name: "Vietnam", code: "VNM", iso2: "VN" },
  { name: "Philippines", code: "PHL", iso2: "PH" },
  { name: "India", code: "IND", iso2: "IN" },
  { name: "Australia", code: "AUS", iso2: "AU" },
  { name: "New Zealand", code: "NZL", iso2: "NZ" },
  { name: "United States", code: "USA", iso2: "US", aliases: ["usa", "us", "america"] },
  { name: "Canada", code: "CAN", iso2: "CA" },
  { name: "Mexico", code: "MEX", iso2: "MX" },
  { name: "United Kingdom", code: "GBR", iso2: "GB", aliases: ["uk", "britain", "england", "scotland", "wales"] },
  { name: "Ireland", code: "IRL", iso2: "IE" },
  { name: "France", code: "FRA", iso2: "FR" },
  { name: "Germany", code: "DEU", iso2: "DE" },
  { name: "Italy", code: "ITA", iso2: "IT" },
  { name: "Spain", code: "ESP", iso2: "ES" },
  { name: "Portugal", code: "PRT", iso2: "PT" },
  { name: "Netherlands", code: "NLD", iso2: "NL", aliases: ["holland"] },
  { name: "Belgium", code: "BEL", iso2: "BE" },
  { name: "Switzerland", code: "CHE", iso2: "CH" },
  { name: "Austria", code: "AUT", iso2: "AT" },
  { name: "Norway", code: "NOR", iso2: "NO" },
  { name: "Sweden", code: "SWE", iso2: "SE" },
  { name: "Denmark", code: "DNK", iso2: "DK" },
  { name: "Finland", code: "FIN", iso2: "FI" },
  { name: "Iceland", code: "ISL", iso2: "IS" },
  { name: "Poland", code: "POL", iso2: "PL" },
  { name: "Czechia", code: "CZE", iso2: "CZ", aliases: ["czech republic"] },
  { name: "Greece", code: "GRC", iso2: "GR" },
  { name: "Croatia", code: "HRV", iso2: "HR" },
  { name: "Slovenia", code: "SVN", iso2: "SI" },
  { name: "South Africa", code: "ZAF", iso2: "ZA" },
  { name: "United Arab Emirates", code: "ARE", iso2: "AE", aliases: ["uae", "dubai"] },
  { name: "Brazil", code: "BRA", iso2: "BR" },
  { name: "Argentina", code: "ARG", iso2: "AR" },
  { name: "Chile", code: "CHL", iso2: "CL" },
];

function flagFromIso2(iso2: string): string {
  return String.fromCodePoint(
    ...[...iso2.toUpperCase()].map((char) => 127397 + char.charCodeAt(0)),
  );
}

const LOOKUP = new Map<string, CountryRecord>();
for (const country of COUNTRIES) {
  LOOKUP.set(normalize(country.name), country);
  LOOKUP.set(normalize(country.code), country);
  LOOKUP.set(normalize(country.iso2), country);
  for (const alias of country.aliases ?? []) {
    LOOKUP.set(normalize(alias), country);
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export const COUNTRY_NAMES = COUNTRIES.map((country) => country.name);

/** City-states (and similar) where a separate city field is optional. */
export function cityOptionalForCountry(country: string): boolean {
  return normalize(country) === "singapore";
}

/** Resolve the city stored on a visit — Singapore defaults to the country name. */
export function resolveVisitCity(country: string, city: string): string {
  const trimmed = city.trim();
  if (trimmed) return trimmed;
  if (cityOptionalForCountry(country)) return country.trim() || "Singapore";
  return "";
}

export function countryMeta(country: string): CountryMeta {
  const match = LOOKUP.get(normalize(country));
  if (match) {
    return {
      name: match.name,
      code: match.code,
      iso2: match.iso2,
      flag: flagFromIso2(match.iso2),
    };
  }

  const letters = country.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
  return {
    name: country.trim() || "Unknown",
    code: letters.padEnd(3, "X"),
    iso2: "",
    flag: "",
  };
}
