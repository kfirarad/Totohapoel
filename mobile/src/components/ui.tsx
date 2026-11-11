import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View,
  type PressableProps, type StyleProp, type TextProps, type ViewStyle,
} from 'react-native';
import { fwd } from '@/lib/dir';
import { radius, useColors } from '@/lib/theme';


type TProps = TextProps & { muted?: boolean; bold?: boolean; size?: number; color?: string };
export function T({ muted, bold, size = 15, color, style, ...p }: TProps) {
  const c = useColors();
  return (
    <Text
      {...p}
      style={[{ color: color ?? (muted ? c.muted : c.ink), fontSize: size, fontWeight: bold ? '700' : '400', textAlign: 'left' }, style]}
    />
  );
}

export function Screen({ children, scroll = true, style }: { children: ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  // paddingBottom clears the floating native tab bar
  const inner = [{ padding: 16, paddingBottom: 110, gap: 12 }, style];
  return scroll ? (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={inner} contentInsetAdjustmentBehavior="automatic">
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, backgroundColor: c.bg }, inner]}>{children}</View>
  );
}

export const Loading = () => {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
      <ActivityIndicator />
    </View>
  );
};

type BtnProps = PressableProps & { title: string; kind?: 'primary' | 'outline' | 'ghost' | 'dark'; small?: boolean; loading?: boolean };
export function Button({ title, kind = 'outline', small, loading, disabled, style, ...p }: BtnProps) {
  const c = useColors();
  const bg = { primary: c.accent, dark: c.ink, outline: c.surface, ghost: 'transparent' }[kind];
  const fg = { primary: c.accentInk, dark: c.surface, outline: c.ink, ghost: c.accent }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      {...p}
      style={({ pressed }) => [
        {
          height: small ? 36 : 50, borderRadius: small ? radius.sm : radius.lg, paddingHorizontal: 14,
          backgroundColor: bg, borderWidth: kind === 'outline' ? 1.5 : 0, borderColor: c.ink,
          alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style as ViewStyle,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <T bold size={small ? 14 : 16} color={fg}>{title}</T>}
    </Pressable>
  );
}

export function Card({ children, style, onPress, fill }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; fill?: boolean }) {
  const c = useColors();
  const s = [{ borderRadius: radius.lg, padding: 12, backgroundColor: fill ? c.fill : c.surface, borderWidth: fill ? 0 : 1, borderColor: c.line }, style];
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.7 }]}>{children}</Pressable>
  ) : (
    <View style={s}>{children}</View>
  );
}

export function List({ children }: { children: ReactNode }) {
  const c = useColors();
  return <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, overflow: 'hidden' }}>{children}</View>;
}

type RowProps = { start?: ReactNode; title?: ReactNode; subtitle?: ReactNode; end?: ReactNode; onPress?: () => void; chevron?: boolean; highlight?: boolean; dim?: boolean; last?: boolean };
export function Row({ start, title, subtitle, end, onPress, chevron, highlight, dim, last }: RowProps) {
  const c = useColors();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 50,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderColor: c.line,
        backgroundColor: highlight ? c.accentSoft : pressed ? c.fill : 'transparent', opacity: dim ? 0.6 : 1,
      })}
    >
      {start}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {typeof title === 'string' ? <T bold numberOfLines={1}>{title}</T> : title}
        {typeof subtitle === 'string' ? <T muted size={13} numberOfLines={1}>{subtitle}</T> : subtitle}
      </View>
      {end}
      {chevron && <T muted size={20}>{fwd()}</T>}
    </Pressable>
  );
}

export function SwitchRow({ title, subtitle, value, onChange, last }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  const c = useColors();
  return <Row title={<T>{title}</T>} subtitle={subtitle} last={last} end={<Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent }} />} />;
}

export function Section({ children }: { children: string }) {
  return <T muted bold size={12} style={{ marginTop: 6, marginHorizontal: 4, textTransform: 'uppercase' }}>{children}</T>;
}

export function Segmented<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.fill, borderRadius: radius.sm, padding: 3, gap: 2 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', backgroundColor: on ? c.surface : 'transparent' }}
          >
            <T bold size={13.5} muted={!on} numberOfLines={1}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, accent, outline }: { label: string; accent?: boolean; outline?: boolean }) {
  const c = useColors();
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, flexShrink: 0, backgroundColor: outline ? 'transparent' : accent ? c.accentSoft : c.fill, borderWidth: outline ? 1 : 0, borderStyle: 'dashed', borderColor: c.muted }}>
      <T bold size={11.5} color={accent ? c.accent : c.muted}>{label}</T>
    </View>
  );
}

export function Avatar({ url, name, size = 32, square }: { url?: string | null; name?: string | null; size?: number; square?: boolean }) {
  const c = useColors();
  const r = square ? size * 0.28 : size / 2;
  if (url) return <Image source={url} style={{ width: size, height: size, borderRadius: r, backgroundColor: c.fill2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: c.fill2, alignItems: 'center', justifyContent: 'center' }}>
      <T bold muted size={size * 0.38}>{(name ?? '?').trim().slice(0, 2)}</T>
    </View>
  );
}
