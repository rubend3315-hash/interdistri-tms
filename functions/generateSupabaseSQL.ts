import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const entities = {
      employee: {
        employee_number: 'text', initials: 'text', first_name: 'text', prefix: 'text', last_name: 'text',
        photo_url: 'text', email: 'text', phone: 'text', date_of_birth: 'date', in_service_since: 'date',
        out_of_service_date: 'date', address: 'text', postal_code: 'text', city: 'text',
        emergency_contact_name: 'text', emergency_contact_phone: 'text', emergency_contact_relation: 'text',
        department: 'text', "function": 'text', charter_company_id: 'text',
        drivers_license_number: 'text', drivers_license_categories: 'jsonb', drivers_license_expiry: 'date',
        code95_expiry: 'date', id_document_number: 'text', id_document_expiry: 'date',
        contract_type: 'text', contract_start_date: 'date', contract_end_date: 'date',
        contract_hours: 'numeric', hourly_rate: 'numeric', salary_scale: 'text',
        travel_allowance_per_km: 'numeric', travel_distance_km: 'numeric',
        travel_allowance_start_date: 'date', travel_allowance_end_date: 'date',
        week_schedule: 'jsonb', contractregels: 'jsonb', reiskostenregels: 'jsonb',
        supervisor_notities: 'text', status: 'text', bsn: 'text', bank_account: 'text',
        mobile_entry_type: 'text', is_chauffeur: 'boolean', tonen_in_planner: 'boolean',
        opnemen_in_loonrapport: 'boolean', loonheffing_toepassen: 'text', loonheffing_datum: 'date',
        loonheffing_handtekening_url: 'text'
      },
      vehicle: {
        license_plate: 'text', brand: 'text', model: 'text', type: 'text', fuel_type: 'text',
        year: 'numeric', chassis_number: 'text', emission_class: 'text',
        factory_consumption_per_100km: 'numeric', key_cabinet_number: 'text',
        apk_expiry: 'date', insurance_expiry: 'date', tachograph_calibration_date: 'date',
        current_mileage: 'numeric', mileage_calibration_history: 'jsonb',
        niwo_permit_id: 'text', status: 'text', notes: 'text', photo_url: 'text', max_weight: 'numeric'
      },
      customer: {
        company_name: 'text', logo_url: 'text', contact_person: 'text', email: 'text', phone: 'text',
        address: 'text', postal_code: 'text', city: 'text', country: 'text',
        kvk_number: 'text', btw_number: 'text', payment_terms: 'numeric',
        articles: 'jsonb', status: 'text', notes: 'text'
      },
      project: {
        name: 'text', customer_id: 'text', description: 'text',
        start_date: 'date', end_date: 'date', status: 'text', budget: 'numeric', notes: 'text'
      },
      timeentry: {
        employee_id: 'text', date: 'date', end_date: 'date', week_number: 'numeric', year: 'numeric',
        start_time: 'text', end_time: 'text', break_minutes: 'numeric', total_hours: 'numeric',
        overtime_hours: 'numeric', night_hours: 'numeric', weekend_hours: 'numeric', holiday_hours: 'numeric',
        shift_type: 'text', project_id: 'text', customer_id: 'text',
        departure_location: 'text', return_location: 'text', departure_time: 'text', expected_return_time: 'text',
        subsistence_allowance: 'numeric', advanced_costs: 'numeric', meals: 'numeric', wkr: 'numeric',
        notes: 'text', status: 'text', signature_url: 'text',
        approved_by: 'text', approved_date: 'timestamptz', rejection_reason: 'text',
        edit_history: 'jsonb', travel_allowance_multiplier: 'numeric'
      },
      trip: {
        employee_id: 'text', time_entry_id: 'text', date: 'date', vehicle_id: 'text',
        customer_id: 'text', project_id: 'text', route_name: 'text',
        planned_stops: 'numeric', completed_stops: 'numeric',
        start_km: 'numeric', end_km: 'numeric', total_km: 'numeric',
        fuel_liters: 'numeric', adblue_liters: 'numeric', fuel_km: 'numeric',
        charging_kwh: 'numeric', fuel_cost: 'numeric',
        cargo_description: 'text', cargo_weight: 'numeric',
        departure_time: 'text', arrival_time: 'text', departure_location: 'text',
        notes: 'text', status: 'text'
      },
      schedule: {
        employee_id: 'text', week_number: 'numeric', year: 'numeric',
        monday: 'text', monday_route_id: 'text', monday_vehicle_id: 'text', monday_planned_department: 'text', monday_notes_1: 'text', monday_notes_2: 'text',
        tuesday: 'text', tuesday_route_id: 'text', tuesday_vehicle_id: 'text', tuesday_planned_department: 'text', tuesday_notes_1: 'text', tuesday_notes_2: 'text',
        wednesday: 'text', wednesday_route_id: 'text', wednesday_vehicle_id: 'text', wednesday_planned_department: 'text', wednesday_notes_1: 'text', wednesday_notes_2: 'text',
        thursday: 'text', thursday_route_id: 'text', thursday_vehicle_id: 'text', thursday_planned_department: 'text', thursday_notes_1: 'text', thursday_notes_2: 'text',
        friday: 'text', friday_route_id: 'text', friday_vehicle_id: 'text', friday_planned_department: 'text', friday_notes_1: 'text', friday_notes_2: 'text',
        saturday: 'text', saturday_route_id: 'text', saturday_vehicle_id: 'text', saturday_planned_department: 'text', saturday_notes_1: 'text', saturday_notes_2: 'text',
        sunday: 'text', sunday_route_id: 'text', sunday_vehicle_id: 'text', sunday_planned_department: 'text', sunday_notes_1: 'text', sunday_notes_2: 'text',
        notes: 'text'
      },
      caorule: {
        name: 'text', description: 'text', category: 'text', rule_type: 'text',
        calculation_type: 'text', value: 'numeric', percentage: 'numeric', fixed_amount: 'numeric',
        start_time: 'text', end_time: 'text', applies_to_days: 'jsonb',
        start_date: 'date', end_date: 'date', priority: 'numeric', status: 'text'
      },
      salarytable: {
        name: 'text', table_type: 'text', scale: 'text', step: 'numeric',
        hourly_rate: 'numeric', monthly_salary: 'numeric',
        start_date: 'date', end_date: 'date', status: 'text'
      },
      holiday: {
        name: 'text', date: 'date', year: 'numeric', is_national: 'boolean'
      },
      shifttime: {
        date: 'date', department: 'text', service_start_time: 'text',
        start_time: 'text', end_time: 'text', message: 'text', created_by_name: 'text'
      },
      vehicleinspection: {
        employee_id: 'text', vehicle_id: 'text', date: 'date', time: 'text', mileage: 'numeric',
        exterior_clean: 'boolean', interior_clean: 'boolean', lights_working: 'boolean',
        tires_ok: 'boolean', brakes_ok: 'boolean', oil_level_ok: 'boolean', coolant_level_ok: 'boolean',
        windshield_ok: 'boolean', mirrors_ok: 'boolean', horn_working: 'boolean',
        first_aid_kit: 'boolean', fire_extinguisher: 'boolean', warning_triangle: 'boolean', safety_vest: 'boolean',
        battery_level: 'numeric', charging_cable_present: 'boolean', fuel_level: 'numeric',
        damage_present: 'boolean', damage_description: 'text', damage_photos: 'jsonb',
        notes: 'text', signature_url: 'text', status: 'text'
      },
      expense: {
        employee_id: 'text', date: 'date', category: 'text', description: 'text', amount: 'numeric',
        receipt_url: 'text', project_id: 'text', customer_id: 'text',
        status: 'text', approved_by: 'text', approved_date: 'date', rejection_reason: 'text'
      },
      message: {
        from_employee_id: 'text', to_employee_id: 'text', subject: 'text',
        content: 'text', is_read: 'boolean', priority: 'text'
      },
      supervisormessage: {
        message: 'text', target_employee_id: 'text', department: 'text',
        active_from: 'date', active_until: 'date', is_active: 'boolean'
      },
      niwopermit: {
        permit_number: 'text', validity_date: 'date', assigned_vehicle_id: 'text',
        status: 'text', notes: 'text'
      },
      notification: {
        title: 'text', description: 'text', type: 'text',
        target_entity_id: 'text', target_page: 'text',
        is_read: 'boolean', user_ids: 'jsonb', priority: 'text'
      },
      role: {
        name: 'text', label: 'text', description: 'text',
        permissions: 'jsonb', color: 'text', is_system: 'boolean'
      },
      customerimport: {
        customer_id: 'text', import_name: 'text', import_date: 'timestamptz',
        file_name: 'text', column_mapping: 'jsonb', data: 'jsonb',
        total_rows: 'numeric', calculated_data: 'jsonb', status: 'text', notes: 'text'
      },
      urensoort: {
        code: 'text', name: 'text', description: 'text', toeslag_percentage: 'numeric', status: 'text'
      },
      uurcode: {
        code: 'text', name: 'text', urensoort_id: 'text', description: 'text', status: 'text'
      },
      article: {
        customer_id: 'text', article_number: 'text', description: 'text',
        unit: 'text', price_rules: 'jsonb', status: 'text'
      },
      route: {
        customer_id: 'text', route_code: 'text', route_name: 'text',
        start_date: 'date', end_date: 'date', notes: 'text', is_active: 'boolean'
      },
      timodelroute: {
        customer_id: 'text', route_code: 'text', route_name: 'text',
        total_time_hours: 'numeric', total_time_hhmm: 'text',
        number_of_stops: 'numeric', number_of_parcels: 'numeric',
        calculated_norm_per_hour: 'numeric', manual_norm_per_hour: 'numeric',
        start_date: 'date', end_date: 'date', notes: 'text', is_active: 'boolean', status: 'text'
      },
      document: {
        name: 'text', document_type: 'text', file_url: 'text',
        linked_employee_id: 'text', linked_vehicle_id: 'text', linked_entity_name: 'text',
        expiry_date: 'date', notes: 'text', status: 'text'
      },
      contract: {
        employee_id: 'text', contract_number: 'text', contract_type: 'text',
        start_date: 'date', end_date: 'date', hours_per_week: 'numeric', hourly_rate: 'numeric',
        salary_scale: 'text', function_title: 'text', department: 'text',
        is_verlenging: 'boolean', oorspronkelijke_indienst_datum: 'date',
        verlenging_nummer: 'text', proeftijd: 'text', contract_content: 'text',
        status: 'text', employee_signature_url: 'text', employee_signed_date: 'timestamptz',
        manager_signature_url: 'text', manager_signed_date: 'timestamptz', manager_signed_by: 'text',
        pdf_url: 'text', reminder_sent_dates: 'jsonb', cao_rules_applied: 'jsonb', notes: 'text'
      },
      completedcontract: {
        contract_id: 'text', contract_number: 'text', employee_name: 'text', employee_id: 'text',
        contract_type: 'text', start_date: 'date', end_date: 'date',
        function_title: 'text', department: 'text',
        employee_signed_date: 'timestamptz', manager_signed_date: 'timestamptz',
        manager_signed_by: 'text', activated_date: 'timestamptz'
      },
      contractwijziging: {
        employee_id: 'text', employee_naam: 'text', type_wijziging: 'text',
        huidige_waarde: 'text', nieuwe_waarde: 'text', ingangsdatum: 'date',
        toelichting: 'text', aangevraagd_door: 'text', aangevraagd_datum: 'timestamptz',
        status: 'text', beoordeeld_door: 'text', beoordeeld_datum: 'timestamptz',
        afkeur_reden: 'text', doorgevoerd_datum: 'timestamptz', prioriteit: 'text'
      },
      breakschedule: {
        min_hours: 'numeric', max_hours: 'numeric', break_minutes: 'numeric',
        description: 'text', status: 'text'
      },
      performancereview: {
        employee_id: 'text', review_date: 'date', period_start: 'date', period_end: 'date',
        tvi_dag: 'numeric', tvi_dag_punten: 'numeric',
        uitreik_locatie: 'numeric', uitreik_locatie_punten: 'numeric',
        scankwaliteit: 'numeric', scankwaliteit_punten: 'numeric',
        pba_bezorgen: 'numeric', pba_bezorgen_punten: 'numeric',
        hitrate: 'numeric', hitrate_punten: 'numeric',
        procesverstoring_cat1: 'numeric', procesverstoring_cat1_punten: 'numeric',
        procesverstoring_cat2: 'numeric', procesverstoring_cat2_punten: 'numeric',
        betwiste_klachten: 'numeric', betwiste_klachten_punten: 'numeric',
        onbetwiste_klachten: 'numeric', onbetwiste_klachten_punten: 'numeric',
        contract_ratio: 'numeric', contract_ratio_punten: 'numeric',
        claims: 'numeric', claims_punten: 'numeric',
        veilig_defensief_rijgedrag: 'numeric', veilig_defensief_rijgedrag_punten: 'numeric',
        naleven_verkeersregels: 'numeric', naleven_verkeersregels_punten: 'numeric',
        schadevrij_rijden: 'numeric', schadevrij_rijden_punten: 'numeric',
        melden_schade_incidenten: 'numeric', melden_schade_incidenten_punten: 'numeric',
        representatief_gebruik_voertuig: 'numeric', representatief_gebruik_voertuig_punten: 'numeric',
        periodieke_voertuig_controle: 'numeric', periodieke_voertuig_controle_punten: 'numeric',
        netheid_onderhoud_voertuig: 'numeric', netheid_onderhoud_voertuig_punten: 'numeric',
        zuinig_verantwoord_rijgedrag: 'numeric', zuinig_verantwoord_rijgedrag_punten: 'numeric',
        bandenslijtage: 'numeric', bandenslijtage_punten: 'numeric',
        persoonlijke_inzet: 'numeric', persoonlijke_inzet_punten: 'numeric',
        piek_ziektebezetting: 'numeric', piek_ziektebezetting_punten: 'numeric',
        omgang_veranderingen: 'numeric', omgang_veranderingen_punten: 'numeric',
        ziekteverzuim: 'numeric', ziekteverzuim_punten: 'numeric',
        omgang_collega: 'numeric', omgang_collega_punten: 'numeric',
        nakomen_afspraken: 'numeric', nakomen_afspraken_punten: 'numeric',
        werk_prive_balans: 'text', terugblik_vorige_periode: 'text',
        nieuwe_doelen: 'text', feedback_medewerker: 'text',
        gemiddelde_score: 'numeric', trede_verhoging: 'boolean', trede_verhoging_toelichting: 'text',
        algemene_conclusie: 'text', ontwikkelpunten: 'text', reviewer_id: 'text',
        manager_signature_url: 'text', employee_signature_url: 'text', status: 'text'
      },
      performancenote: {
        employee_id: 'text', note_date: 'date', category: 'text', title: 'text',
        description: 'text', severity: 'text', action_taken: 'text',
        follow_up_required: 'boolean', follow_up_date: 'date',
        created_by_name: 'text', is_visible_to_employee: 'boolean'
      },
      employeekpi: {
        employee_id: 'text', customer_id: 'text', zmedcid: 'text', medewerker_naam: 'text',
        week: 'numeric', year: 'numeric',
        tvi_dag: 'numeric', tvi_avond: 'numeric', uitreiklocatie: 'numeric',
        vr_distributie: 'numeric', scankwaliteit: 'numeric',
        pba_bezorgers: 'numeric', hitrate: 'numeric'
      },
      kpidoel: {
        employee_id: 'text', zmedcid: 'text', jaar: 'numeric', week: 'numeric',
        tvi_dag_doel: 'numeric', tvi_avond_doel: 'numeric', uitreiklocatie_doel: 'numeric',
        vr_distributie_doel: 'numeric', scankwaliteit_doel: 'numeric',
        pba_bezorgers_doel: 'numeric', hitrate_doel: 'numeric'
      },
      loonperiodestatus: {
        year: 'numeric', periode: 'numeric', status: 'text',
        definitief_datum: 'timestamptz', definitief_door: 'text', opmerkingen: 'text'
      },
      bedrijfsreglementartikel: {
        artikel_nummer: 'numeric', hoofdstuk: 'text', titel: 'text', inhoud: 'text',
        versie: 'numeric', versie_geschiedenis: 'jsonb', status: 'text'
      },
      contracttemplate: {
        name: 'text', contract_type: 'text', description: 'text',
        template_content: 'text', is_default: 'boolean', status: 'text'
      },
      chartercompany: {
        company_name: 'text', contact_person: 'text', email: 'text', phone: 'text',
        address: 'text', postal_code: 'text', city: 'text', kvk_number: 'text',
        notes: 'text', status: 'text'
      },
      vehiclemaintenance: {
        vehicle_id: 'text', date: 'date', mileage_at_service: 'numeric',
        maintenance_type: 'text', description: 'text', garage_name: 'text',
        cost: 'numeric', invoice_url: 'text', notes: 'text'
      },
      leasecontract: {
        vehicle_id: 'text', lease_company: 'text', contract_number: 'text',
        start_date: 'date', end_date: 'date', monthly_cost: 'numeric',
        mileage_limit: 'numeric', excess_km_cost: 'numeric',
        document_url: 'text', notes: 'text', status: 'text'
      },
      emailtemplate: {
        name: 'text', subject: 'text', body: 'text', reply_to: 'text',
        category: 'text', is_active: 'boolean'
      },
      onboardingprocess: {
        employee_id: 'text', employee_name: 'text', status: 'text', current_step: 'numeric',
        pincode_sleutelkast: 'text', stamkaart_completed: 'boolean',
        pincode_verklaring_signed: 'boolean', sleutel_verklaring_signed: 'boolean',
        sleutel_nummer: 'text', sleutel_toegang: 'text',
        gps_buddy_toestemming: 'boolean', dienstbetrekking_signed: 'boolean',
        bedrijfsreglement_ontvangen: 'boolean', contract_generated: 'boolean',
        mobile_invite_sent: 'boolean', employee_signature_url: 'text',
        completed_date: 'timestamptz', notes: 'text'
      },
      driveravailability: {
        employee_id: 'text', date: 'date', status: 'text', notes: 'text'
      },
      rapportagerit: {
        project_id: 'text', project_naam: 'text', klant_id: 'text', import_datum: 'date',
        week: 'numeric', datum: 'text', chauffeur: 'text', ritnaam: 'text',
        totaal_rit: 'text', geen_scan_15min: 'numeric',
        besteltijd_norm: 'numeric', besteltijd_bruto: 'numeric', besteltijd_netto: 'numeric',
        aantal_vrijgave_stops: 'numeric', aantal_vrijgave_stuks: 'numeric',
        aantal_afgeleverd_stuks: 'numeric', aantal_afgeleverd_stops: 'numeric',
        aantal_afgehaald_collecteerd: 'numeric', aantal_pba_bezorgd: 'numeric',
        artikelen: 'jsonb', status: 'text'
      },
      postnlimportresult: {
        project_id: 'text', project_naam: 'text', klant_naam: 'text',
        ritnaam: 'text', datum: 'text', starttijd_shift: 'text',
        import_datum: 'date', bestandsnaam: 'text', data: 'jsonb'
      },
      spottainvoice: {
        customer_id: 'text', invoice_number: 'text', invoice_date: 'date', due_date: 'date',
        supplier_name: 'text', supplier_address: 'text', supplier_kvk: 'text', supplier_btw: 'text',
        customer_name: 'text', reference_number: 'text', description_period: 'text',
        total_net: 'numeric', total_tax: 'numeric', total_amount: 'numeric', currency: 'text',
        line_count: 'numeric', pdf_url: 'text', json_url: 'text', import_source: 'text', status: 'text'
      },
      spottainvoiceline: {
        invoice_id: 'text', customer_id: 'text', product_code: 'text', description: 'text',
        quantity: 'numeric', unit_price: 'numeric', total_price: 'numeric',
        tax_rate: 'numeric', tax_amount: 'numeric', total_incl_tax: 'numeric',
        matched_article_id: 'text', route_code: 'text', line_type: 'text'
      },
      auditlog: {
        action: 'text', category: 'text', description: 'text',
        performed_by_email: 'text', performed_by_name: 'text',
        target_entity: 'text', target_id: 'text', target_name: 'text',
        old_value: 'text', new_value: 'text', details: 'jsonb'
      },
      integration: {
        name: 'text', type: 'text', api_url: 'text', api_key: 'text',
        sync_interval_minutes: 'numeric', last_sync: 'timestamptz',
        last_sync_status: 'text', last_sync_message: 'text',
        settings: 'jsonb', is_active: 'boolean'
      },
      synclog: {
        integration_id: 'text', sync_type: 'text', status: 'text',
        records_synced: 'numeric', records_failed: 'numeric',
        message: 'text', details: 'jsonb'
      },
      backup: {
        backup_date: 'timestamptz', backup_group_id: 'text', entity_name: 'text',
        record_count: 'numeric', backup_size: 'numeric', entity_count: 'numeric',
        status: 'text', backup_type: 'text', environment: 'text',
        json_data: 'text', notes: 'text'
      },
      clientfeatureconfig: {
        customer_id: 'text', feature_key: 'text', feature_label: 'text', is_active: 'boolean'
      }
    };

    const builtInFields = {
      id: 'uuid DEFAULT gen_random_uuid() PRIMARY KEY',
      base44_id: 'text',
      created_date: 'timestamptz',
      updated_date: 'timestamptz',
      created_by: 'text'
    };

    let sql = '-- Supabase SQL: CREATE TABLE statements voor alle Base44 entities\n';
    sql += '-- Gegenereerd op: ' + new Date().toISOString() + '\n';
    sql += '-- BELANGRIJK: Voer dit uit in de Supabase SQL Editor\n\n';

    sql += '-- ====================================\n';
    sql += '-- STAP 1: BESTAANDE TABELLEN VERWIJDEREN\n';
    sql += '-- ====================================\n\n';

    for (const tableName of Object.keys(entities)) {
      sql += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n`;
    }

    sql += '\n-- ====================================\n';
    sql += '-- STAP 2: TABELLEN AANMAKEN\n';
    sql += '-- ====================================\n\n';

    for (const [tableName, columns] of Object.entries(entities)) {
      sql += `-- ${tableName}\n`;
      sql += `CREATE TABLE "${tableName}" (\n`;
      
      const allCols = [];
      for (const [colName, colType] of Object.entries(builtInFields)) {
        allCols.push(`  "${colName}" ${colType}`);
      }
      for (const [colName, colType] of Object.entries(columns)) {
        allCols.push(`  "${colName}" ${colType}`);
      }
      
      sql += allCols.join(',\n');
      sql += '\n);\n\n';
    }

    sql += '-- ====================================\n';
    sql += '-- STAP 3: RLS UITSCHAKELEN (service role)\n';
    sql += '-- ====================================\n\n';

    for (const tableName of Object.keys(entities)) {
      sql += `ALTER TABLE "${tableName}" DISABLE ROW LEVEL SECURITY;\n`;
    }

    sql += '\n-- Klaar! Alle ' + Object.keys(entities).length + ' tabellen zijn aangemaakt.\n';

    return Response.json({ 
      success: true, 
      sql,
      table_count: Object.keys(entities).length
    });
  } catch (error) {
    console.error('Generate SQL error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});