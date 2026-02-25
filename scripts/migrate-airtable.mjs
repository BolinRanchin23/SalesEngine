import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

const db = new pg.Client({
  host: "db.rruwdbughevinasxwmuv.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "Beaworldchanger23!",
  ssl: { rejectUnauthorized: false },
});

// ============================================================
// AIRTABLE HELPERS
// ============================================================

async function fetchAllRecords(tableIdOrName) {
  const records = [];
  let offset = null;
  do {
    const url = new URL(`${AIRTABLE_BASE_URL}/${encodeURIComponent(tableIdOrName)}`);
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airtable API error for ${tableIdOrName}: ${res.status} ${text}`);
    }
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset || null;
  } while (offset);
  console.log(`  Fetched ${records.length} records from ${tableIdOrName}`);
  return records;
}

function splitName(fullName) {
  if (!fullName) return { first_name: "Unknown", last_name: "Unknown" };
  const trimmed = fullName.trim();
  const idx = trimmed.indexOf(" ");
  if (idx === -1) return { first_name: trimmed, last_name: "" };
  return {
    first_name: trimmed.substring(0, idx),
    last_name: trimmed.substring(idx + 1),
  };
}

function cleanTitle(role) {
  if (!role) return null;
  // Fix known typos from Airtable
  const fixes = {
    "engin]=": "Engineer",
    "enginer": "Engineer",
    "Deveopment": "Development",
  };
  return fixes[role] || role;
}

// ============================================================
// MIGRATION
// ============================================================

async function main() {
  await db.connect();
  console.log("Connected to Supabase database\n");

  // ----------------------------------------------------------
  // 1. COMPANIES (from Companies table + Local Companies)
  // ----------------------------------------------------------
  console.log("=== Step 1: Migrating Companies ===");
  const companiesRaw = await fetchAllRecords("tblwp4Muilg7Tjoo3");
  const localCompaniesRaw = await fetchAllRecords("tblp4xrkTlXloXRYx");

  // Map: airtable_id -> supabase uuid
  const companyAirtableToUuid = new Map();
  // Map: company name (lowercased) -> supabase uuid (for dedup)
  const companyNameToUuid = new Map();

  // Insert Companies table records
  for (const rec of companiesRaw) {
    const name = rec.fields["Name"]?.trim();
    if (!name) continue;

    const res = await db.query(
      `INSERT INTO companies (airtable_id, name, source) VALUES ($1, $2, $3) RETURNING id`,
      [rec.id, name, "airtable_companies"]
    );
    const uuid = res.rows[0].id;
    companyAirtableToUuid.set(rec.id, uuid);
    companyNameToUuid.set(name.toLowerCase(), uuid);
  }
  console.log(`  Inserted ${companyAirtableToUuid.size} companies from Companies table`);

  // Insert Local Companies (dedupe by name)
  let localInserted = 0;
  let localDeduped = 0;
  for (const rec of localCompaniesRaw) {
    const name = rec.fields["Name"]?.trim();
    if (!name) continue;

    const existingUuid = companyNameToUuid.get(name.toLowerCase());
    if (existingUuid) {
      // Update existing company with local company data
      companyAirtableToUuid.set(rec.id, existingUuid);
      await db.query(
        `UPDATE companies SET phone = COALESCE($1, phone), fax = COALESCE($2, fax),
         website = COALESCE($3, website), hq_address = COALESCE($4, hq_address),
         linkedin_url = COALESCE($5, linkedin_url) WHERE id = $6`,
        [
          rec.fields["Phone"] || null,
          rec.fields["Fax"] || null,
          rec.fields["Website"] || null,
          rec.fields["Address"] || null,
          rec.fields["Linked In"] || null,
          existingUuid,
        ]
      );
      localDeduped++;
    } else {
      const res = await db.query(
        `INSERT INTO companies (airtable_id, name, phone, fax, website, hq_address, linkedin_url, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          rec.id,
          name,
          rec.fields["Phone"] || null,
          rec.fields["Fax"] || null,
          rec.fields["Website"] || null,
          rec.fields["Address"] || null,
          rec.fields["Linked In"] || null,
          "airtable_local_companies",
        ]
      );
      const uuid = res.rows[0].id;
      companyAirtableToUuid.set(rec.id, uuid);
      companyNameToUuid.set(name.toLowerCase(), uuid);
      localInserted++;
    }
  }
  console.log(`  Local Companies: ${localInserted} inserted, ${localDeduped} merged with existing`);

  const companyCount = (await db.query("SELECT count(*) FROM companies")).rows[0].count;
  console.log(`  Total companies in DB: ${companyCount}\n`);

  // ----------------------------------------------------------
  // 2. CONTACTS (from People + Community Partners)
  // ----------------------------------------------------------
  console.log("=== Step 2: Migrating Contacts ===");
  const peopleRaw = await fetchAllRecords("tblAGEq3Llr4ikE21");
  const communityPartnersRaw = await fetchAllRecords("tblLKL3b3k9EIaqv6");

  const contactAirtableToUuid = new Map();

  // Insert People
  for (const rec of peopleRaw) {
    const f = rec.fields;
    const { first_name, last_name } = splitName(f["Name"]);

    // Resolve company link
    let companyId = null;
    if (f["Organization"] && f["Organization"].length > 0) {
      companyId = companyAirtableToUuid.get(f["Organization"][0]) || null;
    }

    // Combine spouse/kids + hobbies into relationship_notes
    const relParts = [];
    if (f["Spouse & Kids"]) relParts.push(`Spouse & Kids: ${f["Spouse & Kids"]}`);
    if (f["Hobbies"]) relParts.push(`Hobbies: ${f["Hobbies"]}`);
    const relationshipNotes = relParts.length > 0 ? relParts.join("\n") : null;

    // Combine notes fields
    const notesParts = [];
    if (f["Notes"]) notesParts.push(f["Notes"]);
    if (f["Any Relevant Notes?"]) notesParts.push(f["Any Relevant Notes?"]);
    if (f["Delivery Notes"]) notesParts.push(`Delivery Notes: ${f["Delivery Notes"]}`);
    const notes = notesParts.length > 0 ? notesParts.join("\n\n") : null;

    // Headshot URL (first attachment thumbnail)
    const headshot = f["Headshot"]?.[0]?.url || null;

    const res = await db.query(
      `INSERT INTO contacts (
        airtable_id, company_id, first_name, last_name, title, email,
        work_phone, cell_phone, linkedin_url, bio, headshot_url,
        work_address, home_address, delivery_address, notes, relationship_notes,
        is_current_client, is_out_of_industry, source, assigned_to
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
      [
        rec.id,
        companyId,
        first_name,
        last_name,
        cleanTitle(f["Role"]),
        f["Email Address"] || null,
        f["Work Phone"] || null,
        f["Cell Phone"] || null,
        f["LinkedIn"] || null,
        f["Bio"] || null,
        headshot,
        f["Work Address"] || null,
        f["Home Address"] || null,
        f["Delivery Address"] || null,
        notes,
        relationshipNotes,
        f["Current Client"] || false,
        f["Out of Industry"] || false,
        "airtable_people",
        f["Account Manager"] || f["Owner"] || null,
      ]
    );
    contactAirtableToUuid.set(rec.id, res.rows[0].id);
  }
  console.log(`  Inserted ${contactAirtableToUuid.size} contacts from People table`);

  // Insert Community Partners
  let cpInserted = 0;
  for (const rec of communityPartnersRaw) {
    const f = rec.fields;
    const { first_name, last_name } = splitName(f["Name"]);

    // Try to resolve company by name
    let companyId = null;
    if (f["Organization / Company"]) {
      companyId = companyNameToUuid.get(f["Organization / Company"].trim().toLowerCase()) || null;
    }

    // Combine notes
    const notesParts = [];
    if (f["Notes"]) notesParts.push(f["Notes"]);
    if (f["Note"]) notesParts.push(f["Note"]);
    const notes = notesParts.length > 0 ? notesParts.join("\n\n") : null;

    const headshot = f["Headshot"]?.[0]?.url || null;

    const res = await db.query(
      `INSERT INTO contacts (
        airtable_id, company_id, first_name, last_name, title, email,
        work_phone, cell_phone, headshot_url, work_address, notes,
        source
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [
        rec.id,
        companyId,
        first_name,
        last_name,
        f["Title"] || null,
        f["email"] || null,
        f["BusinessPhone"] || f["Phone"] || null,
        f["MobilePhone"] || null,
        headshot,
        f["Address"] || null,
        notes,
        "airtable_community_partners",
      ]
    );
    contactAirtableToUuid.set(rec.id, res.rows[0].id);
    cpInserted++;
  }
  console.log(`  Inserted ${cpInserted} contacts from Community Partners table`);

  const contactCount = (await db.query("SELECT count(*) FROM contacts")).rows[0].count;
  console.log(`  Total contacts in DB: ${contactCount}\n`);

  // ----------------------------------------------------------
  // 3. PROPERTIES (from City Building List)
  // ----------------------------------------------------------
  console.log("=== Step 3: Migrating Properties ===");
  const buildingsRaw = await fetchAllRecords("tblIzUBnlUc0GgAvp");

  let propInserted = 0;
  for (const rec of buildingsRaw) {
    const f = rec.fields;
    const name = f["Name"]?.trim();
    if (!name) continue;

    // Resolve company link
    let companyId = null;
    if (f["Company"] && f["Company"].length > 0) {
      companyId = companyAirtableToUuid.get(f["Company"][0]) || null;
    }

    const lat = f["lat"] ? parseFloat(f["lat"]) : null;
    const lng = f["long"] ? parseFloat(f["long"]) : null;

    await db.query(
      `INSERT INTO properties (airtable_id, company_id, name, address, square_footage, current_csf, property_manager, engineers, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        rec.id,
        companyId,
        name,
        f["Building Address"] || null,
        f["Square Footage"] || null,
        f["Current CSF"] || null,
        f["Property Manager"] || null,
        f["Engineers"] || null,
        isNaN(lat) ? null : lat,
        isNaN(lng) ? null : lng,
      ]
    );
    propInserted++;
  }
  console.log(`  Inserted ${propInserted} properties\n`);

  // ----------------------------------------------------------
  // 4. ACTIVITIES
  // ----------------------------------------------------------
  console.log("=== Step 4: Migrating Activities ===");
  const activitiesRaw = await fetchAllRecords("tblHJi89epgx5liDV");

  const typeMap = {
    Coffee: "coffee",
    Lunch: "lunch",
    "Happy Hour": "happy_hour",
    "BOMA/IREM": "event",
    "Cold Call": "cold_call",
  };

  let actInserted = 0;
  for (const rec of activitiesRaw) {
    const f = rec.fields;
    const type = typeMap[f["Type"]] || "other";

    // Activities can link to multiple people — create one activity per person
    const peopleLinks = f["People"] || [];
    if (peopleLinks.length === 0) {
      // Activity with no linked contact
      await db.query(
        `INSERT INTO activities (airtable_id, type, notes, created_by) VALUES ($1,$2,$3,$4)`,
        [rec.id, type, f["Notes"] || null, f["Assignee"]?.name || null]
      );
      actInserted++;
    } else {
      for (const personAirtableId of peopleLinks) {
        const contactId = contactAirtableToUuid.get(personAirtableId);
        if (!contactId) continue;
        await db.query(
          `INSERT INTO activities (airtable_id, contact_id, type, notes, created_by)
           VALUES ($1,$2,$3,$4,$5)`,
          [rec.id, contactId, type, f["Notes"] || null, f["Assignee"]?.name || null]
        );
        actInserted++;
      }
    }
  }
  console.log(`  Inserted ${actInserted} activity records\n`);

  // ----------------------------------------------------------
  // 5. CONTACT RELATIONSHIPS (Assistant/Boss)
  // ----------------------------------------------------------
  console.log("=== Step 5: Migrating Contact Relationships ===");
  let relInserted = 0;
  for (const rec of peopleRaw) {
    const f = rec.fields;
    const contactId = contactAirtableToUuid.get(rec.id);
    if (!contactId) continue;

    // Assistant links
    if (f["Assistant"]) {
      for (const assistantAirtableId of f["Assistant"]) {
        const relatedId = contactAirtableToUuid.get(assistantAirtableId);
        if (relatedId) {
          await db.query(
            `INSERT INTO contact_relationships (contact_id, related_contact_id, relationship_type)
             VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [contactId, relatedId, "assistant"]
          );
          relInserted++;
        }
      }
    }

    // Boss links
    if (f["Boss"]) {
      for (const bossAirtableId of f["Boss"]) {
        const relatedId = contactAirtableToUuid.get(bossAirtableId);
        if (relatedId) {
          await db.query(
            `INSERT INTO contact_relationships (contact_id, related_contact_id, relationship_type)
             VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [contactId, relatedId, "boss"]
          );
          relInserted++;
        }
      }
    }
  }
  console.log(`  Inserted ${relInserted} relationship records\n`);

  // ----------------------------------------------------------
  // 6. TAGS (Market + Priority Level)
  // ----------------------------------------------------------
  console.log("=== Step 6: Migrating Tags ===");
  const tagNameToUuid = new Map();

  // Collect unique tags from Market and Priority Level
  const marketColors = { Austin: "#3B82F6", SA: "#F59E0B", Dallas: "#10B981", Houston: "#8B5CF6" };
  const priorityColors = { High: "#EF4444", Medium: "#F59E0B", Low: "#6B7280", Client: "#10B981" };

  // Pre-create known tags
  for (const [name, color] of [...Object.entries(marketColors), ...Object.entries(priorityColors)]) {
    const tagName = Object.keys(marketColors).includes(name) ? `Market: ${name}` : `Priority: ${name}`;
    const res = await db.query(
      `INSERT INTO tags (name, color) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET color = $2 RETURNING id`,
      [tagName, color]
    );
    tagNameToUuid.set(tagName, res.rows[0].id);
  }
  console.log(`  Created ${tagNameToUuid.size} tags`);

  // Apply tags to contacts
  let tagLinksInserted = 0;
  for (const rec of peopleRaw) {
    const f = rec.fields;
    const contactId = contactAirtableToUuid.get(rec.id);
    if (!contactId) continue;

    // Market tags (multipleSelects)
    if (f["Market"] && Array.isArray(f["Market"])) {
      for (const market of f["Market"]) {
        const tagName = `Market: ${market}`;
        const tagId = tagNameToUuid.get(tagName);
        if (tagId) {
          await db.query(
            `INSERT INTO contact_tags (contact_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [contactId, tagId]
          );
          tagLinksInserted++;
        }
      }
    }

    // Priority Level tag
    if (f["Priority Level"]) {
      const tagName = `Priority: ${f["Priority Level"]}`;
      const tagId = tagNameToUuid.get(tagName);
      if (tagId) {
        await db.query(
          `INSERT INTO contact_tags (contact_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [contactId, tagId]
        );
        tagLinksInserted++;
      }
    }
  }
  console.log(`  Created ${tagLinksInserted} contact-tag links\n`);

  // ----------------------------------------------------------
  // 7. PIPELINE PLACEMENT
  // ----------------------------------------------------------
  console.log("=== Step 7: Pipeline Placement ===");

  // Get CRE vertical and its stages
  const creVertical = (await db.query("SELECT id FROM verticals WHERE name = 'Commercial Real Estate'")).rows[0];
  const stages = (await db.query(
    "SELECT id, name FROM pipeline_stages WHERE vertical_id = $1 ORDER BY position",
    [creVertical.id]
  )).rows;

  const stageMap = {};
  for (const s of stages) stageMap[s.name] = s.id;

  let pipelineInserted = 0;
  for (const rec of peopleRaw) {
    const f = rec.fields;
    const contactId = contactAirtableToUuid.get(rec.id);
    if (!contactId) continue;

    // Determine pipeline stage based on Airtable status
    let stageName = "Discovered"; // default

    if (f["Current Client"]) {
      stageName = "Engaged";
    } else if (f["Status"] === "Booked" || f["Status"] === "Completed") {
      stageName = "Pursuing";
    } else if (f["Status"] === "Needs Follow Up" || f["Status"] === "Needs Reschedule") {
      stageName = "Reviewed";
    } else if (f["Priority Level"] === "High" || f["Priority Level"] === "Medium") {
      stageName = "Enriched";
    }

    // Skip out-of-industry contacts from pipeline
    if (f["Out of Industry"]) continue;

    const stageId = stageMap[stageName];
    if (stageId) {
      await db.query(
        `INSERT INTO contact_pipeline (contact_id, pipeline_stage_id, vertical_id)
         VALUES ($1, $2, $3) ON CONFLICT (contact_id, vertical_id) DO NOTHING`,
        [contactId, stageId, creVertical.id]
      );
      pipelineInserted++;
    }
  }
  console.log(`  Placed ${pipelineInserted} contacts in CRE pipeline\n`);

  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------
  console.log("=== Migration Summary ===");
  const tables = ["companies", "contacts", "properties", "activities", "contact_relationships", "tags", "contact_tags", "contact_pipeline"];
  for (const table of tables) {
    const res = await db.query(`SELECT count(*) FROM ${table}`);
    console.log(`  ${table}: ${res.rows[0].count} records`);
  }

  await db.end();
  console.log("\nMigration complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
