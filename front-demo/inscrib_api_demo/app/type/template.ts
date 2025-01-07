export interface TemplateField {
  type: string;
  description: string;
  properties?: {
    [key: string]: TemplateField;
  };
  items?: {
    type: string;
    properties?: {
      [key: string]: TemplateField;
    };
    required?: string[];
  };
  required?: string[];
}

export interface TemplateSchema {
  type: string;
  properties: {
    [key: string]: TemplateField;
  };
  required: string[];
}
