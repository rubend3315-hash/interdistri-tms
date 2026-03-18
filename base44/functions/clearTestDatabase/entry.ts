import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Only admins or specific user can clear test database
        if (user?.role !== 'admin' && user?.email !== 'rubend3315@gmail.com') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const results = {
            deleted: {
                employees: 0,
                vehicles: 0,
                niwo_permits: 0,
                customers: 0,
                articles: 0,
                ti_model_routes: 0,
                routes: 0,
                customer_imports: 0,
                projects: 0,
                cao_rules: 0,
                salary_tables: 0,
                holidays: 0,
                contracts: 0,
                time_entries: 0,
                trips: 0,
                schedules: 0,
                shift_times: 0,
                vehicle_inspections: 0,
                expenses: 0,
                messages: 0,
                supervisor_messages: 0,
                notifications: 0
            },
            errors: []
        };

        // Delete entities in reverse dependency order
        console.log('Deleting notifications...');
        const notifications = await base44.asServiceRole.entities.Notification.list(undefined, undefined, 'dev');
        for (const entity of notifications) {
            try {
                await base44.asServiceRole.entities.Notification.delete(entity.id, 'dev');
                results.deleted.notifications++;
            } catch (error) {
                results.errors.push(`Notification ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting supervisor messages...');
        const supervisorMessages = await base44.asServiceRole.entities.SupervisorMessage.list(undefined, undefined, 'dev');
        for (const entity of supervisorMessages) {
            try {
                await base44.asServiceRole.entities.SupervisorMessage.delete(entity.id, 'dev');
                results.deleted.supervisor_messages++;
            } catch (error) {
                results.errors.push(`SupervisorMessage ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting messages...');
        const messages = await base44.asServiceRole.entities.Message.list(undefined, undefined, 'dev');
        for (const entity of messages) {
            try {
                await base44.asServiceRole.entities.Message.delete(entity.id, 'dev');
                results.deleted.messages++;
            } catch (error) {
                results.errors.push(`Message ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting expenses...');
        const expenses = await base44.asServiceRole.entities.Expense.list(undefined, undefined, 'dev');
        for (const entity of expenses) {
            try {
                await base44.asServiceRole.entities.Expense.delete(entity.id, 'dev');
                results.deleted.expenses++;
            } catch (error) {
                results.errors.push(`Expense ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting vehicle inspections...');
        const inspections = await base44.asServiceRole.entities.VehicleInspection.list(undefined, undefined, 'dev');
        for (const entity of inspections) {
            try {
                await base44.asServiceRole.entities.VehicleInspection.delete(entity.id, 'dev');
                results.deleted.vehicle_inspections++;
            } catch (error) {
                results.errors.push(`VehicleInspection ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting shift times...');
        const shiftTimes = await base44.asServiceRole.entities.ShiftTime.list(undefined, undefined, 'dev');
        for (const entity of shiftTimes) {
            try {
                await base44.asServiceRole.entities.ShiftTime.delete(entity.id, 'dev');
                results.deleted.shift_times++;
            } catch (error) {
                results.errors.push(`ShiftTime ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting schedules...');
        const schedules = await base44.asServiceRole.entities.Schedule.list(undefined, undefined, 'dev');
        for (const entity of schedules) {
            try {
                await base44.asServiceRole.entities.Schedule.delete(entity.id, 'dev');
                results.deleted.schedules++;
            } catch (error) {
                results.errors.push(`Schedule ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting trips...');
        const trips = await base44.asServiceRole.entities.Trip.list(undefined, undefined, 'dev');
        for (const entity of trips) {
            try {
                await base44.asServiceRole.entities.Trip.delete(entity.id, 'dev');
                results.deleted.trips++;
            } catch (error) {
                results.errors.push(`Trip ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting time entries...');
        const timeEntries = await base44.asServiceRole.entities.TimeEntry.list(undefined, undefined, 'dev');
        for (const entity of timeEntries) {
            try {
                await base44.asServiceRole.entities.TimeEntry.delete(entity.id, 'dev');
                results.deleted.time_entries++;
            } catch (error) {
                results.errors.push(`TimeEntry ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting contracts...');
        const contracts = await base44.asServiceRole.entities.Contract.list(undefined, undefined, 'dev');
        for (const entity of contracts) {
            try {
                await base44.asServiceRole.entities.Contract.delete(entity.id, 'dev');
                results.deleted.contracts++;
            } catch (error) {
                results.errors.push(`Contract ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting holidays...');
        const holidays = await base44.asServiceRole.entities.Holiday.list(undefined, undefined, 'dev');
        for (const entity of holidays) {
            try {
                await base44.asServiceRole.entities.Holiday.delete(entity.id, 'dev');
                results.deleted.holidays++;
            } catch (error) {
                results.errors.push(`Holiday ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting salary tables...');
        const salaryTables = await base44.asServiceRole.entities.SalaryTable.list(undefined, undefined, 'dev');
        for (const entity of salaryTables) {
            try {
                await base44.asServiceRole.entities.SalaryTable.delete(entity.id, 'dev');
                results.deleted.salary_tables++;
            } catch (error) {
                results.errors.push(`SalaryTable ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting CAO rules...');
        const caoRules = await base44.asServiceRole.entities.CaoRule.list(undefined, undefined, 'dev');
        for (const entity of caoRules) {
            try {
                await base44.asServiceRole.entities.CaoRule.delete(entity.id, 'dev');
                results.deleted.cao_rules++;
            } catch (error) {
                results.errors.push(`CaoRule ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting projects...');
        const projects = await base44.asServiceRole.entities.Project.list(undefined, undefined, 'dev');
        for (const entity of projects) {
            try {
                await base44.asServiceRole.entities.Project.delete(entity.id, 'dev');
                results.deleted.projects++;
            } catch (error) {
                results.errors.push(`Project ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting customer imports...');
        const imports = await base44.asServiceRole.entities.CustomerImport.list(undefined, undefined, 'dev');
        for (const entity of imports) {
            try {
                await base44.asServiceRole.entities.CustomerImport.delete(entity.id, 'dev');
                results.deleted.customer_imports++;
            } catch (error) {
                results.errors.push(`CustomerImport ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting routes...');
        const routes = await base44.asServiceRole.entities.Route.list(undefined, undefined, 'dev');
        for (const entity of routes) {
            try {
                await base44.asServiceRole.entities.Route.delete(entity.id, 'dev');
                results.deleted.routes++;
            } catch (error) {
                results.errors.push(`Route ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting TI Model routes...');
        const tiRoutes = await base44.asServiceRole.entities.TIModelRoute.list(undefined, undefined, 'dev');
        for (const entity of tiRoutes) {
            try {
                await base44.asServiceRole.entities.TIModelRoute.delete(entity.id, 'dev');
                results.deleted.ti_model_routes++;
            } catch (error) {
                results.errors.push(`TIModelRoute ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting articles...');
        const articles = await base44.asServiceRole.entities.Article.list(undefined, undefined, 'dev');
        for (const entity of articles) {
            try {
                await base44.asServiceRole.entities.Article.delete(entity.id, 'dev');
                results.deleted.articles++;
            } catch (error) {
                results.errors.push(`Article ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting customers...');
        const customers = await base44.asServiceRole.entities.Customer.list(undefined, undefined, 'dev');
        for (const entity of customers) {
            try {
                await base44.asServiceRole.entities.Customer.delete(entity.id, 'dev');
                results.deleted.customers++;
            } catch (error) {
                results.errors.push(`Customer ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting NIWO permits...');
        const niwoPermits = await base44.asServiceRole.entities.NiwoPermit.list(undefined, undefined, 'dev');
        for (const entity of niwoPermits) {
            try {
                await base44.asServiceRole.entities.NiwoPermit.delete(entity.id, 'dev');
                results.deleted.niwo_permits++;
            } catch (error) {
                results.errors.push(`NiwoPermit ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting vehicles...');
        const vehicles = await base44.asServiceRole.entities.Vehicle.list(undefined, undefined, 'dev');
        for (const entity of vehicles) {
            try {
                await base44.asServiceRole.entities.Vehicle.delete(entity.id, 'dev');
                results.deleted.vehicles++;
            } catch (error) {
                results.errors.push(`Vehicle ${entity.id}: ${error.message}`);
            }
        }

        console.log('Deleting employees...');
        const employees = await base44.asServiceRole.entities.Employee.list(undefined, undefined, 'dev');
        for (const entity of employees) {
            try {
                await base44.asServiceRole.entities.Employee.delete(entity.id, 'dev');
                results.deleted.employees++;
            } catch (error) {
                results.errors.push(`Employee ${entity.id}: ${error.message}`);
            }
        }

        return Response.json({
            success: true,
            message: 'Test database succesvol geleegd',
            details: results
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});