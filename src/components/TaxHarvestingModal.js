import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import TaxHarvestingTool from './TaxHarvestingTool';
import { colors } from '../theme/colors';

export default function TaxHarvestingModal({ visible, onClose }) {
  return (
    <Modal
      visible={Boolean(visible)}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeContainer}>
          <View style={styles.modalContent}>
            <TaxHarvestingTool onClose={onClose} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
  },
  safeContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0A0F1D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '94%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
});
