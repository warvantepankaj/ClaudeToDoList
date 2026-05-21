import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';

type Props = {
  role: 'user' | 'assistant';
  text: string;
  meta?: string;
  pending?: boolean;
};

const ChatBubble: React.FC<Props> = ({ role, text, meta, pending }) => {
  const { colors } = useTheme();
  const isUser = role === 'user';

  const bubbleStyle = isUser
    ? {
        backgroundColor: colors.text,
        borderColor: colors.text,
        alignSelf: 'flex-end' as const,
        borderTopRightRadius: 6,
        borderTopLeftRadius: 20,
      }
    : {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        alignSelf: 'flex-start' as const,
        borderTopRightRadius: 20,
        borderTopLeftRadius: 6,
      };

  const textColor = isUser ? colors.textInverse : colors.text;
  const metaColor = isUser ? colors.textInverse : colors.textMuted;

  return (
    <View style={[styles.bubble, bubbleStyle]}>
      {pending ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor }]} selectable>
          {text}
        </Text>
      )}
      {meta && !pending && (
        <Text style={[styles.meta, { color: metaColor, opacity: isUser ? 0.7 : 1 }]}>
          {meta}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '84%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  meta: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default ChatBubble;
