export type WorkExperience = {
  company: string;
  role: string;
  duration: string;
  achievements: string[];
};

export type InternshipExperience = WorkExperience;

export type CampusExperience = {
  organization: string;
  role: string;
  duration: string;
  highlights: string[];
};

export type Education = {
  school: string;
  major: string;
  degree: string;
  duration: string;
};

export type ProjectExperience = {
  name: string;
  role: string;
  duration: string;
  highlights: string[];
};

export type Certification = {
  name: string;
  issuer: string;
  date: string;
};

export type Award = {
  name: string;
  issuer: string;
  date: string;
  detail?: string;
};

export type LanguageSkill = {
  name: string;
  proficiency: string;
};

export type ProfessionalSkillGroup = {
  category: string;
  items: string[];
};

export type PersonalInfo = {
  name: string;
  headline?: string;
  contact?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  photo?: string;
  linkedin?: string;
  github?: string;
};

export type ResumePersona = "intern" | "graduate" | "experienced";

export type ResumeModuleId =
  | "profile"
  | "summary"
  | "skills"
  | "education"
  | "internships"
  | "campus"
  | "work"
  | "projects"
  | "awards"
  | "credentials";

export type ResumeData = {
  persona: ResumePersona;
  personal_info: PersonalInfo;
  professional_summary: string;
  skills: ProfessionalSkillGroup[];
  internships: InternshipExperience[];
  work_experience: WorkExperience[];
  education: Education[];
  campus_experience: CampusExperience[];
  projects: ProjectExperience[];
  awards: Award[];
  certifications: Certification[];
  languages: LanguageSkill[];
};
