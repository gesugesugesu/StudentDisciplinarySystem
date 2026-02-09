export type IncidentType =
  | "Tardiness"
  | "Loitering"
  | "Incomplete Uniform"
  | "Improper Uniform"
  | "Wearing Earrings (Male)"
  | "Excessive Jewelry"
  | "Colored Hair"
  | "Tattoos"
  | "Body Piercing"
  | "Chewing Gum/Eating in Class"
  | "Using Mobile Phone Without Permission"
  | "Sleeping in Class"
  | "Not Wearing ID"
  | "Not Bringing School Materials"
  | "Late Submission of Assignments"
  | "Improper Haircut"
  | "Cutting Classes"
  | "Leaving School Without Permission"
  | "Disrespect to Teachers/Staff/Students"
  | "Cheating in Examinations/Quizzes"
  | "Plagiarism"
  | "Forgery"
  | "Vandalism"
  | "Bullying"
  | "Physical Assault"
  | "Possession of Dangerous Weapons"
  | "Possession/Use of Illegal Drugs"
  | "Possession/Use of Alcoholic Beverages"
  | "Smoking Within School Premises"
  | "Theft"
  | "Gambling"
  | "Sexual Harassment"
  | "Other";

export type Severity = "Minor" | "Major";
export type Status = "Open" | "Resolved" | "Under Review";

export interface Student {
  id: string;
  name: string;
  grade: number;
  class: string;
  email: string;
  avatar?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
}

export interface CommunicationLog {
  id: string;
  date: string;
  method: "Email" | "Phone" | "In-Person" | "Letter";
  contactedBy: string;
  notes: string;
  parentNotified: boolean;
}

export type UserRole = "Super Admin" | "Discipline Officer" | "Student";
export type UserStatus = "pending" | "approved" | "rejected" | "suspended";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Incident {
  id: string;
  studentId: string;
  type: IncidentType;
  severity: Severity;
  date: string;
  description: string;
  actionTaken: string;
  status: Status;
  reportedBy: string;
  communicationLogs?: CommunicationLog[];
}