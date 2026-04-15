import { C } from '@/constants/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

declare global {
  var lastPinTime: number | undefined;
}

const CORRECT_PIN = '1234';

function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('');

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === CORRECT_PIN) {
          onSuccess();
        } else {
          Alert.alert('Wrong PIN', 'Please try again.');
          setPin('');
        }
      }, 150);
    }
  };

  const handleDelete = () => setPin(p => p.slice(0, -1));

  return (
    <View style={s.container}>
      {/* Banner */}
      <Image
        source={require('@/assets/akash-water-service-banner.png')}
        style={s.banner}
        resizeMode="contain"
      />

      <Text style={s.enterLabel}>Enter PIN to continue</Text>

      {/* Dots */}
      <View style={s.dotsRow}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[s.dot, pin.length > i && s.dotFilled]} />
        ))}
      </View>

      {/* Keypad */}
      <View style={s.keypad}>
        {['1','2','3','4','5','6','7','8','9','','0','DEL'].map((key, idx) => (
          <TouchableOpacity
            key={idx}
            style={[s.key, key === '' && s.keyEmpty]}
            onPress={() => { if (key === 'DEL') handleDelete(); else if (key) handleDigit(key); }}
            disabled={key === ''}
            activeOpacity={0.7}
          >
            <Text style={[s.keyText, key === 'DEL' && s.keyDel]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPinExpiry();
  }, []);

  const checkPinExpiry = () => {
    try {
      const lastPinTime = global.lastPinTime;
      if (lastPinTime) {
        const currentTime = Date.now();
        const fourHoursInMs = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

        if (currentTime - lastPinTime < fourHoursInMs) {
          // Less than 4 hours have passed, skip PIN
          setAuthenticated(true);
          setLoading(false);
          return;
        }
      }
      // Either no previous PIN or 4+ hours have passed, show PIN screen
      setLoading(false);
    } catch (error) {
      console.error('Error checking PIN expiry:', error);
      setLoading(false);
    }
  };

  const handlePinSuccess = () => {
    try {
      global.lastPinTime = Date.now();
      setAuthenticated(true);
    } catch (error) {
      console.error('Error saving PIN time:', error);
      setAuthenticated(true);
    }
  };

  if (loading) {
    return (
      <View style={s.container}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (!authenticated) {
    return (
      <>
        <StatusBar style="dark" />
        <PinScreen onSuccess={handlePinSuccess} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', paddingBottom: 48, paddingHorizontal: 24 },
  banner: { width: 280, height: 140, marginBottom: 32 },
  enterLabel: { fontSize: 16, fontWeight: '600', color: C.textSec, marginBottom: 24 },
  dotsRow: { flexDirection: 'row', gap: 20, marginBottom: 40 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: C.accent, backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: C.accent },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 288, rowGap: 14, columnGap: 14, justifyContent: 'center' },
  key: { width: 82, height: 82, borderRadius: 41, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  keyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText: { fontSize: 26, fontWeight: '700', color: C.primary },
  keyDel: { fontSize: 16, color: C.danger },
});
