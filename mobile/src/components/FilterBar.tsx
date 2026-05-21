import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import type { TodoListParams, TodoPriority, TodoStatus } from '../api/types';

type SortKey = NonNullable<TodoListParams['sort']>;

type Props = {
  search: string;
  onSearchChange: (next: string) => void;
  status: TodoStatus | 'all';
  onStatusChange: (next: TodoStatus | 'all') => void;
  priority: TodoPriority | 'all';
  onPriorityChange: (next: TodoPriority | 'all') => void;
  sort: SortKey;
  onSortChange: (next: SortKey) => void;
};

const statusOptions: Array<{ key: TodoStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
];

const priorityOptions: Array<{ key: TodoPriority | 'all'; label: string }> = [
  { key: 'all', label: 'Any priority' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: 'created_desc', label: 'Newest' },
  { key: 'created_asc', label: 'Oldest' },
  { key: 'due_date_asc', label: 'Due soon' },
  { key: 'due_date_desc', label: 'Due latest' },
];

const Chip: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
}> = ({ label, active, onPress }) => {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: colors.text, borderColor: colors.text }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text
        style={{
          color: active ? colors.textInverse : colors.text,
          fontWeight: '600',
          fontSize: 13,
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const FilterBar: React.FC<Props> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  sort,
  onSortChange,
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.searchGlyph, { color: colors.textMuted }]}>⌕</Text>
        <TextInput
          style={[styles.search, { color: colors.text }]}
          placeholder="Search tasks…"
          placeholderTextColor={colors.placeholder}
          value={search}
          onChangeText={onSearchChange}
          autoCorrect={false}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {statusOptions.map((o) => (
          <Chip
            key={o.key}
            label={o.label}
            active={status === o.key}
            onPress={() => onStatusChange(o.key)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {priorityOptions.map((o) => (
          <Chip
            key={o.key}
            label={o.label}
            active={priority === o.key}
            onPress={() => onPriorityChange(o.key)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {sortOptions.map((o) => (
          <Chip
            key={o.key}
            label={o.label}
            active={sort === o.key}
            onPress={() => onSortChange(o.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    marginBottom: 14,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  searchGlyph: {
    fontSize: 16,
    marginRight: 8,
  },
  search: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  row: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
});

export default FilterBar;
