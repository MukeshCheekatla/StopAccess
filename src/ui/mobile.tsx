import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../components/theme';

export function AppScreen({
  children,
  padded = true,
  scroll = false,
  contentStyle,
}: {
  children: React.ReactNode;
  padded?: boolean;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}) {
  const content = (
    <View className={padded ? 'flex-1 px-5' : 'flex-1'} style={contentStyle}>
      {children}
    </View>
  );

  if (scroll) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <ScrollView
          className="flex-1 bg-bg"
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
        >
          <View className={padded ? 'px-5' : undefined}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView className="flex-1 bg-bg">{content}</SafeAreaView>;
}

export function ScreenHeader({
  title,
  subtitle,
  style,
}: {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}) {
  return (
    <View className="mb-8" style={style}>
      <Text className="text-[34px] font-black tracking-tightest text-white">
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-1 text-sm font-semibold text-muted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionEyebrow({
  label,
  right,
  style,
}: {
  label: string;
  right?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      className="mb-4 mt-2 flex-row items-center justify-between"
      style={style}
    >
      <Text className="text-[11px] font-black uppercase tracking-[2px] text-muted/60">
        {label}
      </Text>
      {right}
    </View>
  );
}

export function SurfaceCard({
  children,
  style,
  className = '',
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}) {
  return (
    <View
      className={`rounded-3xl border border-border bg-card ${className}`.trim()}
      style={style}
    >
      {children}
    </View>
  );
}

export function IconChip({
  icon,
  label,
  color = COLORS.accent,
}: {
  icon: string;
  label: string;
  color?: string;
}) {
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-[10px] px-2.5 py-1"
      style={{ backgroundColor: color + '15' }}
    >
      <Icon name={icon} size={16} color={color} />
      <Text className="text-[11px] font-black uppercase" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  tone = 'accent',
  style,
  textStyle,
}: {
  label: string;
  onPress?: () => void;
  icon?: string;
  tone?: 'accent' | 'danger';
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  const isDanger = tone === 'danger';
  const dangerBorderStyle = isDanger
    ? ({ borderWidth: 1, borderColor: COLORS.red + '40' } as const)
    : undefined;
  return (
    <TouchableOpacity
      className={`h-14 flex-row items-center justify-center gap-2 rounded-[18px] ${
        isDanger ? 'bg-[#CF66791A]' : 'bg-accent'
      }`}
      style={[dangerBorderStyle, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon ? (
        <Icon name={icon} size={18} color={isDanger ? COLORS.red : COLORS.bg} />
      ) : null}
      <Text
        className={`text-sm font-black uppercase tracking-[1px] ${
          isDanger ? 'text-red' : 'text-black'
        }`}
        style={textStyle}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
