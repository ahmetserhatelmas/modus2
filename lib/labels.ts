export type MedicalBranch =
  | "child_psychiatry"
  | "gastroenterology"
  | "ent"
  | "neurology"
  | "dental"
  | "internal"
  | "genetics";

export type EducationBranch =
  | "ergotherapy"
  | "special_education"
  | "dkt"
  | "inclusion"
  | "shadow_teacher"
  | "movement_education"
  | "swimming";

export type MemberRole = "admin" | "doctor" | "therapist" | "family";

export const MEDICAL_BRANCH_LABELS: Record<MedicalBranch, string> = {
  child_psychiatry: "Çocuk Psikiyatrisi",
  gastroenterology: "Gastroenteroloji",
  ent: "KBB",
  neurology: "Nöroloji",
  dental: "Diş",
  internal: "Dahiliye",
  genetics: "Genetik",
};

export const EDUCATION_BRANCH_LABELS: Record<EducationBranch, string> = {
  ergotherapy: "Ergoterapi",
  special_education: "Özel Eğitim",
  dkt: "DKT",
  inclusion: "Kaynaştırma",
  shadow_teacher: "Gölge Öğretmen",
  movement_education: "Hareket Eğitimi",
  swimming: "Yüzme",
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Sistem yöneticisi",
  doctor: "Doktor",
  therapist: "Terapist / eğitimci",
  family: "Aile",
};

export const MEDICAL_BRANCHES = Object.keys(
  MEDICAL_BRANCH_LABELS,
) as MedicalBranch[];
export const EDUCATION_BRANCHES = Object.keys(
  EDUCATION_BRANCH_LABELS,
) as EducationBranch[];
