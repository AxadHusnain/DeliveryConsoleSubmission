import React, { useRef, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { routeController } from '../route/routeController';
import { useRouteSnapshot } from '../route/useRouteSnapshot';
import { FormAnswers } from '../types/template';
import { renderField } from '../forms/fieldRegistry';
import { stripHiddenAnswers, visibleFields } from '../forms/visibility';
import { validateForm } from '../forms/validateForm';

interface Props {
  onDone: () => void;
}

export function ProofOfDeliveryScreen({ onDone }: Props) {
  const snapshot = useRouteSnapshot();
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [submitted, setSubmitted] = useState(false);
  const alreadySubmitting = useRef(false);

  const stop = routeController.getActiveStop();
  const template = stop ? routeController.getTemplateForStop(stop) : undefined;

  if (!stop || !template) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text>{snapshot.route ? 'No active stop to deliver to.' : 'Loading…'}</Text>
          <TouchableOpacity onPress={onDone}>
            <Text style={styles.link}>Back to route</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const errors = validateForm(template, answers);
  const hasErrors = Object.keys(errors).length > 0;

  const onChange = (fieldId: string, value: string | string[]) => {
    const updated = { ...answers, [fieldId]: value };
    setAnswers(stripHiddenAnswers(template.fields, updated));
  };

  const onSubmit = async () => {
    // Checked synchronously, before any `await` — blocks a second rapid tap
    // from creating a duplicate delivery, regardless of render timing.
    if (hasErrors || alreadySubmitting.current) {
      return;
    }
    alreadySubmitting.current = true;
    await routeController.submitProofOfDelivery(answers);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.confirmTitle}>Saved locally — will sync</Text>
          <Text style={styles.confirmSubtitle}>
            {snapshot.isOnline ? 'Syncing in the background now.' : "You're offline — this will sync automatically once you're back online."}
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={onDone}>
            <Text style={styles.buttonText}>Continue route</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>{template.name}</Text>
        <Text style={styles.subtitle}>{stop.customerName} · {stop.address}</Text>

        {visibleFields(template.fields, answers).map(field => renderField(field, answers, errors, onChange))}

        <TouchableOpacity
          style={[styles.primaryButton, hasErrors && styles.buttonDisabled]}
          onPress={onSubmit}
        >
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDone}>
          <Text style={styles.link}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f4f3' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#7a8894', marginBottom: 16 },
  primaryButton: { backgroundColor: '#2e7bd6', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { backgroundColor: '#b0bec5' },
  buttonText: { color: 'white', fontWeight: '600' },
  link: { color: '#2e7bd6', textAlign: 'center', marginTop: 12 },
  confirmTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  confirmSubtitle: { color: '#41505e', textAlign: 'center', marginBottom: 16 },
});
