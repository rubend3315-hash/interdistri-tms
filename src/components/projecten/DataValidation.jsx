export class DataValidator {
    static validateBatch(data, rules) {
        return data.map(row => this.validateRow(row, rules));
    }

    static validateRow(row, rules) {
        const errors = [];
        let valid = true;

        rules.forEach(rule => {
            const value = row[rule.field];
            if (rule.required && (value === undefined || value === null || String(value).trim() === '')) {
                errors.push(`${rule.field} is verplicht.`);
                valid = false;
            }

            if (value !== undefined && value !== null && String(value).trim() !== '') {
                switch (rule.type) {
                    case 'number':
                        if (isNaN(Number(value))) {
                            errors.push(`${rule.field} moet een nummer zijn.`);
                            valid = false;
                        } else {
                            if (rule.min !== undefined && Number(value) < rule.min) {
                                errors.push(`${rule.field} moet minimaal ${rule.min} zijn.`);
                                valid = false;
                            }
                            if (rule.max !== undefined && Number(value) > rule.max) {
                                errors.push(`${rule.field} mag maximaal ${rule.max} zijn.`);
                                valid = false;
                            }
                        }
                        break;
                    case 'date':
                        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                            errors.push(`${rule.field} moet in het formaat YYYY-MM-DD zijn.`);
                            valid = false;
                        } else if (isNaN(new Date(value).getTime())) {
                            errors.push(`${rule.field} is geen geldige datum.`);
                            valid = false;
                        }
                        break;
                    case 'email':
                        if (!/\S+@\S+\.\S+/.test(value)) {
                            errors.push(`${rule.field} moet een geldig e-mailadres zijn.`);
                            valid = false;
                        }
                        break;
                    case 'time':
                        if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
                            errors.push(`${rule.field} moet in het formaat HH:MM zijn.`);
                            valid = false;
                        }
                        break;
                    case 'regex':
                        try {
                            const regex = new RegExp(rule.pattern);
                            if (!regex.test(value)) {
                                errors.push(`${rule.field} voldoet niet aan het verwachte patroon.`);
                                valid = false;
                            }
                        } catch (e) {
                            console.error(`Invalid regex pattern for field ${rule.field}: ${rule.pattern}`);
                            errors.push(`Interne validatiefout voor ${rule.field}.`);
                            valid = false;
                        }
                        break;
                    case 'enum':
                        if (rule.options && !rule.options.includes(value)) {
                            errors.push(`${rule.field} moet één van de volgende waarden zijn: ${rule.options.join(', ')}.`);
                            valid = false;
                        }
                        break;
                }
            }
        });

        return { row, valid, errors };
    }
}