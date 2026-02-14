import * as React from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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
  const translateY = useSharedValue(sheetHeight);

  React.useEffect(() => {
    if (isOpen) {
      setVisible(true);
      translateY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
      return;
    }

    translateY.value = withTiming(
      sheetHeight,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setVisible)(false);
      }
    );
  }, [isOpen, sheetHeight, translateY]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, sheetHeight], [0.45, 0], Extrapolation.CLAMP),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const gesture = React.useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          const next = Math.max(0, event.translationY);
          translateY.value = next;
        })
        .onEnd((event) => {
          const shouldClose = event.translationY > sheetHeight * 0.25 || event.velocityY > 800;
          if (shouldClose) {
            translateY.value = withTiming(
              sheetHeight,
              { duration: 180, easing: Easing.in(Easing.cubic) },
              (finished) => {
                if (finished) runOnJS(setVisible)(false);
                runOnJS(onClose)();
              }
            );
            return;
          }
          translateY.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
        }),
    [onClose, sheetHeight, translateY]
  );

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0" onPress={onClose}>
          <Animated.View className="flex-1 bg-black" style={overlayStyle} />
        </Pressable>

        <GestureDetector gesture={gesture}>
          <Animated.View style={[{ height: sheetHeight }, sheetStyle]}>
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
        </GestureDetector>
      </View>
    </Modal>
  );
}
