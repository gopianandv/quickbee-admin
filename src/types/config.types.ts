export type SystemConfigRow = {
  id: string;
  key: string;
  value: any;
  description?: string | null;
  isSecret: boolean;
  updatedAt: string;
};
