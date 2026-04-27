import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Constants from 'expo-constants';

import type { Category } from '@/types';
import { Colors, withAlpha } from '@/constants/colors';
import { FontFamily, FontSize, Radius, Spacing } from '@/constants/typography';
import { useStore } from '@/store/useStore';
import { sumAmount } from '@/utils/analytics';
import { fmt } from '@/utils/format';

import {
  CategoryEditSheet,
  type CategoryDraft,
} from '@/components/sheets/CategoryEditSheet';

export default function ProfileScreen() {
  const expenses = useStore((s) => s.expenses);
  const categories = useStore((s) => s.categories);
  const userName = useStore((s) => s.userName);
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);

  const [editing, setEditing] = useState<Category | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const totalAmount = sumAmount(expenses);
  const initial = userName.charAt(0).toUpperCase();
  const version = (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

  const handleSaveEdit = (draft: CategoryDraft) => {
    if (!editing) return;
    updateCategory(editing.id, draft);
    setEditing(null);
  };

  const handleDeleteEdit = () => {
    if (!editing) return;
    deleteCategory(editing.id);
    setEditing(null);
  };

  const handleCreate = (draft: CategoryDraft) => {
    addCategory(draft);
    setAddOpen(false);
  };

  return (
    <View style={containerStyle}>
      <ScrollView
        style={scrollStyle}
        contentContainerStyle={scrollContentStyle}
        showsVerticalScrollIndicator={false}>
        <Text style={titleStyle}>Профиль</Text>

        <View style={avatarCardStyle}>
          <View style={avatarStyle}>
            <Text style={avatarTextStyle}>{initial}</Text>
          </View>
          <View style={avatarMetaStyle}>
            <Text style={avatarNameStyle}>{userName}</Text>
            <Text style={avatarStatsStyle}>
              {expenses.length} записей · {fmt(totalAmount)}
            </Text>
          </View>
        </View>

        <Text style={sectionTitleStyle}>Категории</Text>
        <View style={categoryListStyle}>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setEditing(cat)}
              style={categoryRowStyle}>
              <View
                style={[
                  categoryIconStyle,
                  { backgroundColor: withAlpha(cat.color, 0.1) },
                ]}>
                <Text style={categoryIconTextStyle}>{cat.icon}</Text>
              </View>
              <Text style={categoryNameStyle} numberOfLines={1}>
                {cat.label}
              </Text>
              <View style={[colorDotStyle, { backgroundColor: cat.color }]} />
              <Text style={chevronStyle}>›</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => setAddOpen(true)} style={addButtonStyle}>
          <Text style={addButtonTextStyle}>+ Добавить категорию</Text>
        </Pressable>

        <Text style={versionStyle}>MoneySpender v{version}</Text>
      </ScrollView>

      <CategoryEditSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing}
        onSubmit={handleSaveEdit}
        onDelete={handleDeleteEdit}
      />

      <CategoryEditSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
      />
    </View>
  );
}

const containerStyle: ViewStyle = {
  flex: 1,
  backgroundColor: Colors.bg,
};

const scrollStyle: ViewStyle = {
  flex: 1,
};

const scrollContentStyle: ViewStyle = {
  paddingHorizontal: Spacing.screenH,
  paddingTop: Spacing.screenV,
  paddingBottom: 20,
};

const titleStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.xxl,
  color: Colors.text,
  letterSpacing: -0.5,
  marginBottom: 16,
};

const avatarCardStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 14,
  backgroundColor: Colors.surface,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: Colors.border,
  padding: 16,
  marginBottom: 12,
};

const avatarStyle: ViewStyle = {
  width: 52,
  height: 52,
  borderRadius: 18,
  backgroundColor: withAlpha(Colors.accent, 0.16),
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const avatarTextStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: 24,
  color: Colors.text,
};

const avatarMetaStyle: ViewStyle = {
  flex: 1,
  minWidth: 0,
};

const avatarNameStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.xl,
  color: Colors.text,
  marginBottom: 2,
};

const avatarStatsStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.sm,
  color: Colors.textMuted,
};

const sectionTitleStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.base,
  color: Colors.text,
  marginBottom: 10,
};

const categoryListStyle: ViewStyle = {
  flexDirection: 'column',
  gap: 6,
  marginBottom: 10,
};

const categoryRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.rowCompact,
  paddingVertical: 12,
  paddingHorizontal: 14,
};

const categoryIconStyle: ViewStyle = {
  width: 36,
  height: 36,
  borderRadius: Radius.md,
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const categoryIconTextStyle: TextStyle = {
  fontSize: 18,
};

const categoryNameStyle: TextStyle = {
  flex: 1,
  fontFamily: FontFamily.medium,
  fontSize: FontSize.md,
  color: Colors.text,
};

const colorDotStyle: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
  flexShrink: 0,
};

const chevronStyle: TextStyle = {
  fontSize: FontSize.md,
  color: Colors.textMuted,
};

const addButtonStyle: ViewStyle = {
  backgroundColor: Colors.surfaceHigh,
  borderWidth: 1.5,
  borderStyle: 'dashed',
  borderColor: Colors.borderMid,
  borderRadius: Radius.rowCompact,
  paddingVertical: 12,
  alignItems: 'center',
  marginBottom: 16,
};

const addButtonTextStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.md,
  color: Colors.textDim,
};

const versionStyle: TextStyle = {
  textAlign: 'center',
  fontFamily: FontFamily.regular,
  fontSize: FontSize.xs,
  color: Colors.textMuted,
};
