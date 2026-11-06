import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

export default function WhaleAvatar({
  imageSource,
  avatarText = 'W',
  gradient = ['#3B82F6', '#1D4ED8'],
  size = 50,
  borderColor = 'rgba(255, 255, 255, 0.2)',
}) {
  const borderRadius = size / 2;

  if (imageSource) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius,
            borderColor,
          },
        ]}
      >
        <Image
          source={imageSource}
          style={{
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
          }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={gradient}
      style={[
        styles.gradientAvatar,
        {
          width: size,
          height: size,
          borderRadius,
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: Math.max(12, size * 0.38) }]}>
        {avatarText}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardSecondary,
    overflow: 'hidden',
  },
  gradientAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
