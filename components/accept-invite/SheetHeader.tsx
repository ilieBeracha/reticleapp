import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { styles } from './styles';

interface SheetHeaderProps {
  onClose: () => void;
}

export function SheetHeader({ onClose }: SheetHeaderProps) {
  const colors = useColors();

  return (
    <View style={styles.sheetHeader}>
      <View style={[styles.grabber, { backgroundColor: colors.border }]} />
      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
