import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
    <View style={styles.pinContainer}>
      <Text style={styles.appTitle}>WashTrack</Text>
      <Text style={styles.pinSubtitle}>Car Wash Manager</Text>
      <Text style={styles.pinLabel}>Enter PIN to continue</Text>

      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
        ))}
      </View>

      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map((key, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.key, key === '' && styles.keyEmpty]}
            onPress={() => {
              if (key === 'DEL') handleDelete();
              else if (key !== '') handleDigit(key);
            }}
            disabled={key === ''}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, key === 'DEL' && styles.keyDel]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [authenticated, setAuthenticated] = useState(false);

  if (!authenticated) {
    return (
      <>
        <StatusBar style="dark" />
        <PinScreen onSuccess={() => setAuthenticated(true)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  pinContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1a73e8',
    letterSpacing: 1,
  },
  pinSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 40,
    marginTop: 4,
  },
  pinLabel: {
    fontSize: 16,
    color: '#444',
    marginBottom: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 48,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1a73e8',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#1a73e8',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    rowGap: 16,
    columnGap: 16,
    justifyContent: 'center',
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyEmpty: {
    backgroundColor: 'transparent',
  },
  keyText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#222',
  },
  keyDel: {
    fontSize: 18,
    color: '#e53935',
  },
});
