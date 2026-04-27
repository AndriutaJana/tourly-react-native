import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "tourly.trips.v1";

export async function loadTrips() {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveTrips(trips) {
  await AsyncStorage.setItem(KEY, JSON.stringify(trips));
}
