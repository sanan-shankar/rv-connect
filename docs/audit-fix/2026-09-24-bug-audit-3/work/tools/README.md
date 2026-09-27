The ledger harvester lived at /tmp during the audit (repo root and work/ stay clean of scripts);
its logic: for each work/reports/*.md, every `### <ID> — <title>` block (ids may contain lowercase, e.g. T2a) yields id, severity,
confidence and the first Where line; sorted Critical→Low; written to work/candidates.md and .json.
Re-created inline by the orchestrator whenever a report lands.
