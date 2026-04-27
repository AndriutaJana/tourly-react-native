import React, { useMemo, useState } from "react";
import { Modal, View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/useAppTheme";

function ActionRow({ icon, label, onPress, theme, danger = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionRow,
        { borderColor: theme.border, backgroundColor: theme.bg },
      ]}
    >
      <Ionicons name={icon} size={18} color={danger ? "#C43C35" : theme.text} />
      <Text
        style={[styles.actionText, { color: danger ? "#C43C35" : theme.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function PlaceActionsSheet({
  visible,
  onClose,
  item,
  trip,
  onEdit,
  onMoveToAnotherDay,
  onMoveUp,
  onMoveDown,
  onChangeStatus,
  onRemove,
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [showStatusOptions, setShowStatusOptions] = useState(false);
  const [showDayOptions, setShowDayOptions] = useState(false);

  const daysCount = Math.max(1, trip?.daysCount || 1);

  const STATUS_OPTIONS = useMemo(
    () => [
      {
        value: "want_to_go",
        label: t("trips.status.want"),
        icon: "heart-outline",
      },
      {
        value: "planned",
        label: t("trips.status.planned"),
        icon: "calendar-outline",
      },
      {
        value: "visited",
        label: t("trips.status.visited"),
        icon: "checkmark-circle-outline",
      },
      {
        value: "skipped",
        label: t("trips.status.skipped"),
        icon: "close-circle-outline",
      },
    ],
    [t]
  );

  const handleStatusPick = async (status) => {
    try {
      await onChangeStatus?.(status);
      setShowStatusOptions(false);
      onClose?.();
    } catch (e) {
      Alert.alert(t("common.error"), e?.message || t("trips.statusFailed"));
    }
  };

  const handleDayPick = async (day) => {
    try {
      await onMoveToAnotherDay?.(day);
      setShowDayOptions(false);
      onClose?.();
    } catch (e) {
      Alert.alert(t("common.error"), e?.message || t("trips.moveFailed"));
    }
  };

  const handleRemove = () => {
    Alert.alert(t("trips.removeFromTrip"), t("trips.removeConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: async () => {
          try {
            await onRemove?.();
            onClose?.();
          } catch (e) {
            Alert.alert(
              t("common.error"),
              e?.message || t("trips.removeFailed")
            );
          }
        },
      },
    ]);
  };

  const title = item?.name || t("trips.placeActions");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.handleWrap}>
            <View
              style={[
                styles.handle,
                { backgroundColor: theme.isDark ? "#3A3A3C" : "#D9D9DE" },
              ]}
            />
          </View>

          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>

          {!showStatusOptions && !showDayOptions && (
            <>
              <ActionRow
                icon="create-outline"
                label={t("trips.editPlace")}
                onPress={() => {
                  onClose?.();
                  onEdit?.();
                }}
                theme={theme}
              />

              <ActionRow
                icon="document-text-outline"
                label={t("trips.editNote")}
                onPress={() => {
                  onClose?.();
                  onEdit?.();
                }}
                theme={theme}
              />

              <ActionRow
                icon="swap-horizontal-outline"
                label={t("trips.moveToAnotherDay")}
                onPress={() => setShowDayOptions(true)}
                theme={theme}
              />

              <ActionRow
                icon="arrow-up-outline"
                label={t("trips.moveUp")}
                onPress={async () => {
                  await onMoveUp?.();
                  onClose?.();
                }}
                theme={theme}
              />

              <ActionRow
                icon="arrow-down-outline"
                label={t("trips.moveDown")}
                onPress={async () => {
                  await onMoveDown?.();
                  onClose?.();
                }}
                theme={theme}
              />

              <ActionRow
                icon="flag-outline"
                label={t("trips.changeStatus")}
                onPress={() => setShowStatusOptions(true)}
                theme={theme}
              />

              <ActionRow
                icon="trash-outline"
                label={t("trips.removeFromTrip")}
                onPress={handleRemove}
                danger
                theme={theme}
              />
            </>
          )}

          {showStatusOptions && (
            <>
              <View style={styles.subHeader}>
                <Pressable
                  onPress={() => setShowStatusOptions(false)}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.text} />
                </Pressable>
                <Text style={[styles.subTitle, { color: theme.text }]}>
                  {t("trips.changeStatus")}
                </Text>
                <View style={{ width: 20 }} />
              </View>

              {STATUS_OPTIONS.map((option) => (
                <ActionRow
                  key={option.value}
                  icon={option.icon}
                  label={option.label}
                  onPress={() => handleStatusPick(option.value)}
                  theme={theme}
                />
              ))}
            </>
          )}

          {showDayOptions && (
            <>
              <View style={styles.subHeader}>
                <Pressable
                  onPress={() => setShowDayOptions(false)}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.text} />
                </Pressable>
                <Text style={[styles.subTitle, { color: theme.text }]}>
                  {t("trips.moveToAnotherDay")}
                </Text>
                <View style={{ width: 20 }} />
              </View>

              {Array.from({ length: daysCount }).map((_, index) => {
                const day = index + 1;
                return (
                  <ActionRow
                    key={day}
                    icon="calendar-outline"
                    label={`${t("trips.day")} ${day}`}
                    onPress={() => handleDayPick(day)}
                    theme={theme}
                  />
                );
              })}
            </>
          )}

          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: theme.sub }]}>
              {t("common.close")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.32)",
  },

  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },

  handleWrap: {
    alignItems: "center",
    marginBottom: 10,
  },

  handle: {
    width: 46,
    height: 5,
    borderRadius: 999,
  },

  title: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 14,
    fontFamily: "Montserrat_400Regular",
  },

  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 2,
  },

  subTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
  },

  actionRow: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  actionText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },

  cancelBtn: {
    marginTop: 6,
    alignItems: "center",
    paddingVertical: 10,
  },

  cancelText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },
});
