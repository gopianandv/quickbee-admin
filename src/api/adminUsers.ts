import { api } from "@/api/client";

export type AdminUserProfileResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    profile?: {
      phoneNumber?: string | null;
      displayName?: string | null;
      bio?: string | null;
      languages?: any;
      helperSkillIds?: any;
      serviceAreas?: any;
      profilePicture?: string | null;
    } | null;
    permissions?: { permission: string; createdAt: string; grantedBy?: string | null }[];
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
