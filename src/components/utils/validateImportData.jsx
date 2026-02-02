// Validation rules for imported data
export const validationRules = {
  'Ritnummer': { type: 'string', required: false },
  'Ritje': { type: 'string', required: false },
  'Datum': { type: 'date', required: true },
  'Depot': { type: 'string', required: true },
  'Ritmaam': { type: 'string', required: false },
  'Ondernemer': { type: 'string', required: false },
  'Chauffeur': { type: 'string', required: false },
  'Week': { type: 'number', required: false, min: 1, max: 53 },
  'Vrijgegeven': { type: 'time', required: false },
  'Aangekomen': { type: 'time', required: false },
  'Eerste stop': { type: 'time', required: false },
  'Laatste stop': { type: 'time', required: false },
  'Aantal colli': { type: 'number', required: false, min: 0 },
  'Aantal stops': { type: 'number', required: false, min: 0 },
  'Afstand': { type: 'number', required: false, min: 0 },
};

export function validateImportData(data, columns) {
  const errors = [];
  const MAX_ERRORS_PER_ROW = 3; // Beperken aantal foutmeldingen per rij voor duidelijkheid
  
  data.forEach((row, rowIndex) => {
    const rowErrors = [];
    
    Object.keys(validationRules).forEach(field => {
      const rule = validationRules[field];
      const value = row[field];
      
      // Check required fields
      if (rule.required && (!value || value.toString().trim() === '')) {
        rowErrors.push(`${field}: vereist veld is leeg`);
        return;
      }
      
      // Skip validation if field is not required and empty
      if (!value || value.toString().trim() === '') {
        return;
      }
      
      // Validate data types
      switch (rule.type) {
        case 'number':
          const numValue = Number(value);
          if (isNaN(numValue)) {
            rowErrors.push(`${field}: moet een getal zijn (ontvangen: "${value}")`);
          } else {
            if (rule.min !== undefined && numValue < rule.min) {
              rowErrors.push(`${field}: minimum waarde is ${rule.min}`);
            }
            if (rule.max !== undefined && numValue > rule.max) {
              rowErrors.push(`${field}: maximum waarde is ${rule.max}`);
            }
          }
          break;
          
        case 'date':
          const dateString = value.toString().trim();
          // Accept DD-MM-YYYY, YYYY-MM-DD, Excel numbers, or ISO dates
          const dateRegex = /^(\d{1,2}-\d{1,2}-\d{4}|\d{4}-\d{1,2}-\d{1,2}|\d+|[\dT:.\-Z]+)$/;
          if (!dateRegex.test(dateString)) {
            rowErrors.push(`${field}: ongeldige datumformat (verwacht: DD-MM-YYYY)`);
          } else {
            // Validate if date is reasonable (not too old or in future)
            try {
              let dateObj;
              if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString)) {
                const [day, month, year] = dateString.split('-');
                dateObj = new Date(year, month - 1, day);
              } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateString)) {
                dateObj = new Date(dateString);
              } else if (!isNaN(Number(dateString)) && dateString.length < 10) {
                // Excel date number
                dateObj = new Date((Number(dateString) - 25569) * 86400 * 1000);
              } else {
                dateObj = new Date(dateString);
              }
              
              if (isNaN(dateObj.getTime())) {
                rowErrors.push(`${field}: ongeldige datumwaarde`);
              } else if (dateObj.getFullYear() < 2000 || dateObj.getFullYear() > 2100) {
                rowErrors.push(`${field}: jaar moet tussen 2000 en 2100 liggen`);
              }
            } catch {
              rowErrors.push(`${field}: kan datum niet verwerken`);
            }
          }
          break;
          
        case 'time':
          const timeString = value.toString().trim();
          const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(timeString)) {
            rowErrors.push(`${field}: ongeldige tijdformat (verwacht: HH:MM)`);
          }
          break;
      }
    });
    
    // Beperken aantal foutmeldingen per rij voor leesbaarheid
    if (rowErrors.length > 0) {
      const displayErrors = rowErrors.slice(0, MAX_ERRORS_PER_ROW);
      if (rowErrors.length > MAX_ERRORS_PER_ROW) {
        displayErrors.push(`... en ${rowErrors.length - MAX_ERRORS_PER_ROW} meer fout(en)`);
      }
      
      errors.push({
        row: rowIndex + 1,
        errors: displayErrors
      });
    }
  });
  
  return errors;
}