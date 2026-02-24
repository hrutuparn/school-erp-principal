import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList
} from 'react-native';
import colors from './colors';

const standards = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const divisions = ['A', 'B', 'C', 'D', 'E'];

export default function ClassDropdown({ onSelect, selectedClass = '10A' }) {
  const [showStandardPicker, setShowStandardPicker] = useState(false);
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);
  const [standard, setStandard] = useState('10th');
  const [division, setDivision] = useState('A');

  const updateClass = (newStandard, newDivision) => {
    const stdNumber = newStandard.replace('th', '').replace('rd', '').replace('nd', '').replace('st', '');
    const className = stdNumber + newDivision;
    onSelect(className);
  };

  const selectStandard = (item) => {
    setStandard(item);
    setShowStandardPicker(false);
    updateClass(item, division);
  };

  const selectDivision = (item) => {
    setDivision(item);
    setShowDivisionPicker(false);
    updateClass(standard, item);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Class</Text>
      <View style={styles.row}>
        <TouchableOpacity 
          style={styles.pickerButton}
          onPress={() => setShowStandardPicker(true)}
        >
          <Text style={styles.pickerButtonText}>{standard}</Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.pickerButton}
          onPress={() => setShowDivisionPicker(true)}
        >
          <Text style={styles.pickerButtonText}>Div {division}</Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Standard Picker Modal */}
      <Modal visible={showStandardPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Standard</Text>
            <FlatList
              data={standards}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => selectStandard(item)}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowStandardPicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Division Picker Modal */}
      <Modal visible={showDivisionPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Division</Text>
            <FlatList
              data={divisions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => selectDivision(item)}
                >
                  <Text style={styles.modalItemText}>Division {item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDivisionPicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 5,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerButton: {
    flex: 0.48,
    backgroundColor: colors.lightGray,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  dropdownIcon: {
    fontSize: 12,
    color: colors.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  modalCloseButton: {
    marginTop: 15,
    paddingVertical: 12,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
});