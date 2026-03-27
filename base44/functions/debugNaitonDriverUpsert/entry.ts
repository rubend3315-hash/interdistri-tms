// Debug: test dataexchange_driverhistoryupsert met minimale parameters
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BASE_URL = 'https://dawa-prod.naiton.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');

    const { gpsassetid, drivername, starttime, stoptime, staffnumber } = await req.json();

    const results = {};

    // Test 1: Alleen verplichte 4 parameters
    const args1 = [
      { name: "gpsassetid", value: gpsassetid },
      { name: "drivername", value: drivername },
      { name: "starttime", value: starttime },
      { name: "stoptime", value: stoptime },
    ];
    console.log('[DEBUG] Test 1 — basis 4 params:', JSON.stringify(args1));
    const res1 = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
      body: JSON.stringify([{ name: "dataexchange_driverhistoryupsert", arguments: args1 }]),
    });
    const text1 = await res1.text();
    results.test1_basic = { status: res1.status, body: text1.slice(0, 500) };
    console.log('[DEBUG] Test 1 result:', res1.status, text1.slice(0, 500));

    // Test 2: Met staffnumber als 5e parameter
    if (staffnumber) {
      const args2 = [
        { name: "gpsassetid", value: gpsassetid },
        { name: "drivername", value: drivername },
        { name: "starttime", value: starttime },
        { name: "stoptime", value: stoptime },
        { name: "staffnumber", value: String(staffnumber) },
      ];
      console.log('[DEBUG] Test 2 — met staffnumber:', JSON.stringify(args2));
      const res2 = await fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
        body: JSON.stringify([{ name: "dataexchange_driverhistoryupsert", arguments: args2 }]),
      });
      const text2 = await res2.text();
      results.test2_with_staffnumber = { status: res2.status, body: text2.slice(0, 500) };
      console.log('[DEBUG] Test 2 result:', res2.status, text2.slice(0, 500));
    }

    // Test 3: Met kort datetime format (zonder seconden)
    const shortStart = starttime?.slice(0, 16);  // "2026-03-24T20:36"
    const shortStop = stoptime?.slice(0, 16);
    const args3 = [
      { name: "gpsassetid", value: gpsassetid },
      { name: "drivername", value: drivername },
      { name: "starttime", value: shortStart },
      { name: "stoptime", value: shortStop },
    ];
    console.log('[DEBUG] Test 3 — kort datetime:', JSON.stringify(args3));
    const res3 = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
      body: JSON.stringify([{ name: "dataexchange_driverhistoryupsert", arguments: args3 }]),
    });
    const text3 = await res3.text();
    results.test3_short_datetime = { status: res3.status, body: text3.slice(0, 500) };
    console.log('[DEBUG] Test 3 result:', res3.status, text3.slice(0, 500));

    // Test 4: Met datum-only format (yyyy-MM-dd)
    const dateOnly = starttime?.slice(0, 10);
    const args4 = [
      { name: "gpsassetid", value: gpsassetid },
      { name: "drivername", value: drivername },
      { name: "starttime", value: dateOnly },
      { name: "stoptime", value: dateOnly },
    ];
    console.log('[DEBUG] Test 4 — date-only:', JSON.stringify(args4));
    const res4 = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
      body: JSON.stringify([{ name: "dataexchange_driverhistoryupsert", arguments: args4 }]),
    });
    const text4 = await res4.text();
    results.test4_date_only = { status: res4.status, body: text4.slice(0, 500) };
    console.log('[DEBUG] Test 4 result:', res4.status, text4.slice(0, 500));

    // Test 5: Minimaal — alleen gpsassetid + drivername
    const args5 = [
      { name: "gpsassetid", value: gpsassetid },
      { name: "drivername", value: drivername },
    ];
    console.log('[DEBUG] Test 5 — minimal 2 params:', JSON.stringify(args5));
    const res5 = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
      body: JSON.stringify([{ name: "dataexchange_driverhistoryupsert", arguments: args5 }]),
    });
    const text5 = await res5.text();
    results.test5_minimal = { status: res5.status, body: text5.slice(0, 500) };

    // Test 6: Geen arguments (leeg)
    console.log('[DEBUG] Test 6 — no arguments');
    const res6 = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
      body: JSON.stringify([{ name: "dataexchange_driverhistoryupsert" }]),
    });
    const text6 = await res6.text();
    results.test6_no_args = { status: res6.status, body: text6.slice(0, 500) };

    // Test 7: Alternatieve functienaam "dataexchange_driverupsert"
    const args7 = [
      { name: "gpsassetid", value: gpsassetid },
      { name: "drivername", value: drivername },
      { name: "starttime", value: starttime },
      { name: "stoptime", value: stoptime },
    ];
    console.log('[DEBUG] Test 7 — alt functienaam dataexchange_driverupsert');
    const res7 = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
      body: JSON.stringify([{ name: "dataexchange_driverupsert", arguments: args7 }]),
    });
    const text7 = await res7.text();
    results.test7_alt_name = { status: res7.status, body: text7.slice(0, 500) };

    // Test 8: Arguments als "value" objecten in plaats van name/value pairs
    console.log('[DEBUG] Test 8 — flat object body');
    const res8 = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
      body: JSON.stringify([{
        name: "dataexchange_driverhistoryupsert",
        arguments: {
          gpsassetid,
          drivername,
          starttime,
          stoptime,
        }
      }]),
    });
    const text8 = await res8.text();
    results.test8_flat_object = { status: res8.status, body: text8.slice(0, 500) };

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});