import { api } from "@/api/client";

export type UserPermissionRow = {
  permission: string;
  createdAt: string;
  grantedBy?: string | null;
};

export type AdminUserProfileResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;

    // ✅ disable/enable fields
    isDisabled?: boolean;
    disabledAt?: string | null;
    disabledReason?: string | null;
    disabledByUserId?: string | null;

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

export type AdminUsersListResponse = {
  items: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;

    // ✅ for list UI
    isDisabled?: boolean;
    permissions?: UserPermissionRow[];

    profile?: { phoneNumber?: string | null; displayName?: string | null } | null;

    // backend returns both
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
