// App-wide undo affordance. Mount <UndoProvider> near the root; call
// useUndo().showUndo(message, onUndo) from anywhere. A single floating bar
// renders above the tab bar.

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '@/src/lib/theme';

type UndoState = { message: string; onUndo: () => void } | null;

type Ctx = { showUndo: (message: string, onUndo: () => void) => void };

const UndoContext = createContext<Ctx | null>(null);

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<UndoState>(null);
  const timerRef = useRef<any>(null);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setState(null);
  }, []);

  const showUndo = useCallback((message: string, onUndo: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ message, onUndo });
    timerRef.current = setTimeout(() => setState(null), 4000);
  }, []);

  const handleUndo = useCallback(() => {
    if (state) state.onUndo();
    clear();
  }, [state, clear]);

  return (
    <UndoContext.Provider value={{ showUndo }}>
      {children}
      {state ? (
        <View style={[styles.bar, { bottom: insets.bottom + 70, pointerEvents: 'box-none' }]} testID="undo-bar">
          <View style={styles.inner}>
            <Text style={styles.msg} numberOfLines={1}>
              {state.message}
            </Text>
            <Pressable onPress={handleUndo} testID="undo-btn" hitSlop={10}>
              <Text style={styles.action}>Undo</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </UndoContext.Provider>
  );
}

export function useUndo(): Ctx {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error('useUndo must be used inside UndoProvider');
  return ctx;
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
  },
  inner: {
    backgroundColor: colors.onSurface,
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  msg: { color: colors.onBrandPrimary, fontSize: font.base, flex: 1 },
  action: { color: colors.info, fontSize: font.base, fontWeight: '600', marginLeft: spacing.md },
});
