import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DrumPicker } from '@/components/ui/DrumPicker';

interface DatePickerSheetProps {
  open: boolean;
  onClose: () => void;
  value: Date;
  onChange: (date: Date) => void;
  zIndex?: number;
}

export function DatePickerSheet({ open, onClose, value, onChange, zIndex }: DatePickerSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Дата и время"
      zIndex={zIndex}>
      <View style={drumWrapperStyle}>
        <DrumPicker value={value} onChange={onChange} />
      </View>
      <Pressable onPress={onClose} style={doneButtonStyle}>
        <Text style={doneTextStyle}>Готово</Text>
      </Pressable>
    </BottomSheet>
  );
}

const drumWrapperStyle: ViewStyle = {
  marginBottom: 16,
};

const doneButtonStyle: ViewStyle = {
  backgroundColor: Colors.accent,
  borderRadius: Radius.lg,
  paddingVertical: 13,
  alignItems: 'center',
};

const doneTextStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.md,
  color: '#ffffff',
};
