const pool = require('../config/db');

const TABLE = 'crm_leads';

// Joins stage/source/assignedTo names (and stage color, for the Kanban/list pill) in so
// the frontend never has to do its own lookup-by-id - same "denormalize at read time"
// approach used by rawSku.model.js/bom.model.js. All three FKs are nullable, so LEFT JOIN.
const SELECT_WITH_JOINS = `
  SELECT
    l.*,
    s.name AS "stageName",
    s.color AS "stageColor",
    src.name AS "sourceName",
    cmp.name AS "campaignName",
    u."userName" AS "assignedToName"
  FROM ${TABLE} l
  LEFT JOIN crm_stages s ON s.id = l."stageId"
  LEFT JOIN crm_sources src ON src.id = l."sourceId"
  LEFT JOIN crm_campaigns cmp ON cmp.id = l."campaignId"
  LEFT JOIN users u ON u.id = l."assignedTo"
`;

async function getAll() {
  const result = await pool.query(`${SELECT_WITH_JOINS} ORDER BY l."sortOrder" ASC, l."createdAt" DESC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`${SELECT_WITH_JOINS} WHERE l.id = $1`, [id]);
  return result.rows[0];
}

// Derived from the highest existing sequence number rather than COUNT(*), so a deleted lead
// can't leave a gap that makes a later COUNT(*)+1 collide with a still-existing leadCode.
async function getNextLeadCode() {
  const result = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING("leadCode" FROM 4) AS INTEGER)), 0) AS "maxSeq" FROM ${TABLE} WHERE "leadCode" ~ '^LD-[0-9]+$'`
  );
  const nextSeq = Number(result.rows[0].maxSeq) + 1;
  return `LD-${String(nextSeq).padStart(6, '0')}`;
}

// A new lead is appended to the end of its stage's column rather than defaulting to 0 (which
// would otherwise always jump to the top, ahead of every existing card in that stage).
async function getNextSortOrder(stageId) {
  const result = await pool.query(
    `SELECT COALESCE(MAX("sortOrder"), -1) + 1 AS "nextOrder" FROM ${TABLE} WHERE "stageId" IS NOT DISTINCT FROM $1`,
    [stageId]
  );
  return result.rows[0].nextOrder;
}

// metaLeadId/metaFormId/metaFormName are only ever populated by metaSync.service.js - the
// regular create-lead flow (crmLead.controller.js) never sets them, so they default to null.
async function create(leadCode, fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (
      "leadCode", name, phone, email, company, "stageId", "sourceId", "campaignId", "assignedTo", value, status, priority, "isStarred", "sortOrder", "metaLeadId", "metaFormId", "metaFormName"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *`,
    [
      leadCode,
      fields.name,
      fields.phone,
      fields.email,
      fields.company,
      fields.stageId,
      fields.sourceId,
      fields.campaignId,
      fields.assignedTo,
      fields.value,
      fields.status,
      fields.priority,
      fields.isStarred,
      fields.sortOrder,
      fields.metaLeadId ?? null,
      fields.metaFormId ?? null,
      fields.metaFormName ?? null,
    ]
  );
  return findById(result.rows[0].id);
}

async function findByMetaLeadId(metaLeadId) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE "metaLeadId" = $1`, [metaLeadId]);
  return result.rows[0];
}

async function update(id, fields) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET
      name = $1, phone = $2, email = $3, company = $4, "stageId" = $5, "sourceId" = $6,
      "campaignId" = $7, "assignedTo" = $8, value = $9, status = $10, priority = $11, "isStarred" = $12, "updatedAt" = now()
    WHERE id = $13
    RETURNING *`,
    [
      fields.name,
      fields.phone,
      fields.email,
      fields.company,
      fields.stageId,
      fields.sourceId,
      fields.campaignId,
      fields.assignedTo,
      fields.value,
      fields.status,
      fields.priority,
      fields.isStarred,
      id,
    ]
  );
  return findById(result.rows[0].id);
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

// Rewrites sortOrder (and stageId, in case the moved lead crossed into this stage) for every
// lead in orderedLeadIds to match that exact array order - covers both a same-stage reorder
// and a cross-stage move in one call, since either way the target stage ends up with a fully
// known final order. The stage the lead left doesn't need renumbering - a gap in its
// sortOrder sequence doesn't affect sorting, it's just no longer contiguous.
async function reorderStage(stageId, orderedLeadIds) {
  await Promise.all(
    orderedLeadIds.map((id, index) =>
      pool.query(
        `UPDATE ${TABLE} SET "stageId" = $1, "sortOrder" = $2, "updatedAt" = now() WHERE id = $3`,
        [stageId, index, id]
      )
    )
  );
}

module.exports = { getAll, findById, findByMetaLeadId, getNextLeadCode, getNextSortOrder, create, update, remove, reorderStage };
