import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../services/supabase';
import { t } from '../services/i18n';

const colors = {
  background: '#F5F0E8',
  white: '#FFFFFF',
  text: '#2C3E50',
  orange: '#F39C12',
  teal: '#1ABC9C',
  green: '#27AE60',
  gray: '#95A5A6',
  lightGray: '#ECF0F1',
  red: '#E74C3C'
};

export default function MealManagementScreen({ onBack, lang }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [meal, setMeal] = useState(null);
  const [menuItems, setMenuItems] = useState('');
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const allergensList = [
    { id: 'peanuts', label: '🥜 Peanuts / Groundnuts' },
    { id: 'milk', label: '🥛 Milk / Dairy' },
    { id: 'wheat', label: '🌾 Wheat / Gluten' },
    { id: 'egg', label: '🥚 Egg' },
    { id: 'soy', label: '🫘 Soybeans' },
    { id: 'nuts', label: '🌰 Tree Nuts' }
  ];

  useEffect(() => {
    fetchMealForDate();
  }, [selectedDate]);

  async function fetchMealForDate() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('midday_meal')
        .select('*')
        .eq('date', selectedDate)
        .limit(1);

      if (!error && data && data.length > 0) {
        setMeal(data[0]);
        setMenuItems(data[0].menu_items);
        setSelectedAllergens(data[0].allergens ? data[0].allergens.split(',').map(s => s.trim()) : []);
      } else {
        setMeal(null);
        setMenuItems('');
        setSelectedAllergens([]);
      }
    } catch (e) {
      console.log('Error fetching meal:', e.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleAllergen = (allergenId) => {
    if (selectedAllergens.includes(allergenId)) {
      setSelectedAllergens(selectedAllergens.filter(a => a !== allergenId));
    } else {
      setSelectedAllergens([...selectedAllergens, allergenId]);
    }
  };

  const handleSaveMeal = async () => {
    if (!menuItems.trim()) {
      Alert.alert('Error', 'Please describe the meal menu items.');
      return;
    }

    setSaving(true);
    try {
      // Resolve principal school_id
      let schoolId = 'SCH_MH_27430012'; // default
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: principalData } = await supabase
          .from('principals')
          .select('school_id')
          .eq('principal_id', user.id)
          .single();
        if (principalData && principalData.school_id) {
          schoolId = principalData.school_id;
        }
      }

      const allergensStr = selectedAllergens.join(',');

      const payload = {
        school_id: schoolId,
        date: selectedDate,
        menu_items: menuItems.trim(),
        allergens: allergensStr
      };

      let error;
      if (meal) {
        // Update existing
        const { error: err } = await supabase
          .from('midday_meal')
          .update(payload)
          .eq('meal_id', meal.meal_id);
        error = err;
      } else {
        // Insert new
        const { error: err } = await supabase
          .from('midday_meal')
          .insert([payload]);
        error = err;
      }

      if (error) throw error;

      Alert.alert('Success', 'Mid-day meal menu saved successfully!');
      fetchMealForDate();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeal = async () => {
    if (!meal) return;
    
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this mid-day meal menu?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await supabase
                .from('midday_meal')
                .delete()
                .eq('meal_id', meal.meal_id);

              if (error) throw error;
              Alert.alert('Success', 'Menu deleted.');
              fetchMealForDate();
            } catch (e) {
              Alert.alert('Delete Failed', e.message);
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleAdjustDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🍱 Mid-Day Meal Menu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.contentContainer} keyboardShouldPersistTaps="handled">
        {/* Date Selector Box */}
        <View style={styles.dateCard}>
          <Text style={styles.label}>Select Menu Date</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity onPress={() => handleAdjustDate(-1)} style={styles.arrowBtn}>
              <Text style={styles.arrowText}>◀</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.dateInput}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.gray}
            />
            <TouchableOpacity onPress={() => handleAdjustDate(1)} style={styles.arrowBtn}>
              <Text style={styles.arrowText}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.orange} style={{ marginVertical: 40 }} />
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.cardHeader}>
              {meal ? '✏️ Modify Meal Record' : '🍲 Log New Meal'}
            </Text>

            <Text style={styles.fieldLabel}>Lunch Food Items</Text>
            <TextInput
              style={styles.inputArea}
              placeholder="e.g. Steamed Rice, Vegetable Sambar, Boiled Egg, and Milk"
              value={menuItems}
              onChangeText={setMenuItems}
              multiline
              numberOfLines={4}
              placeholderTextColor={colors.gray}
              textAlignVertical="top"
            />

            <Text style={styles.fieldLabel}>Allergen Triggers Present</Text>
            <Text style={styles.helperText}>
              Select any allergens present in today's menu to automatically alert teachers and safeguard children.
            </Text>

            <View style={styles.allergenSelectorList}>
              {allergensList.map((alg) => {
                const selected = selectedAllergens.includes(alg.id);
                return (
                  <TouchableOpacity
                    key={alg.id}
                    style={[styles.allergenCheckbox, selected && styles.allergenCheckboxSelected]}
                    onPress={() => toggleAllergen(alg.id)}
                  >
                    <Text style={[styles.checkboxLabel, selected && styles.checkboxLabelSelected]}>
                      {alg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.orange }]}
              onPress={handleSaveMeal}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving...' : '💾 Save Mid-Day Menu'}
              </Text>
            </TouchableOpacity>

            {meal && (
              <TouchableOpacity 
                style={styles.deleteBtn}
                onPress={handleDeleteMeal}
                disabled={saving}
              >
                <Text style={styles.deleteBtnText}>🗑️ Delete Menu Log</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  dateCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray,
    marginBottom: 8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  arrowText: {
    fontSize: 14,
    color: colors.text,
  },
  dateInput: {
    width: 130,
    height: 40,
    textAlign: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.lightGray,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  formCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray,
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputArea: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 90,
    marginBottom: 10,
  },
  helperText: {
    fontSize: 11,
    color: colors.gray,
    marginBottom: 10,
    lineHeight: 16,
  },
  allergenSelectorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    marginBottom: 15,
  },
  allergenCheckbox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  allergenCheckboxSelected: {
    borderColor: colors.red,
    backgroundColor: '#E74C3C15',
  },
  checkboxLabel: {
    fontSize: 12,
    color: colors.text,
  },
  checkboxLabelSelected: {
    color: colors.red,
    fontWeight: 'bold',
  },
  saveBtn: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteBtn: {
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteBtnText: {
    color: colors.red,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
