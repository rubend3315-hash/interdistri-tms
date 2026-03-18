import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SCHEMA_V2_3 = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "DailyPayrollReport",
  "description": "Interdistri TMS Daily Payroll Report — Schema v2.3 — DST aware + runtime validation",
  "type": "object",
  "required": ["schemaVersion", "reportType", "metadata", "reportDate", "period", "generatedAt", "employeeCount", "totals", "employees"],
  "properties": {
    "success": { "type": "boolean" },
    "schemaVersion": { "type": "string", "const": "2.3" },
    "reportType": { "type": "string", "const": "DAILY_PAYROLL" },
    "metadata": {
      "type": "object",
      "required": ["sourceSystem", "generatedBy", "timezone"],
      "properties": {
        "sourceSystem": { "type": "string" },
        "generatedBy": { "type": "string" },
        "timezone": { "type": "string" }
      }
    },
    "reportDate": { "type": "string", "format": "date" },
    "period": {
      "type": "object",
      "required": ["startDate", "endDate"],
      "properties": {
        "startDate": { "type": "string", "format": "date" },
        "endDate": { "type": "string", "format": "date" }
      }
    },
    "generatedAt": { "type": "string", "format": "date-time" },
    "employeeCount": { "type": "integer", "minimum": 0 },
    "totals": {
      "type": "object",
      "required": ["totalHours", "totalTripKilometers", "totalStandplaatsHours"],
      "properties": {
        "totalHours": { "type": "number" },
        "totalTripKilometers": { "type": "number" },
        "totalStandplaatsHours": { "type": "number" }
      }
    },
    "employees": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["employeeId", "name", "totals", "timeEntries", "trips", "standplaatsWerk"],
        "properties": {
          "employeeNumber": { "type": ["string", "null"] },
          "employeeId": { "type": "string" },
          "name": { "type": "string" },
          "department": { "type": ["string", "null"] },
          "totals": {
            "type": "object",
            "required": ["totalHours", "totalTripKilometers", "totalStandplaatsHours"],
            "properties": {
              "totalHours": { "type": "number" },
              "totalTripKilometers": { "type": "number" },
              "totalStandplaatsHours": { "type": "number" }
            }
          },
          "timeEntries": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["id", "employee_id", "date"],
              "properties": {
                "id": { "type": "string" },
                "employee_id": { "type": "string" },
                "date": { "type": ["string", "null"], "format": "date" },
                "end_date": { "type": ["string", "null"] },
                "week_number": { "type": ["integer", "null"] },
                "year": { "type": ["integer", "null"] },
                "start_time": { "type": ["string", "null"] },
                "end_time": { "type": ["string", "null"] },
                "break_minutes": { "type": "number" },
                "total_hours": { "type": "number" },
                "overtime_hours": { "type": "number" },
                "night_hours": { "type": "number" },
                "weekend_hours": { "type": "number" },
                "holiday_hours": { "type": "number" },
                "shift_type": { "type": ["string", "null"] },
                "project_id": { "type": ["string", "null"] },
                "customer_id": { "type": ["string", "null"] },
                "departure_location": { "type": ["string", "null"] },
                "return_location": { "type": ["string", "null"] },
                "departure_time": { "type": ["string", "null"] },
                "expected_return_time": { "type": ["string", "null"] },
                "subsistence_allowance": { "type": "number" },
                "advanced_costs": { "type": "number" },
                "meals": { "type": "number" },
                "wkr": { "type": "number" },
                "travel_allowance_multiplier": { "type": "number" },
                "notes": { "type": ["string", "null"] },
                "status": { "type": ["string", "null"] },
                "signature_url": { "type": ["string", "null"] },
                "submission_id": { "type": ["string", "null"] },
                "approved_by": { "type": ["string", "null"] },
                "approved_date": { "type": ["string", "null"] },
                "rejection_reason": { "type": ["string", "null"] },
                "edit_history": { "type": "array" },
                "created_date": { "type": ["string", "null"] },
                "updated_date": { "type": ["string", "null"] },
                "created_by": { "type": ["string", "null"] },
                "startDateTimeISO": { "type": ["string", "null"], "format": "date-time" },
                "endDateTimeISO": { "type": ["string", "null"], "format": "date-time" }
              }
            }
          },
          "trips": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["id", "employee_id", "date"],
              "properties": {
                "id": { "type": "string" },
                "employee_id": { "type": "string" },
                "time_entry_id": { "type": ["string", "null"] },
                "date": { "type": ["string", "null"], "format": "date" },
                "vehicle_id": { "type": ["string", "null"] },
                "customer_id": { "type": ["string", "null"] },
                "customer_name": { "type": ["string", "null"] },
                "project_id": { "type": ["string", "null"] },
                "route_name": { "type": ["string", "null"] },
                "planned_stops": { "type": ["number", "null"] },
                "completed_stops": { "type": ["number", "null"] },
                "start_km": { "type": ["number", "null"] },
                "end_km": { "type": ["number", "null"] },
                "total_km": { "type": ["number", "null"] },
                "fuel_liters": { "type": ["number", "null"] },
                "adblue_liters": { "type": ["number", "null"] },
                "fuel_km": { "type": ["number", "null"] },
                "charging_kwh": { "type": ["number", "null"] },
                "fuel_cost": { "type": ["number", "null"] },
                "cargo_description": { "type": ["string", "null"] },
                "cargo_weight": { "type": ["number", "null"] },
                "departure_time": { "type": ["string", "null"] },
                "arrival_time": { "type": ["string", "null"] },
                "departure_location": { "type": ["string", "null"] },
                "notes": { "type": ["string", "null"] },
                "status": { "type": ["string", "null"] },
                "created_date": { "type": ["string", "null"] },
                "updated_date": { "type": ["string", "null"] },
                "created_by": { "type": ["string", "null"] }
              }
            }
          },
          "standplaatsWerk": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["id"],
              "properties": {
                "id": { "type": "string" },
                "time_entry_id": { "type": ["string", "null"] },
                "employee_id": { "type": ["string", "null"] },
                "date": { "type": ["string", "null"], "format": "date" },
                "start_time": { "type": ["string", "null"] },
                "end_time": { "type": ["string", "null"] },
                "customer_id": { "type": ["string", "null"] },
                "project_id": { "type": ["string", "null"] },
                "activity_id": { "type": ["string", "null"] },
                "notes": { "type": ["string", "null"] },
                "created_date": { "type": ["string", "null"] },
                "updated_date": { "type": ["string", "null"] },
                "created_by": { "type": ["string", "null"] }
              }
            }
          }
        }
      }
    }
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && !['ADMIN', 'HR_ADMIN'].includes(user.business_role)) {
      return Response.json({ error: 'Forbidden: alleen admin en hr_admin' }, { status: 403 });
    }

    const jsonString = JSON.stringify(SCHEMA_V2_3, null, 2);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(jsonString);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const fileBase64 = btoa(binary);

    return Response.json({
      success: true,
      fileName: 'DailyPayrollReportSchema_v2.3.json',
      fileBase64,
    });
  } catch (error) {
    console.error('downloadDailyPayrollSchema error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});