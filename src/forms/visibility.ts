import { FormAnswers, TemplateField } from '../types/template';

export function isFieldVisible(field: TemplateField, answers: FormAnswers): boolean {
  if (!field.visibleWhen) {
    return true; 
  }
  const controllingAnswer = answers[field.visibleWhen.fieldId];
  return controllingAnswer === field.visibleWhen.equals;
}

export function visibleFields(fields: TemplateField[], answers: FormAnswers): TemplateField[] {
  return fields.filter(field => isFieldVisible(field, answers));
}


export function stripHiddenAnswers(fields: TemplateField[], answers: FormAnswers): FormAnswers {
  const visible = visibleFields(fields, answers);

  const visibleIds = new Set<string>();
  for (const field of visible) {
    visibleIds.add(field.id);
  }

  const result: FormAnswers = {};
  for (const [fieldId, value] of Object.entries(answers)) {
    if (visibleIds.has(fieldId)) {
      result[fieldId] = value;
    }
  }
  return result;
}
