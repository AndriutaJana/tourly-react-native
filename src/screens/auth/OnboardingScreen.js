import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Pressable,
} from "react-native";
import PagerView from "react-native-pager-view";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../../../theme/colors";

export default function OnboardingScreen({ navigation }) {
  const pagerRef = useRef(null);
  const [page, setPage] = useState(0);
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
        orientation="vertical"
      >
        <ImageBackground
          key="1"
          source={require("../../../assets/images/onboarding1.jpg")}
          style={styles.bg}
          resizeMode="cover"
        >
          <View style={styles.darkOverlay} />

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.40)"]}
            style={styles.gradient}
          />

          <View style={styles.centerBlock}>
            <Image
              source={require("../../../assets/images/logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />

            <Text style={styles.subtitle}>{t("auth.onboarding.subtitle")}</Text>
          </View>

          <View style={styles.bottomArea}>
            <Dots active={page} />

            <Pressable
              style={styles.arrowBtn}
              onPress={() => pagerRef.current?.setPage(1)}
            >
              <Ionicons name="chevron-up" size={34} color="#FFFFFF" />
            </Pressable>
          </View>
        </ImageBackground>

        <ImageBackground
          key="2"
          source={require("../../../assets/images/onboarding2.jpg")}
          style={styles.bg}
          resizeMode="cover"
        >
          <View style={styles.darkOverlay} />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.70)"]}
            style={styles.gradient}
          />

          <View style={styles.centerBlock}>
            <Image
              source={require("../../../assets/images/logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />

            <Text style={styles.subtitle}>{t("auth.onboarding.subtitle")}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.primary]}
              onPress={() => navigation.navigate("SignIn")}
            >
              <Text style={[styles.btnText, styles.primaryText]}>
                {t("navigation.signIn")}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.secondary]}
              onPress={() => navigation.navigate("SignUp")}
            >
              <Text style={[styles.btnText, styles.secondaryText]}>
                {t("navigation.signUp")}
              </Text>
            </Pressable>

            <View style={{ marginTop: 14 }}>
              <Dots active={page} />
            </View>
          </View>
        </ImageBackground>
      </PagerView>
    </View>
  );
}

function Dots({ active }) {
  return (
    <View style={styles.dotsRow}>
      <View style={[styles.dot, active === 0 && styles.dotActive]} />
      <View style={[styles.dot, active === 1 && styles.dotActive]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  pager: { flex: 1 },
  bg: { flex: 1 },

  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.50)",
  },

  gradient: {
    ...StyleSheet.absoluteFillObject,
  },

  centerBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: -20,
  },

  logoImg: {
    width: 320,
    height: 140,
  },

  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: "#F5F5F5",
    opacity: 0.92,
    textAlign: "center",
    fontFamily: "Montserrat_400Regular",
  },

  bottomArea: {
    paddingBottom: 26,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 12,
  },

  arrowBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  actions: {
    paddingBottom: 40,
    paddingHorizontal: 22,
  },

  button: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  primary: { backgroundColor: colors.brand },
  secondary: { backgroundColor: "#FFFFFF" },

  btnText: { fontSize: 16, fontWeight: "600" },
  primaryText: { color: "#FFFFFF" },
  secondaryText: { color: colors.text },

  dotsRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: { backgroundColor: colors.brand, width: 22 },
});
