import { api } from "@/api/client";

export type UserPermissionRow = {
  permission: string;
  createdAt: string;
  grantedBy?: string | null;
};

export type AdminDeleteBlockedResponse = {
  ok: false;
  error: "DELETE_BLOCKED";
  reasons: string[];
  details: {
    walletBalancePaise: number;
    escrowHeldCount: number;
    pendingCashouts: number;
    pendingPaymentIntents: number;
    activeTasks: number;
    openIssues: number;
    pendingPlatformFeePaise: number;
  };
};

export type AdminDeleteSuccessResponse = {
  ok: true;
  message?: string;
  alreadyDeleted?: boolean;
};

export type AdminUserProfileResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;

    isDisabled?: boolean;
    disabledAt?: string | null;
    disabledReason?: string | null;
    disabledByUserId?: string | null;

    isDeleted?: boolean;
    deletedAt?: string | null;
    deletedReason?: string | null;

    profile?: {
      phoneNumber?: string | null;
      displayName?: string | null;
      bio?: string | null;
      languages?: any;
      helperSkillIds?: any;
      serviceAreas?: any;
      profilePicture?: string | null;
    } | null;

    permissions?: UserPermissionRow[];
  };

  kyc: {
    status: string;
    id?: string;
    reason?: string | null;
    createdAt?: string;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
    idFrontUrl?: string | null;
    idBackUrl?: string | null;
    selfieUrl?: string | null;
  };

  stats: {
    tasksPosted: number;
    tasksTaken: number;
    tasksCompletedAsHelper: number;
    tasksCancelledAsHelper: number;
  };

  helperProfile: {
    languages: string[];
    serviceAreas: string[];
    skills: { id: string; name: string; category?: { id: string; name: string } | null }[];
  };

  generatedAt: string;
};

export async function adminGetUserProfile(userId: string) {
  const { data } = await api.get<AdminUserProfileResponse>(`/admin/users/${userId}/profile`);
  return data;
}

export type AssignableUser = {
  id: string;
  name: string;
  email: string;
  permissions?: string[];
};

export type AdminUsersListResponse = {
  items: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;

    isDisabled?: boolean;
    permissions?: UserPermissionRow[];

    isDeleted?: boolean;
    deletedAt?: string | null;
    deletedReason?: string | null;

    profile?: { phoneNumber?: string | null; displayName?: string | null } | null;

    _count?: { tasksPosted: number; tasksTaken: number };
    tasksPosted?: number;
    tasksTaken?: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  generatedAt: string;
};

export async function adminListUsers(params: {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  permission?: string;
  deleted?: "ALL" | "ONLY" | "EXCLUDE";
}) {
  const { data } = await api.get<AdminUsersListResponse>(`/admin/users`, { params });
  return data;
}

export async function adminDisableUser(userId: string, reason: string) {
  const { data } = await api.patch(`/admin/users/${userId}/disable`, { reason });
  return data as { ok: boolean; alreadyDisabled?: boolean };
}

export async function adminEnableUser(userId: string) {
  const { data } = await api.patch(`/admin/users/${userId}/enable`, {});
  return data as { ok: boolean; alreadyEnabled?: boolean };
}

// ✅ NEW: full admin-triggered account deletion
export async function adminDeleteUser(userId: string, reason: string) {
  const { data } = await api.post(`/admin/users/${userId}/delete`, { reason });
  return data as AdminDeleteSuccessResponse;
}

export function isAdminDeleteBlockedError(err: any): err is {
  response: { data: AdminDeleteBlockedResponse; status: number };
} {
  return err?.response?.status === 409 && err?.response?.data?.error === "DELETE_BLOCKED";
}

export function formatDeleteBlockedReasons(reasons?: string[]) {
  const r = (reasons ?? []).map(String);
  if (!r.length) return "Deletion is blocked due to pending account activity.";

  const pretty = (k: string) => {
    switch (k) {
      case "WALLET_BALANCE":
        return "wallet balance";
      case "ESCROW_HELD":
        return "escrow hold";
      case "PENDING_CASHOUT":
        return "pending cashout";
      case "PENDING_PAYMENT_INTENT":
        return "pending payment";
      case "ACTIVE_TASKS":
        return "active tasks";
      case "OPEN_ISSUES":
        return "open issues";
      case "PENDING_PLATFORM_FEE":
        return "pending platform fee";
      default:
        return k.replace(/_/g, " ").toLowerCase();
    }
  };

  return r.map(pretty).join(", ");
}

export async function adminGrantPermission(userId: string, permission: string) {
  const { data } = await api.post(`/admin/users/${userId}/permissions`, { permission });
  return data as { ok: boolean; alreadyGranted?: boolean };
}

export async function adminRevokePermission(userId: string, permission: string) {
  const { data } = await api.delete(`/admin/users/${userId}/permissions/${permission}`);
  return data as { ok: boolean; alreadyRevoked?: boolean };
}

export async function getAssignableUsers(params: { q?: string; limit?: number }) {
  const { data } = await api.get<{ items: AssignableUser[] }>("/admin/users/assignable", {
    params,
  });
  return data.items || [];
}

export async function adminExportUsersXlsx(params: {
  role?: string;
  permission?: string;
  search?: string;
  deleted?: "ALL" | "ONLY" | "EXCLUDE";
}) {
  const res = await api.get(`/admin/users/export`, {
    params,
    responseType: "blob",
  });

  const cd = String(res.headers?.["content-disposition"] || "");
  const m = cd.match(/filename="?([^"]+)"?/i);
  const filename = m?.[1] || `users_export_${Date.now()}.xlsx`;

  return { blob: res.data as Blob, filename };
}