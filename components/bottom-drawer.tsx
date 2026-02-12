import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const SPRING_CONFIG = {
  damping: 25,
  stiffness: 180,
  mass: 0.4,
  overshootClamping: false,
};

type BottomDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  initialHeight?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export function BottomDrawer({
  isOpen,
  onClose,
  children,
  initialHeight = 420,
}: BottomDrawerProps) {
  const { height: screenHeight } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [isModalVisible, setIsModalVisible] = useState(isOpen);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  const fallbackHeight = initialHeight < 1 ? screenHeight * initialHeight : initialHeight;
  const activeHeight = useMemo(() => {
    const base = measuredHeight > 0 ? measuredHeight : fallbackHeight;
    return Math.min(base, screenHeight * 0.9);
  }, [fallbackHeight, measuredHeight, screenHeight]);
  const snapPoint = -activeHeight;

  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  const scrollTo = useCallback(
    (destination: number) => {
      'worklet';
      translateY.value = withSpring(destination, SPRING_CONFIG, (finished) => {
        if (finished && destination === 0) {
          runOnJS(setIsModalVisible)(false);
        }
      });
    },
    [translateY]
  );

  useEffect(() => {
    if (isOpen) {
      setIsModalVisible(true);
      scrollTo(snapPoint);
    } else {
      scrollTo(0);
    }
  }, [isOpen, snapPoint, scrollTo]);

  useEffect(() => {
    if (isOpen) {
      scrollTo(snapPoint);
    }
  }, [activeHeight, isOpen, snapPoint, scrollTo]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = event.translationY + context.value.y;
      if (translateY.value < snapPoint) {
        translateY.value = snapPoint + (translateY.value - snapPoint) * 0.35;
      }
    })
    .onEnd((event) => {
      if (translateY.value > snapPoint + activeHeight / 3 || event.velocityY > 500) {
        runOnJS(onClose)();
      } else {
        scrollTo(snapPoint);
      }
    });

  const sheetStyle = useAnimatedStyle(() => {
    const borderRadius = interpolate(
      translateY.value,
      [snapPoint, 0],
      [24, 0],
      Extrapolation.CLAMP
    );

    return {
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
      transform: [{ translateY: translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, snapPoint],
      [0, 0.4],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <AnimatedPressable
          onPress={onClose}
          style={[styles.backdrop, backdropStyle]}
        />

        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                top: screenHeight,
                height: activeHeight,
                backgroundColor: theme.background,
                borderTopColor: 'rgba(0,0,0,0.04)',
              },
              sheetStyle,
            ]}>
            {Platform.OS === 'ios' && (
              <AnimatedBlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            )}

            <View
              style={[
                styles.sheetContent,
                { backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.9)' : theme.background },
              ]}>
              <View
                style={styles.inner}
                onLayout={(event) => {
                  const nextHeight = Math.ceil(event.nativeEvent.layout.height);
                  if (nextHeight > 0 && nextHeight !== measuredHeight) {
                    setMeasuredHeight(nextHeight);
                  }
                }}>
                <View style={styles.handleWrap}>
                  <View style={styles.handle} />
                </View>

                <View style={styles.content}>{children}</View>
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    width: '100%',
    overflow: 'hidden',
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 18,
    elevation: 6,
  },
  sheetContent: {
    flex: 1,
  },
  inner: {
    alignSelf: 'stretch',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.5)',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
