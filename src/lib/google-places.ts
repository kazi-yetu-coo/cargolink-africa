// Loads Places only when a road-address field is used. The browser key must be restricted by referrer/API.
export type PlacePrediction = {
  placeId: string;
  text: { toString(): string };
  toPlace(): {
    formattedAddress?: string;
    fetchFields(options: { fields: string[] }): Promise<unknown>;
  };
};
type PlacesLibrary = {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(request: {
      input: string;
      sessionToken: object;
      language: string;
    }): Promise<{ suggestions: { placePrediction?: PlacePrediction }[] }>;
  };
};
declare global {
  interface Window {
    google?: { maps: { importLibrary(name: string): Promise<PlacesLibrary> } };
    cargoLinkMapsReady?: () => void;
  }
}
let loading: Promise<PlacesLibrary> | undefined;
export const googlePlacesConfigured = Boolean(
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
);
export function loadPlaces() {
  if (!googlePlacesConfigured)
    return Promise.reject(new Error("Location suggestions unavailable"));
  if (loading) return loading;
  loading = new Promise<PlacesLibrary>((resolve, reject) => {
    if (window.google?.maps) {
      window.google.maps.importLibrary("places").then(resolve, reject);
      return;
    }
    const script = document.createElement("script");
    const timer = setTimeout(
      () => reject(new Error("Location search timed out")),
      12000,
    );
    window.cargoLinkMapsReady = () => {
      clearTimeout(timer);
      window.google!.maps.importLibrary("places").then(resolve, reject);
    };
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, loading: "async", v: "weekly", callback: "cargoLinkMapsReady" })}`;
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Location search unavailable"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
