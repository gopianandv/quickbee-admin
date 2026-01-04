export type KycStatus = "PENDING" | "APPROVED" | "REJECTED" | "NOT_STARTED";

export type KycUser = {
  id: string;
  name: string;
  email: string;
  profile?: { phoneNumber?: string | null } | null;
};

export type KycListItem = {
  id: string;
  status: KycStatus;
  createdAt: string;
  user: KycUser;
};

export type KycListResponse = {
  items: KycListItem[];
  total: number;
  hasMore: boolean;
};

export type KycDetail = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason?: string | null;
  idFrontUrl?: string | null;
  idBackUrl?: string | null;
  selfieUrl?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  user?: { id: string; name: string; email: string; profile?: any };
};
