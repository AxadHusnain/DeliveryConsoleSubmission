export type FieldType = 'TEXT' | 'TEXTAREA' | 'DROPDOWN' | 'CHECKBOX' | 'DATETIME';

export interface VisibleWhen {
  fieldId: string;
  equals: string;
}

export interface TemplateField {
  id: string;
  label: string;
  type: string; 
  isRequired: boolean;
  options?: string[]; 
  visibleWhen?: VisibleWhen;
}

export interface PodTemplate {
  templateId: string;
  name: string;
  fields: TemplateField[];
}


export type FormAnswers = Record<string, string | string[] | undefined>;
