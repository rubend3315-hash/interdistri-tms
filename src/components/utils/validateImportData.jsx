// Validation rules for imported data
export const validationRules = {
  'Ritnummer': { type: 'string', required: false },
  'Ritje': { type: 'string', required: false },
  'Datum': { type: 'date', required: false },
  'Depot': { type: 'string', required: true },
  'Ritmaam': { type: 'string', required: false },
  'Ondernemer': { type: 'string', required: false },
  'Chauffeur': { type: 'string', required: false },
  'Week': { type: 'number', required: false, min: 1, max: 53 },
  'Vrijgegeven': { type: 'time', required: false },
  'Aangekomen': { type: 'time', required: false },
  'Eerste stop': { type: 'time', required: false },
  'Laatste stop': { type: 'time', required: false },
};

export function validateImportData(data, columns) {
  const errors = [];
  
  data.forEach((row, rowIndex) => {
    const rowErrors = [];
    
    Object.keys(validationRules).forEach(field => {
      const rule = validationRules[field];
      const value = row[field];
      
      // Check required fields
      if (rule.required && (!value || value.toString().trim() === '')) {
        rowErrors.push(`${field}: vereist veld is leeg`);
      }
      
      // Skip validation if field is not required and empty
      if (!value || value.toString().trim() === '') {
        return;
      }
      
      // Validate data types
      switch (rule.type) {
        case 'number':
          if (isNaN(Number(value))) {
            rowErrors.push(`${field}: moet een getal zijn`);
          } else {
            const num = Number(value);
            if (rule.min !== undefined && num < rule.min) {
              rowErrors.push(`${field}: moet minstens ${rule.min} zijn`);
            }
            if (rule.max !== undefined && num > rule.max) {
              rowErrors.push(`${field}: mag niet hoger dan ${rule.max} zijn`);
            }
          }
          break;
          
        case 'date':
          const dateRegex = /^\d{1,2}-\d{1,2}-\d{4}$/;
          if (!dateRegex.test(value.toString())) {
            rowErrors.push(`${field}: ongeldige datumformat (DD-MM-YYYY verwacht)`);
          }
          break;
          
        case 'time':
          const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(value.toString())) {
            rowErrors.push(`${field}: ongeldige tijdformat (HH:MM verwacht)`);
          }
          break;
      }
    });
    
    if (rowErrors.length > 0) {
      errors.push({
        row: rowIndex + 1,
        errors: rowErrors
      });
    }
  });
  
  return errors;
}