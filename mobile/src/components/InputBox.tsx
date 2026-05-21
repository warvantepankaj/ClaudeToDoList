import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useTheme } from '../context/ThemeContext';

type Props = TextInputProps & {
  onSend?: () => void;
  sending?: boolean;
  sendLabel?: string;
};

const InputBox: React.FC<Props> = ({
  onSend,
  sending = false,
  sendLabel = '↑',
  style,
  ...inputProps
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <TextInput
        placeholderTextColor={colors.placeholder}
        style={[styles.input, { color: colors.text }, style]}
        multiline
        {...inputProps}
      />
      {onSend && (
        <Pressable
          onPress={onSend}
          disabled={sending}
          style={({ pressed }) => [
            styles.send,
            {
              backgroundColor: colors.primary,
              opacity: pressed || sending ? 0.85 : 1,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator color={colors.primaryText} size="small" />
          ) : (
            <Text style={{ color: colors.primaryText, fontSize: 20, fontWeight: '900' }}>
              {sendLabel}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 28,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    maxHeight: 140,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});

export default InputBox;
