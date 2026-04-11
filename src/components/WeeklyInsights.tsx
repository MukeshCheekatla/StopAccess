import React from 'react';
import { View, Text } from 'react-native';
import { DailySnapshot } from '@stopaccess/types';

interface WeeklyInsightsProps {
  snapshots: DailySnapshot[];
  streak: number;
  styles: any;
}

export const WeeklyInsights: React.FC<WeeklyInsightsProps> = ({
  snapshots,
  styles,
}) => {
  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightTitle}>WEEKLY FOCUS</Text>
      <View style={styles.chart}>
        {snapshots.slice(-7).map((d, i) => {
          const height = Math.min((d.focusMinutes / 60) * 100, 100);
          const isToday = i === snapshots.length - 1;
          return (
            <View key={d.date} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    isToday && styles.barToday,
                    { height: `${height}%` },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(d.date).getDay()]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};
