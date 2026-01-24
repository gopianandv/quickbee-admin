import { api } from "@/api/client";

export type Paged<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminCategory = {
  id: string;
  name: string;
  icon?: string | null;   // you have "icon" in schema
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  skillsCount?: number;
  activeSkillsCount?: number;
};

export type AdminSkill = {
  id: string;
  name: string;
  categoryId: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string };
};

export type AdminTag = {
  id: string;
  name: string;
  slug?: string | null;
  emoji?: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ---------------- Categories ----------------
export async function adminListCategories(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  isActive?: boolean;
}) {
  const res = await api.get("/admin/taxonomy/categories", { params });
  return res.data as Paged<AdminCategory>;
}

export async function adminCreateCategory(body: {
  name: string;
  icon?: string | null;
  order?: number;
  isActive?: boolean;
}) {
  const res = await api.post("/admin/taxonomy/categories", body);
  return res.data as AdminCategory;
}

export async function adminUpdateCategory(id: string, body: {
  name?: string;
  icon?: string | null;
  order?: number;
  isActive?: boolean;
}) {
  const res = await api.patch(`/admin/taxonomy/categories/${id}`, body);
  return res.data as AdminCategory;
}

// ---------------- Skills ----------------
export async function adminListSkills(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  categoryId?: string;
  isActive?: boolean;
}) {
  const res = await api.get("/admin/taxonomy/skills", { params });
  return res.data as Paged<AdminSkill>;
}

export async function adminCreateSkill(body: {
  name: string;
  categoryId: string;
  order?: number;
  isActive?: boolean;
}) {
  const res = await api.post("/admin/taxonomy/skills", body);
  return res.data as AdminSkill;
}

export async function adminUpdateSkill(id: string, body: {
  name?: string;
  categoryId?: string;
  order?: number;
  isActive?: boolean;
}) {
  const res = await api.patch(`/admin/taxonomy/skills/${id}`, body);
  return res.data as AdminSkill;
}

// ---------------- Tags ----------------
export async function adminListTags(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  isActive?: boolean;
}) {
  const res = await api.get("/admin/taxonomy/tags", { params });
  return res.data as Paged<AdminTag>;
}

export async function adminCreateTag(body: {
  name: string;
  slug?: string | null;
  emoji?: string | null;
  order?: number;
  isActive?: boolean;
}) {
  const res = await api.post("/admin/taxonomy/tags", body);
  return res.data as AdminTag;
}

export async function adminUpdateTag(id: string, body: {
  name?: string;
  slug?: string | null;
  emoji?: string | null;
  order?: number;
  isActive?: boolean;
}) {
  const res = await api.patch(`/admin/taxonomy/tags/${id}`, body);
  return res.data as AdminTag;
}
