import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function ValidatieRulesManager({ rules, onRulesChange }) {
  const addRule = () => {
    onRulesChange([...rules, { field: '', type: 'string', required: false }]);
  };

  const updateRule = (index, key, value) => {
    const newRules = [...rules];
    newRules[index][key] = value;
    onRulesChange(newRules);
  };

  const removeRule = (index) => {
    const newRules = rules.filter((_, i) => i !== index);
    onRulesChange(newRules);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Validatieregels
          <Button onClick={addRule} size="sm" variant="outline" className="gap-1">
            <PlusCircle className="w-4 h-4" /> Regel Toevoegen
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 && (
          <p className="text-sm text-gray-500">Geen validatieregels ingesteld.</p>
        )}
        {rules.map((rule, index) => (
          <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border rounded-md">
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
              <div>
                <Label htmlFor={`field-${index}`} className="text-xs">Veldnaam</Label>
                <Input
                  id={`field-${index}`}
                  value={rule.field}
                  onChange={(e) => updateRule(index, 'field', e.target.value)}
                  placeholder="Bijv. medewerker_email"
                />
              </div>
              <div>
                <Label htmlFor={`type-${index}`} className="text-xs">Type</Label>
                <Select
                  value={rule.type}
                  onValueChange={(value) => updateRule(index, 'type', value)}
                >
                  <SelectTrigger id={`type-${index}`}>
                    <SelectValue placeholder="Selecteer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">Tekst</SelectItem>
                    <SelectItem value="number">Getal</SelectItem>
                    <SelectItem value="date">Datum (YYYY-MM-DD)</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="time">Tijd (HH:MM)</SelectItem>
                    <SelectItem value="regex">Reguliere expressie</SelectItem>
                    <SelectItem value="enum">Voorgedefinieerde waarden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center pt-5">
                <Checkbox
                  id={`required-${index}`}
                  checked={rule.required}
                  onCheckedChange={(checked) => updateRule(index, 'required', checked)}
                />
                <Label htmlFor={`required-${index}`} className="ml-2 text-sm font-medium">Verplicht</Label>
              </div>

              {rule.type === 'number' && (
                <>
                  <div>
                    <Label htmlFor={`min-${index}`} className="text-xs">Min. waarde</Label>
                    <Input
                      id={`min-${index}`}
                      type="number"
                      value={rule.min || ''}
                      onChange={(e) => updateRule(index, 'min', Number(e.target.value))}
                      placeholder="Optioneel"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`max-${index}`} className="text-xs">Max. waarde</Label>
                    <Input
                      id={`max-${index}`}
                      type="number"
                      value={rule.max || ''}
                      onChange={(e) => updateRule(index, 'max', Number(e.target.value))}
                      placeholder="Optioneel"
                    />
                  </div>
                </>
              )}

              {rule.type === 'regex' && (
                <div>
                  <Label htmlFor={`pattern-${index}`} className="text-xs">Patroon (RegEx)</Label>
                  <Input
                    id={`pattern-${index}`}
                    value={rule.pattern || ''}
                    onChange={(e) => updateRule(index, 'pattern', e.target.value)}
                    placeholder="Bijv. ^NL\\d{9}B\\d{2}$ voor BTW nummer"
                  />
                </div>
              )}

              {rule.type === 'enum' && (
                <div>
                  <Label htmlFor={`options-${index}`} className="text-xs">Opties (komma-gescheiden)</Label>
                  <Input
                    id={`options-${index}`}
                    value={rule.options ? rule.options.join(', ') : ''}
                    onChange={(e) => updateRule(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                    placeholder="Bijv. actief, inactief, voltooid"
                  />
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeRule(index)} className="mt-4 sm:mt-0">
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}