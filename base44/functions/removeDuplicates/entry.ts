import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Only admins or specific user can remove duplicates
        if (user?.role !== 'admin' && user?.email !== 'rubend3315@gmail.com') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { database = 'prod' } = await req.json();
        const dataEnv = database === 'dev' ? 'dev' : undefined;

        const results = {
            removed: {
                employees: 0,
                vehicles: 0,
                customers: 0,
                niwo_permits: 0,
                contracts: 0,
                time_entries: 0,
                trips: 0,
                schedules: 0,
                cao_rules: 0,
                salary_tables: 0,
                holidays: 0
            },
            errors: []
        };

        // Remove duplicate employees (keep oldest based on created_date)
        console.log('Checking employees for duplicates...');
        const employees = await base44.asServiceRole.entities.Employee.list(undefined, undefined, dataEnv);
        const employeeGroups = {};
        for (const emp of employees) {
            const key = `${emp.first_name}_${emp.last_name}_${emp.date_of_birth || 'no_dob'}`;
            if (!employeeGroups[key]) {
                employeeGroups[key] = [];
            }
            employeeGroups[key].push(emp);
        }
        for (const group of Object.values(employeeGroups)) {
            if (group.length > 1) {
                // Sort by created_date and keep the oldest
                group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                for (let i = 1; i < group.length; i++) {
                    try {
                        await base44.asServiceRole.entities.Employee.delete(group[i].id, dataEnv);
                        results.removed.employees++;
                    } catch (error) {
                        results.errors.push(`Employee ${group[i].id}: ${error.message}`);
                    }
                }
            }
        }

        // Remove duplicate vehicles (by license_plate)
        console.log('Checking vehicles for duplicates...');
        const vehicles = await base44.asServiceRole.entities.Vehicle.list(undefined, undefined, dataEnv);
        const vehicleGroups = {};
        for (const vehicle of vehicles) {
            if (!vehicleGroups[vehicle.license_plate]) {
                vehicleGroups[vehicle.license_plate] = [];
            }
            vehicleGroups[vehicle.license_plate].push(vehicle);
        }
        for (const group of Object.values(vehicleGroups)) {
            if (group.length > 1) {
                group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                for (let i = 1; i < group.length; i++) {
                    try {
                        await base44.asServiceRole.entities.Vehicle.delete(group[i].id, dataEnv);
                        results.removed.vehicles++;
                    } catch (error) {
                        results.errors.push(`Vehicle ${group[i].id}: ${error.message}`);
                    }
                }
            }
        }

        // Remove duplicate customers (by company_name)
        console.log('Checking customers for duplicates...');
        const customers = await base44.asServiceRole.entities.Customer.list(undefined, undefined, dataEnv);
        const customerGroups = {};
        for (const customer of customers) {
            if (!customerGroups[customer.company_name]) {
                customerGroups[customer.company_name] = [];
            }
            customerGroups[customer.company_name].push(customer);
        }
        for (const group of Object.values(customerGroups)) {
            if (group.length > 1) {
                group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                for (let i = 1; i < group.length; i++) {
                    try {
                        await base44.asServiceRole.entities.Customer.delete(group[i].id, dataEnv);
                        results.removed.customers++;
                    } catch (error) {
                        results.errors.push(`Customer ${group[i].id}: ${error.message}`);
                    }
                }
            }
        }

        // Remove duplicate NIWO permits (by permit_number)
        console.log('Checking NIWO permits for duplicates...');
        const niwoPermits = await base44.asServiceRole.entities.NiwoPermit.list(undefined, undefined, dataEnv);
        const niwoGroups = {};
        for (const permit of niwoPermits) {
            if (!niwoGroups[permit.permit_number]) {
                niwoGroups[permit.permit_number] = [];
            }
            niwoGroups[permit.permit_number].push(permit);
        }
        for (const group of Object.values(niwoGroups)) {
            if (group.length > 1) {
                group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                for (let i = 1; i < group.length; i++) {
                    try {
                        await base44.asServiceRole.entities.NiwoPermit.delete(group[i].id, dataEnv);
                        results.removed.niwo_permits++;
                    } catch (error) {
                        results.errors.push(`NiwoPermit ${group[i].id}: ${error.message}`);
                    }
                }
            }
        }

        // Remove duplicate contracts (by employee_id + contract_number)
        console.log('Checking contracts for duplicates...');
        const contracts = await base44.asServiceRole.entities.Contract.list(undefined, undefined, dataEnv);
        const contractGroups = {};
        for (const contract of contracts) {
            const key = `${contract.employee_id}_${contract.contract_number}`;
            if (!contractGroups[key]) {
                contractGroups[key] = [];
            }
            contractGroups[key].push(contract);
        }
        for (const group of Object.values(contractGroups)) {
            if (group.length > 1) {
                group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                for (let i = 1; i < group.length; i++) {
                    try {
                        await base44.asServiceRole.entities.Contract.delete(group[i].id, dataEnv);
                        results.removed.contracts++;
                    } catch (error) {
                        results.errors.push(`Contract ${group[i].id}: ${error.message}`);
                    }
                }
            }
        }

        // Remove duplicate time entries (by employee_id + date + start_time)
        console.log('Checking time entries for duplicates...');
        const timeEntries = await base44.asServiceRole.entities.TimeEntry.list(undefined, undefined, dataEnv);
        const timeEntryGroups = {};
        for (const entry of timeEntries) {
            const key = `${entry.employee_id}_${entry.date}_${entry.start_time}`;
            if (!timeEntryGroups[key]) {
                timeEntryGroups[key] = [];
            }
            timeEntryGroups[key].push(entry);
        }
        for (const group of Object.values(timeEntryGroups)) {
            if (group.length > 1) {
                group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                for (let i = 1; i < group.length; i++) {
                    try {
                        await base44.asServiceRole.entities.TimeEntry.delete(group[i].id, dataEnv);
                        results.removed.time_entries++;
                    } catch (error) {
                        results.errors.push(`TimeEntry ${group[i].id}: ${error.message}`);
                    }
                }
            }
        }

        // Remove duplicate trips (by employee_id + vehicle_id + date + start_km)
        console.log('Checking trips for duplicates...');
        const trips = await base44.asServiceRole.entities.Trip.list(undefined, undefined, dataEnv);
        const tripGroups = {};
        for (const trip of trips) {
            const key = `${trip.employee_id}_${trip.vehicle_id}_${trip.date}_${trip.start_km}`;
            if (!tripGroups[key]) {
                tripGroups[key] = [];
            }
            tripGroups[key].push(trip);
        }
        for (const group of Object.values(tripGroups)) {
            if (group.length > 1) {
                group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                for (let i = 1; i < group.length; i++) {
                    try {
                        await base44.asServiceRole.entities.Trip.delete(group[i].id, dataEnv);
                        results.removed.trips++;
                    } catch (error) {
                        results.errors.push(`Trip ${group[i].id}: ${error.message}`);
                    }
                }
            }
        }

        // Remove duplicate schedules (by employee_id + week_number + year)
        console.log('Checking schedules for duplicates...');
        const schedules = await base44.asServiceRole.entities.Schedule.list(undefined, undefined, dataEnv);
        const scheduleGroups = {};
        for (const schedule of schedules) {
            const key = `${schedule.employee_id}_${schedule.week_number}_${schedule.year}`;
            if (!scheduleGroups[key]) {
                scheduleGroups[key] = [];
            }
            scheduleGroups[key].push(schedule);
        }
        for (const group of Object.values(scheduleGroups)) {
            if (group.length > 1) {
                group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                for (let i = 1; i < group.length; i++) {
                    try {
                        await base44.asServiceRole.entities.Schedule.delete(group[i].id, dataEnv);
                        results.removed.schedules++;
                    } catch (error) {
                        results.errors.push(`Schedule ${group[i].id}: ${error.message}`);
                    }
                }
            }
        }

        // Remove duplicate CAO rules (by name)
        console.log('Checking CAO rules for duplicates...');
        const caoRules = await base44.asServiceRole.entities.CaoRule.list(undefined, undefined, dataEnv);
        const caoGroups = {};
        for (const rule of caoRules) {
            if (!caoGroups[rule.name]) {
                caoGroups[rule.name] = [];
            }
            caoGroups[rule.name].push(rule);
        }
        for (const group of Object.values(caoGroups)) {
            if (group.length > 1) {
                group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                for (let i = 1; i < group.length; i++) {
                    try {
                        await base44.asServiceRole.entities.CaoRule.delete(group[i].id, dataEnv);
                        results.removed.cao_rules++;
                    } catch (error) {
                        results.errors.push(`CaoRule ${group[i].id}: ${error.message}`);
                    }
                }
            }
        }

        // Remove duplicate salary tables (by name + scale + step)
        console.log('Checking salary tables for duplicates...');
        const salaryTables = await base44.asServiceRole.entities.SalaryTable.list(undefined, undefined, dataEnv);
        const salaryGroups = {};
        for (const table of salaryTables) {
            const key = `${table.name}_${table.scale}_${table.step}`;
            if (!salaryGroups[key]) {
                salaryGroups[key] = [];
            }
            salaryGroups[key].push(table);
        }
        for (const group of Object.values(salaryGroups)) {
            if (group.length > 1) {
                group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                for (let i = 1; i < group.length; i++) {
                    try {
                        await base44.asServiceRole.entities.SalaryTable.delete(group[i].id, dataEnv);
                        results.removed.salary_tables++;
                    } catch (error) {
                        results.errors.push(`SalaryTable ${group[i].id}: ${error.message}`);
                    }
                }
            }
        }

        // Remove duplicate holidays (by name + date + year)
        console.log('Checking holidays for duplicates...');
        const holidays = await base44.asServiceRole.entities.Holiday.list(undefined, undefined, dataEnv);
        const holidayGroups = {};
        for (const holiday of holidays) {
            const key = `${holiday.name}_${holiday.date}_${holiday.year}`;
            if (!holidayGroups[key]) {
                holidayGroups[key] = [];
            }
            holidayGroups[key].push(holiday);
        }
        for (const group of Object.values(holidayGroups)) {
            if (group.length > 1) {
                group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                for (let i = 1; i < group.length; i++) {
                    try {
                        await base44.asServiceRole.entities.Holiday.delete(group[i].id, dataEnv);
                        results.removed.holidays++;
                    } catch (error) {
                        results.errors.push(`Holiday ${group[i].id}: ${error.message}`);
                    }
                }
            }
        }

        return Response.json({
            success: true,
            message: `Duplicaten succesvol verwijderd uit ${database === 'dev' ? 'Test' : 'Productie'}`,
            details: results
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});