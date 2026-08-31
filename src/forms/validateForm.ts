import { FormAnswers, PodTemplate, TemplateField } from '../types/template';
import { visibleFields } from './visibility';

const KNOWN_TYPES = ['TEXT', 'TEXTAREA', 'DROPDOWN', 'CHECKBOX', 'DATETIME'];

export function isSupportedField(field: TemplateField): boolean {
  if (!KNOWN_TYPES.includes(field.type)) {
    return false; 
  }
  const needsOptions = field.type === 'DROPDOWN' || field.type === 'CHECKBOX';
  if (needsOptions && (!field.options || field.options.length === 0)) {
    return false; 
  }
  return true;
}

function isAnswerEmpty(value: string | string[] | undefined): boolean {
  if (value === undefined) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return value.trim().length === 0;
}

export type FormErrors = Record<string, string>;

export function validateForm(template: PodTemplate, answers: FormAnswers): FormErrors {
  const errors: FormErrors = {};
  const fieldsToCheck = visibleFields(template.fields, answers);

  for (const field of fieldsToCheck) {
    if (!isSupportedField(field)) {
      continue; 
    }
    if (field.isRequired && isAnswerEmpty(answers[field.id])) {
      errors[field.id] = `${field.label} is required`;
    }
  }

  return errors;
}

export function isFormValid(template: PodTemplate, answers: FormAnswers): boolean {
  const errors = validateForm(template, answers);
  return Object.keys(errors).length === 0;
}
