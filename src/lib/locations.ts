import type { FreightLocation } from "./types";
export const locations: FreightLocation[] = [
  ["Dar es Salaam", "Tanzania", "Port", "TZDAR"],
  ["Mombasa", "Kenya", "Port", "KEMBA"],
  ["Lagos (Apapa)", "Nigeria", "Port", "NGLOS"],
  ["Tema", "Ghana", "Port", "GHTEM"],
  ["Durban", "South Africa", "Port", "ZADUR"],
  ["Cape Town", "South Africa", "Port", "ZACPT"],
  ["Abidjan", "Côte d’Ivoire", "Port", "CIABJ"],
  ["Djibouti", "Djibouti", "Port", "DJJIB"],
  ["Tanga", "Tanzania", "Port", "TZTGT"],
  ["Shanghai", "China", "Port", "CNSHA"],
  ["Jebel Ali", "United Arab Emirates", "Port", "AEJEA"],
  ["Rotterdam", "Netherlands", "Port", "NLRTM"],
  ["Singapore", "Singapore", "Port", "SGSIN"],
  ["Julius Nyerere International", "Tanzania", "Airport", "DAR"],
  ["Jomo Kenyatta International", "Kenya", "Airport", "NBO"],
  ["Kilimanjaro International", "Tanzania", "Airport", "JRO"],
  ["Murtala Muhammed International", "Nigeria", "Airport", "LOS"],
  ["O. R. Tambo International", "South Africa", "Airport", "JNB"],
  ["Dubai International", "United Arab Emirates", "Airport", "DXB"],
  ["Addis Ababa Bole", "Ethiopia", "Airport", "ADD"],
  ["Nairobi", "Kenya", "City", ""],
  ["Dar es Salaam", "Tanzania", "City", ""],
  ["Kampala", "Uganda", "City", ""],
  ["Kigali", "Rwanda", "City", ""],
  ["Lagos", "Nigeria", "City", ""],
  ["Accra", "Ghana", "City", ""],
  ["Arusha", "Tanzania", "City", ""],
  ["Bamako", "Mali", "City", ""],
  ["Lusaka", "Zambia", "City", ""],
  ["Ouagadougou", "Burkina Faso", "City", ""],
  ["Johannesburg", "South Africa", "City", ""],
  ["Naivasha Inland Container Depot", "Kenya", "Inland terminal", ""],
  ["Nairobi Inland Container Depot", "Kenya", "Inland terminal", ""],
  ["Isaka Dry Port", "Tanzania", "Inland terminal", ""],
  ["Kigali Logistics Platform", "Rwanda", "Inland terminal", ""],
].map(([name, country, type, code]) => ({
  name,
  country,
  type: type as FreightLocation["type"],
  code,
}));
export function searchLocations(
  query: string,
  types?: FreightLocation["type"][],
) {
  const q = query.toLowerCase().trim();
  return locations
    .filter((l) => !types || types.includes(l.type))
    .filter((l) =>
      `${l.name} ${l.country} ${l.code} ${l.type}`.toLowerCase().includes(q),
    )
    .slice(0, 8);
}
export const locationLabel = (l?: FreightLocation) =>
  l ? `${l.name}${l.code ? ` (${l.code})` : ""}` : "Not specified";
