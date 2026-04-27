import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";

const ExploreLocationContext = createContext(null);

export function ExploreLocationProvider({ children }) {
  const { user, ready } = useAuth();

  const locationKey = user?.id
    ? `explore_location.${user.id}`
    : "explore_location.guest";

  const [location, setLocationState] = useState(null);
  const [locationReady, setLocationReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!ready) return;

        setLocationReady(false);

        if (!user) {
          if (mounted) {
            setLocationState(null);
          }
          return;
        }

        const saved = await AsyncStorage.getItem(locationKey);

        if (saved && mounted) {
          setLocationState(JSON.parse(saved));
        } else if (mounted) {
          setLocationState(null);
        }
      } catch (e) {
        console.log("Failed to load saved explore location:", e);
        if (mounted) setLocationState(null);
      } finally {
        if (mounted) setLocationReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ready, user, locationKey]);

  const setLocation = async (value) => {
    try {
      setLocationState(value);
      await AsyncStorage.setItem(locationKey, JSON.stringify(value));
    } catch (e) {
      console.log("Failed to save explore location:", e);
      throw e;
    }
  };

  const clearLocation = async () => {
    try {
      setLocationState(null);
      await AsyncStorage.removeItem(locationKey);
    } catch (e) {
      console.log("Failed to clear explore location:", e);
    }
  };

  const value = useMemo(
    () => ({
      location,
      locationReady,
      setLocation,
      clearLocation,
    }),
    [location, locationReady]
  );

  return (
    <ExploreLocationContext.Provider value={value}>
      {children}
    </ExploreLocationContext.Provider>
  );
}

export function useExploreLocation() {
  const ctx = useContext(ExploreLocationContext);
  if (!ctx) {
    throw new Error(
      "useExploreLocation must be used inside ExploreLocationProvider"
    );
  }
  return ctx;
}
