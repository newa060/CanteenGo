import React from 'react';
import { ActivityIndicator, Pressable, Text, TextStyle, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  let bgColor: string = Colors.primary;
  let textColor: string = Colors.white;
  let borderColor: string = 'transparent';

  if (variant === 'secondary') {
    bgColor = Colors.elevated;
    textColor = Colors.onSurface;
  } else if (variant === 'danger') {
    bgColor = Colors.danger;
    textColor = Colors.white;
  } else if (variant === 'outline') {
    bgColor = Colors.transparent;
    textColor = Colors.primary;
    borderColor = Colors.primary;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: disabled ? Colors.elevatedHigh : bgColor,
          borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: 8,
          paddingVertical: 14,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text
          style={[
            {
              color: disabled ? Colors.onSurfaceDim : textColor,
              fontSize: 16,
              fontWeight: '700',
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};
