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

  const bubbleStyle = {
    backgroundColor: isUser ? colors.primary : colors.surface,
    borderColor: isUser ? colors.primary : colors.border,
    alignSelf: isUser ? ('flex-end' as const) : ('flex-start' as const),
    borderTopRightRadius: isUser ? 4 : 18,
    borderTopLeftRadius: isUser ? 18 : 4,
  };

  const textColor = isUser ? colors.primaryText : colors.text;
  const metaColor = isUser ? colors.primaryText : colors.textMuted;

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
        <Text style={[styles.meta, { color: metaColor, opacity: isUser ? 0.8 : 1 }]}>
          {meta}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    marginVertical: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  meta: {
    marginTop: 6,
    fontSize: 11,
  },
});

export default ChatBubble;
