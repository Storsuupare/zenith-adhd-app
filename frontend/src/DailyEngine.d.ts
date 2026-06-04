export interface DailyRecord {
  ts: number;
  [key: string]: unknown;
}

export declare const getRecord: () => DailyRecord[];
export declare const signal: (data: Record<string, unknown>) => void;
