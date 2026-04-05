import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from './theme';

interface SetupNudgeProps {
  configured: boolean;
  hasRules: boolean;
  refreshing: boolean;
  styles: any;
}

export const SetupNudge: React.FC<SetupNudgeProps> = ({
  configured,
  hasRules,
  refreshing,
  styles,
}) => {
  const navigation = useNavigation<any>();

  if (refreshing || (configured && hasRules)) {
    return null;
  }

  return (
    <View style={styles.nudgeCard}>
      <Text style={styles.nudgeTitle}>Focus Protocol Inactive</Text>
      <Text style={styles.nudgeSub}>
        {configured
          ? 'No apps are currently being protected. Add some to start your focus journey.'
          : 'Your engine is not configured yet. Set up NextDNS to unlock full protection.'}
      </Text>
      <TouchableOpacity
        style={styles.nudgeBtn}
        onPress={() => navigation.navigate(configured ? 'Apps' : 'Settings')}
      >
        <Text style={styles.nudgeBtnTxt}>COMPLETE SETUP</Text>
        <Icon name="arrow-right" size={20} color={COLORS.accent} />
      </TouchableOpacity>
    </View>
  );
};
