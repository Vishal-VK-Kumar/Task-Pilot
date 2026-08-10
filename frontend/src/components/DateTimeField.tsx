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
};

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DateTimeField({ value, onChange, label, testID, allowClear = true }: Props) {
  const [showDate, setShowDate] = React.useState(false);
  const [showTime, setShowTime] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<Date | null>(value);

  React.useEffect(() => {
    setTempDate(value);
  }, [value]);

  const display = value ? formatDisplay(value) : 'None';

  if (Platform.OS === 'web') {
    return (
      <View style={styles.rowWrap}>
        <Text style={styles.label}>{label}</Text>
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
      <Text style={styles.label}>{label}</Text>
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
          <Text style={styles.pickerBtnText}>{display}</Text>
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
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${dateStr}, ${time}`;
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
  clearBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  clearText: { fontSize: font.base, color: colors.info },
});
