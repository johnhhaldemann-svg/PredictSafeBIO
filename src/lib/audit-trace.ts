export type AuditTracePayload = {
  sourceModule?: string;
  sourceRecordId?: string;
  targetModule?: string;
  targetRecordId?: string;
  runId?: string;
  draftOnly?: boolean;
};

export function withAuditTrace<T extends Record<string, unknown>>(payload: T, trace: AuditTracePayload): T & AuditTracePayload {
  return {
    ...payload,
    ...trace
  };
}
