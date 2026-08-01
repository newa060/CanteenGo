import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { Colors } from '../../constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text
          style={{
            color: Colors.onSurfaceMuted,
            fontSize: 12,
            fontFamily: 'JetBrainsMono-Medium',
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={Colors.onSurfaceDim}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          {
            backgroundColor: Colors.surface,
            borderColor: error ? Colors.danger : focused ? Colors.primary : Colors.borderDefault,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: Colors.onSurface,
            fontSize: 16,
          },
          style,
        ]}
        {...props}
      />
      {error && (
        <Text style={{ color: Colors.danger, fontSize: 12, marginTop: 4 }}>
          {error}
        </Text>
      )}
    </View>
  );
};
