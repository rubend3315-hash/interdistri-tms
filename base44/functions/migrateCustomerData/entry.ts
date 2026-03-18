import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Only admins or specific user can migrate data
        if (user?.role !== 'admin' && user?.email !== 'rubend3315@gmail.com') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { customer_ids } = await req.json();

        if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
            return Response.json({ 
                error: 'customer_ids array is required' 
            }, { status: 400 });
        }

        const results = {
            customers: 0,
            articles: 0,
            imports: 0,
            timodel_routes: 0,
            routes: 0,
            errors: []
        };

        // Migrate each customer and their related data
        for (const customerId of customer_ids) {
            try {
                // 1. Get customer from production
                const customer = await base44.asServiceRole.entities.Customer.get(customerId);
                
                if (!customer) {
                    results.errors.push(`Customer ${customerId} not found in production`);
                    continue;
                }

                // 2. Create customer in test (remove id and metadata fields)
                const { id, created_date, updated_date, created_by, ...customerData } = customer;
                const newCustomer = await base44.asServiceRole.entities.Customer.create(customerData, 'dev');
                results.customers++;

                // 3. Migrate Articles
                const articles = await base44.asServiceRole.entities.Article.filter({ 
                    customer_id: customerId 
                });
                
                for (const article of articles) {
                    const { id, created_date, updated_date, created_by, ...articleData } = article;
                    await base44.asServiceRole.entities.Article.create({
                        ...articleData,
                        customer_id: newCustomer.id
                    }, 'dev');
                    results.articles++;
                }

                // 4. Migrate CustomerImports
                const imports = await base44.asServiceRole.entities.CustomerImport.filter({ 
                    customer_id: customerId 
                });
                
                for (const imp of imports) {
                    const { id, created_date, updated_date, created_by, ...importData } = imp;
                    await base44.asServiceRole.entities.CustomerImport.create({
                        ...importData,
                        customer_id: newCustomer.id
                    }, 'dev');
                    results.imports++;
                }

                // 5. Migrate TIModelRoutes
                const tiRoutes = await base44.asServiceRole.entities.TIModelRoute.filter({ 
                    customer_id: customerId 
                });
                
                for (const route of tiRoutes) {
                    const { id, created_date, updated_date, created_by, ...routeData } = route;
                    await base44.asServiceRole.entities.TIModelRoute.create({
                        ...routeData,
                        customer_id: newCustomer.id
                    }, 'dev');
                    results.timodel_routes++;
                }

                // 6. Migrate Routes
                const routes = await base44.asServiceRole.entities.Route.filter({ 
                    customer_id: customerId 
                });
                
                for (const route of routes) {
                    const { id, created_date, updated_date, created_by, ...routeData } = route;
                    await base44.asServiceRole.entities.Route.create({
                        ...routeData,
                        customer_id: newCustomer.id
                    }, 'dev');
                    results.routes++;
                }

            } catch (error) {
                results.errors.push(`Error migrating customer ${customerId}: ${error.message}`);
            }
        }

        return Response.json({
            success: true,
            message: `Migrated ${results.customers} customer(s) with their related data from production to test`,
            details: results
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});