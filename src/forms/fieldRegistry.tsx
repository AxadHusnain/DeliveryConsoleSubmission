import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TemplateField } from '../types/template';
import { isSupportedField } from './validateForm';

export interface FieldRendererProps {
  field: TemplateField;
  value: string | string[] | undefined;
  error?: string;
  onChange: (fieldId: string, value: string | string[]) => void;
}

function FieldShell({ field, error, children }: { field: TemplateField; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>
        {field.label}
        {field.isRequired ? ' *' : ''}
      </Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function TextRenderer({ field, value, error, onChange }: FieldRendererProps) {
  return (
    <FieldShell field={field} error={error}>
      <TextInput
        style={styles.input}
        value={(value as string) ?? ''}
        onChangeText={text => onChange(field.id, text)}
      />
    </FieldShell>
  );
}

function TextAreaRenderer({ field, value, error, onChange }: FieldRendererProps) {
  return (
    <FieldShell field={field} error={error}>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={(value as string) ?? ''}
        onChangeText={text => onChange(field.id, text)}
        multiline
        numberOfLines={4}
      />
    </FieldShell>
  );
}

function DropdownRenderer({ field, value, error, onChange }: FieldRendererProps) {
  const options = field.options ?? [];
  return (
    <FieldShell field={field} error={error}>
      <View style={styles.optionsRow}>
        {options.map(option => {
          const selected = value === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange(field.id, option)}
            >
              <Text style={selected ? styles.chipTextSelected : styles.chipText}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </FieldShell>
  );
}

function CheckboxRenderer({ field, value, error, onChange }: FieldRendererProps) {
  const options = field.options ?? [];
  const selectedValues = Array.isArray(value) ? value : [];

  const toggle = (option: string) => {
    if (selectedValues.includes(option)) {
      const withoutOption = selectedValues.filter(v => v !== option);
      onChange(field.id, withoutOption);
    } else {
      onChange(field.id, [...selectedValues, option]);
    }
  };

  return (
    <FieldShell field={field} error={error}>
      <View style={styles.optionsRow}>
        {options.map(option => {
          const isOn = selectedValues.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[styles.chip, isOn && styles.chipSelected]}
              onPress={() => toggle(option)}
            >
              <Text style={isOn ? styles.chipTextSelected : styles.chipText}>
                {isOn ? '☑' : '☐'} {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </FieldShell>
  );
}

function DateTimeRenderer({ field, value, error, onChange }: FieldRendererProps) {
  return (
    <FieldShell field={field} error={error}>
      <View style={styles.optionsRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={(value as string) ?? ''}
          onChangeText={text => onChange(field.id, text)}
          placeholder="YYYY-MM-DDTHH:mm:ss±hh:mm"
        />
        <TouchableOpacity style={styles.nowButton} onPress={() => onChange(field.id, new Date().toISOString())}>
          <Text style={styles.chipText}>Now</Text>
        </TouchableOpacity>
      </View>
    </FieldShell>
  );
}

function UnsupportedRenderer({ field }: FieldRendererProps) {
  return (
    <FieldShell field={field}>
      <Text style={styles.unsupportedText}>Unsupported field type ("{field.type}") — skipped.</Text>
    </FieldShell>
  );
}

// type -> renderer. Adding a new field type means adding one entry here.
const registry: Record<string, React.ComponentType<FieldRendererProps>> = {
  TEXT: TextRenderer,
  TEXTAREA: TextAreaRenderer,
  DROPDOWN: DropdownRenderer,
  CHECKBOX: CheckboxRenderer,
  DATETIME: DateTimeRenderer,
};

export function renderField(
  field: TemplateField,
  answers: Record<string, string | string[] | undefined>,
  errors: Record<string, string>,
  onChange: (fieldId: string, value: string | string[]) => void,
): React.ReactElement {
  const Renderer = isSupportedField(field) ? registry[field.type] : UnsupportedRenderer;
  return (
    <Renderer key={field.id} field={field} value={answers[field.id]} error={errors[field.id]} onChange={onChange} />
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 16 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d3dbd8', borderRadius: 8, padding: 10, backgroundColor: 'white', color: '#16212c' },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  error: { color: '#c4453d', fontSize: 12, marginTop: 4 },
  optionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: '#d3dbd8', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  chipSelected: { backgroundColor: '#2e7bd6', borderColor: '#2e7bd6' },
  chipText: { color: '#16212c' },
  chipTextSelected: { color: 'white' },
  nowButton: { borderWidth: 1, borderColor: '#d3dbd8', borderRadius: 8, padding: 10 },
  unsupportedText: { color: '#7a8894', fontStyle: 'italic' },
});

