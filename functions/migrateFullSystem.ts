import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const results = {
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
            errors: []
        };

        const entityMappings = {};

        // 1. Migrate base entities first (no dependencies)
        console.log('Migrating employees...');
        const employees = await base44.asServiceRole.entities.Employee.list();
        for (const entity of employees) {
            try {
                const { id, created_date, updated_date, created_by, ...data } = entity;
                const newEntity = await base44.asServiceRole.entities.Employee.create(data, 'dev');
                entityMappings[`employee_${id}`] = newEntity.id;
                results.employees++;
            } catch (error) {
                results.errors.push(`Employee ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating vehicles...');
        const vehicles = await base44.asServiceRole.entities.Vehicle.list();
        for (const entity of vehicles) {
            try {
                const { id, created_date, updated_date, created_by, ...data } = entity;
                const newEntity = await base44.asServiceRole.entities.Vehicle.create(data, 'dev');
                entityMappings[`vehicle_${id}`] = newEntity.id;
                results.vehicles++;
            } catch (error) {
                results.errors.push(`Vehicle ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating NIWO permits...');
        const niwoPermits = await base44.asServiceRole.entities.NiwoPermit.list();
        for (const entity of niwoPermits) {
            try {
                const { id, created_date, updated_date, created_by, assigned_vehicle_id, ...data } = entity;
                const newData = {
                    ...data,
                    assigned_vehicle_id: assigned_vehicle_id ? entityMappings[`vehicle_${assigned_vehicle_id}`] : null
                };
                const newEntity = await base44.asServiceRole.entities.NiwoPermit.create(newData, 'dev');
                entityMappings[`niwo_${id}`] = newEntity.id;
                results.niwo_permits++;
            } catch (error) {
                results.errors.push(`NiwoPermit ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating customers...');
        const customers = await base44.asServiceRole.entities.Customer.list();
        for (const entity of customers) {
            try {
                const { id, created_date, updated_date, created_by, ...data } = entity;
                const newEntity = await base44.asServiceRole.entities.Customer.create(data, 'dev');
                entityMappings[`customer_${id}`] = newEntity.id;
                results.customers++;
            } catch (error) {
                results.errors.push(`Customer ${entity.id}: ${error.message}`);
            }
        }

        // 2. Migrate dependent entities
        console.log('Migrating articles...');
        const articles = await base44.asServiceRole.entities.Article.list();
        for (const entity of articles) {
            try {
                const { id, created_date, updated_date, created_by, customer_id, ...data } = entity;
                const newData = {
                    ...data,
                    customer_id: customer_id ? entityMappings[`customer_${customer_id}`] : null
                };
                await base44.asServiceRole.entities.Article.create(newData, 'dev');
                results.articles++;
            } catch (error) {
                results.errors.push(`Article ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating TI Model routes...');
        const tiRoutes = await base44.asServiceRole.entities.TIModelRoute.list();
        for (const entity of tiRoutes) {
            try {
                const { id, created_date, updated_date, created_by, customer_id, ...data } = entity;
                const newData = {
                    ...data,
                    customer_id: customer_id ? entityMappings[`customer_${customer_id}`] : null
                };
                await base44.asServiceRole.entities.TIModelRoute.create(newData, 'dev');
                results.ti_model_routes++;
            } catch (error) {
                results.errors.push(`TIModelRoute ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating routes...');
        const routes = await base44.asServiceRole.entities.Route.list();
        for (const entity of routes) {
            try {
                const { id, created_date, updated_date, created_by, customer_id, ...data } = entity;
                const newData = {
                    ...data,
                    customer_id: customer_id ? entityMappings[`customer_${customer_id}`] : null
                };
                await base44.asServiceRole.entities.Route.create(newData, 'dev');
                results.routes++;
            } catch (error) {
                results.errors.push(`Route ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating customer imports...');
        const imports = await base44.asServiceRole.entities.CustomerImport.list();
        for (const entity of imports) {
            try {
                const { id, created_date, updated_date, created_by, customer_id, ...data } = entity;
                const newData = {
                    ...data,
                    customer_id: customer_id ? entityMappings[`customer_${customer_id}`] : null
                };
                await base44.asServiceRole.entities.CustomerImport.create(newData, 'dev');
                results.customer_imports++;
            } catch (error) {
                results.errors.push(`CustomerImport ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating projects...');
        const projects = await base44.asServiceRole.entities.Project.list();
        for (const entity of projects) {
            try {
                const { id, created_date, updated_date, created_by, customer_id, ...data } = entity;
                const newData = {
                    ...data,
                    customer_id: customer_id ? entityMappings[`customer_${customer_id}`] : null
                };
                const newEntity = await base44.asServiceRole.entities.Project.create(newData, 'dev');
                entityMappings[`project_${id}`] = newEntity.id;
                results.projects++;
            } catch (error) {
                results.errors.push(`Project ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating CAO rules...');
        const caoRules = await base44.asServiceRole.entities.CaoRule.list();
        for (const entity of caoRules) {
            try {
                const { id, created_date, updated_date, created_by, ...data } = entity;
                await base44.asServiceRole.entities.CaoRule.create(data, 'dev');
                results.cao_rules++;
            } catch (error) {
                results.errors.push(`CaoRule ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating salary tables...');
        const salaryTables = await base44.asServiceRole.entities.SalaryTable.list();
        for (const entity of salaryTables) {
            try {
                const { id, created_date, updated_date, created_by, ...data } = entity;
                await base44.asServiceRole.entities.SalaryTable.create(data, 'dev');
                results.salary_tables++;
            } catch (error) {
                results.errors.push(`SalaryTable ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating holidays...');
        const holidays = await base44.asServiceRole.entities.Holiday.list();
        for (const entity of holidays) {
            try {
                const { id, created_date, updated_date, created_by, ...data } = entity;
                await base44.asServiceRole.entities.Holiday.create(data, 'dev');
                results.holidays++;
            } catch (error) {
                results.errors.push(`Holiday ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating contracts...');
        const contracts = await base44.asServiceRole.entities.Contract.list();
        for (const entity of contracts) {
            try {
                const { id, created_date, updated_date, created_by, employee_id, ...data } = entity;
                const newData = {
                    ...data,
                    employee_id: employee_id ? entityMappings[`employee_${employee_id}`] : null
                };
                await base44.asServiceRole.entities.Contract.create(newData, 'dev');
                results.contracts++;
            } catch (error) {
                results.errors.push(`Contract ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating time entries...');
        const timeEntries = await base44.asServiceRole.entities.TimeEntry.list();
        for (const entity of timeEntries) {
            try {
                const { id, created_date, updated_date, created_by, employee_id, project_id, customer_id, ...data } = entity;
                const newData = {
                    ...data,
                    employee_id: employee_id ? entityMappings[`employee_${employee_id}`] : null,
                    project_id: project_id ? entityMappings[`project_${project_id}`] : null,
                    customer_id: customer_id ? entityMappings[`customer_${customer_id}`] : null
                };
                await base44.asServiceRole.entities.TimeEntry.create(newData, 'dev');
                results.time_entries++;
            } catch (error) {
                results.errors.push(`TimeEntry ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating trips...');
        const trips = await base44.asServiceRole.entities.Trip.list();
        for (const entity of trips) {
            try {
                const { id, created_date, updated_date, created_by, employee_id, vehicle_id, customer_id, project_id, ...data } = entity;
                
                // Skip if required fields cannot be mapped
                const mappedEmployeeId = employee_id ? entityMappings[`employee_${employee_id}`] : null;
                const mappedVehicleId = vehicle_id ? entityMappings[`vehicle_${vehicle_id}`] : null;
                
                if (!mappedEmployeeId || !mappedVehicleId) {
                    results.errors.push(`Trip ${entity.id}: Overgeslagen - medewerker of voertuig niet gevonden`);
                    continue;
                }
                
                const newData = {
                    ...data,
                    employee_id: mappedEmployeeId,
                    vehicle_id: mappedVehicleId,
                    customer_id: customer_id ? entityMappings[`customer_${customer_id}`] : null,
                    project_id: project_id ? entityMappings[`project_${project_id}`] : null
                };
                await base44.asServiceRole.entities.Trip.create(newData, 'dev');
                results.trips++;
            } catch (error) {
                results.errors.push(`Trip ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating schedules...');
        const schedules = await base44.asServiceRole.entities.Schedule.list();
        for (const entity of schedules) {
            try {
                const { id, created_date, updated_date, created_by, employee_id, ...data } = entity;
                const newData = {
                    ...data,
                    employee_id: employee_id ? entityMappings[`employee_${employee_id}`] : null
                };
                await base44.asServiceRole.entities.Schedule.create(newData, 'dev');
                results.schedules++;
            } catch (error) {
                results.errors.push(`Schedule ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating shift times...');
        const shiftTimes = await base44.asServiceRole.entities.ShiftTime.list();
        for (const entity of shiftTimes) {
            try {
                const { id, created_date, updated_date, created_by, ...data } = entity;
                await base44.asServiceRole.entities.ShiftTime.create(data, 'dev');
                results.shift_times++;
            } catch (error) {
                results.errors.push(`ShiftTime ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating vehicle inspections...');
        const inspections = await base44.asServiceRole.entities.VehicleInspection.list();
        for (const entity of inspections) {
            try {
                const { id, created_date, updated_date, created_by, employee_id, vehicle_id, ...data } = entity;
                const newData = {
                    ...data,
                    employee_id: employee_id ? entityMappings[`employee_${employee_id}`] : null,
                    vehicle_id: vehicle_id ? entityMappings[`vehicle_${vehicle_id}`] : null
                };
                await base44.asServiceRole.entities.VehicleInspection.create(newData, 'dev');
                results.vehicle_inspections++;
            } catch (error) {
                results.errors.push(`VehicleInspection ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating expenses...');
        const expenses = await base44.asServiceRole.entities.Expense.list();
        for (const entity of expenses) {
            try {
                const { id, created_date, updated_date, created_by, employee_id, project_id, customer_id, ...data } = entity;
                const newData = {
                    ...data,
                    employee_id: employee_id ? entityMappings[`employee_${employee_id}`] : null,
                    project_id: project_id ? entityMappings[`project_${project_id}`] : null,
                    customer_id: customer_id ? entityMappings[`customer_${customer_id}`] : null
                };
                await base44.asServiceRole.entities.Expense.create(newData, 'dev');
                results.expenses++;
            } catch (error) {
                results.errors.push(`Expense ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating messages...');
        const messages = await base44.asServiceRole.entities.Message.list();
        for (const entity of messages) {
            try {
                const { id, created_date, updated_date, created_by, from_employee_id, to_employee_id, ...data } = entity;
                const newData = {
                    ...data,
                    from_employee_id: from_employee_id ? entityMappings[`employee_${from_employee_id}`] : null,
                    to_employee_id: to_employee_id ? entityMappings[`employee_${to_employee_id}`] : null
                };
                await base44.asServiceRole.entities.Message.create(newData, 'dev');
                results.messages++;
            } catch (error) {
                results.errors.push(`Message ${entity.id}: ${error.message}`);
            }
        }

        console.log('Migrating supervisor messages...');
        const supervisorMessages = await base44.asServiceRole.entities.SupervisorMessage.list();
        for (const entity of supervisorMessages) {
            try {
                const { id, created_date, updated_date, created_by, target_employee_id, ...data } = entity;
                const newData = {
                    ...data,
                    target_employee_id: target_employee_id ? entityMappings[`employee_${target_employee_id}`] : null
                };
                await base44.asServiceRole.entities.SupervisorMessage.create(newData, 'dev');
                results.supervisor_messages++;
            } catch (error) {
                results.errors.push(`SupervisorMessage ${entity.id}: ${error.message}`);
            }
        }

        return Response.json({
            success: true,
            message: 'Volledige systeemmigratie voltooid van Productie naar Test',
            details: results
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});