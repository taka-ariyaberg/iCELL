/** Shared types for the Protocol Navigator components.
 *
 *  Both `ProtocolSection` (orchestrator) and `ProtocolDetailCard`
 *  (right-hand detail panel) reference these.
 */

export type ProtocolMode = 'cells' | 'dyes';

export type ProtocolEntry = {
  id: string;
  plateKey: string;
  title: string;
  subtitle: string;
  wells: string[];
  totalWellCount: number;
  details: string[];
};