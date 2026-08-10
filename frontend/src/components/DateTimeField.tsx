// Cross-platform datetime picker helper.
// Native: @react-native-community/datetimepicker
// Web: <input type="datetime-local">

import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, font, radius, spacing } from '@/src/lib/theme';

type Props = {
  value: Date | null;
  onChange: (d: Date | null) => void;
  label: string;
  testID?: string;
  allowClear?: boolean;
  emptyText?: string;
  inline?: boolean;
};

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DateTimeField({ value, onChange, label, testID, allowClear = true, emptyText = 'None', inline = false }: Props) {
  const [showDate, setShowDate] = React.useState(false);
  const [showTime, setShowTime] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<Date | null>(value);

  React.useEffect(() => {
    setTempDate(value);
  }, [value]);

  const display = value ? formatDisplay(value) : emptyText;
  const inlineText = label ? `${label}: ${display}` : display;

  const openPickers = () => {
    const base = value ?? new Date();
    setTempDate(base);
    setShowDate(true);
  };

  const nativePickers = (
    <>
      {showDate ? (
        <DateTimePicker
          value={tempDate ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_e, d) => {
            setShowDate(false);
            if (!d) return;
            setTempDate(d);
            setShowTime(true);
          }}
        />
      ) : null}
      {showTime ? (
        <DateTimePicker
          value={tempDate ?? new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_e, d) => {
            setShowTime(false);
            if (!d) return;
            const base = tempDate ?? new Date();
            const combined = new Date(
              base.getFullYear(),
              base.getMonth(),
              base.getDate(),
              d.getHours(),
              d.getMinutes(),
              0,
              0
            );
            onChange(combined);
          }}
        />
      ) : null}
    </>
  );

  // ---- Inline single-line control (used in the quick-add row) ----
  if (inline) {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.inlineBtn}>
          <Text
            style={[styles.inlineText, !value && styles.pickerBtnPlaceholder]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {inlineText}
          </Text>
          {/* @ts-ignore transparent native input captures taps and opens picker */}
          <input
            data-testid={testID}
            type="datetime-local"
            value={value ? toLocalInputValue(value) : ''}
            onChange={(e: any) => {
              const v = e.target.value;
              if (!v) return onChange(null);
              const d = new Date(v);
              onChange(isNaN(d.getTime()) ? null : d);
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
            }}
          />
        </View>
      );
    }
    return (
      <>
        <Pressable testID={testID} onPress={openPickers} style={styles.inlineBtn}>
          <Text
            style={[styles.inlineText, !value && styles.pickerBtnPlaceholder]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {inlineText}
          </Text>
        </Pressable>
        {nativePickers}
      </>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.rowWrap}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={styles.webInputWrap}>
          {/* @ts-ignore  react-native-web supports raw HTML tags via createElement fallback */}
          <input
            data-testid={testID}
            type="datetime-local"
            value={value ? toLocalInputValue(value) : ''}
            onChange={(e: any) => {
              const v = e.target.value;
              if (!v) return onChange(null);
              const d = new Date(v);
              onChange(isNaN(d.getTime()) ? null : d);
            }}
            style={{
              fontSize: 16,
              padding: 8,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              background: '#fff',
              color: colors.onSurface,
              minWidth: 200,
            }}
          />
          {allowClear && value ? (
            <Pressable onPress={() => onChange(null)} style={styles.clearBtn} testID={`${testID}-clear`}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rowWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
        <Pressable
          testID={testID}
          onPress={() => {
            const base = value ?? new Date();
            setTempDate(base);
            setShowDate(true);
          }}
          style={styles.pickerBtn}
        >
          <Text style={[styles.pickerBtnText, !value && styles.pickerBtnPlaceholder]}>{display}</Text>
        </Pressable>
        {allowClear && value ? (
          <Pressable onPress={() => onChange(null)} style={styles.clearBtn} testID={`${testID}-clear`}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {showDate ? (
        <DateTimePicker
          value={tempDate ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_e, d) => {
            setShowDate(false);
            if (!d) return;
            setTempDate(d);
            setShowTime(true);
          }}
        />
      ) : null}
      {showTime ? (
        <DateTimePicker
          value={tempDate ?? new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_e, d) => {
            setShowTime(false);
            if (!d) return;
            const base = tempDate ?? new Date();
            const combined = new Date(
              base.getFullYear(),
              base.getMonth(),
              base.getDate(),
              d.getHours(),
              d.getMinutes(),
              0,
              0
            );
            onChange(combined);
          }}
        />
      ) : null}
    </View>
  );
}

export function formatDisplay(d: Date): string {
  // e.g. "Tue 12 Aug, 5:00 PM"
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString(undefined, { month: 'short' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${weekday} ${day} ${month}, ${time}`;
}

const styles = StyleSheet.create({
  rowWrap: { gap: spacing.sm, paddingVertical: spacing.sm },
  label: { fontSize: font.sm, color: colors.onSurfaceSecondary, fontWeight: '600' },
  webInputWrap: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  pickerBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pickerBtnText: { fontSize: font.lg, color: colors.onSurface },
  pickerBtnPlaceholder: { color: colors.onSurfaceTertiary },
  clearBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  clearText: { fontSize: font.base, color: colors.info },
  inlineBtn: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    position: 'relative',
    overflow: 'hidden',
  },
  inlineText: { fontSize: font.base, color: colors.onSurface },
});
