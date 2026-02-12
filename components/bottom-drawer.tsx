import * as React from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';

import { cn } from '@/src/lib/cn';

type BottomDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  height?: number;
};

export function BottomDrawer({ isOpen, onClose, children, height = 420 }: BottomDrawerProps) {
  const { height: screenHeight } = useWindowDimensions();
  const sheetHeight = Math.min(height, screenHeight * 0.9);
  const [visible, setVisible] = React.useState(isOpen);
  const translateY = React.useRef(new Animated.Value(sheetHeight)).current;

  React.useEffect(() => {
    if (isOpen) {
      setVisible(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(translateY, {
      toValue: sheetHeight,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }, [isOpen, sheetHeight, translateY]);

  const overlayOpacity = translateY.interpolate({
    inputRange: [0, sheetHeight],
    outputRange: [0.45, 0],
  });

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0" onPress={onClose}>
          <Animated.View className="flex-1 bg-black" style={{ opacity: overlayOpacity }} />
        </Pressable>

        <Animated.View style={{ transform: [{ translateY }], height: sheetHeight }}>
          <View
            className={cn(
              'h-full rounded-t-3xl border border-[#efe1d4] bg-[#fff7ef] px-5 pt-3 pb-6 shadow-xl'
            )}>
            <View className="items-center pb-3">
              <View className="h-1.5 w-12 rounded-full bg-[#d7c8bb]" />
            </View>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
