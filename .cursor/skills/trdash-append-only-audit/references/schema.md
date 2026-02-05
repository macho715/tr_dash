# Append-only minimal schema

## audit_event
- id (uuid)
- created_at_utc (timestamp)
- actor (string)
- event_type (string)      # decision_confirmed, apply_completed, evidence_added...
- entity_type (string)     # decision, schedule, voyage, activity
- entity_id (string)
- payload_json (json)      # 민감정보 금지, 요약/링크 위주
- prev_event_id (uuid, nullable)
