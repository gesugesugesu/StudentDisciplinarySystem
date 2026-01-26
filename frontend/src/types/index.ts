export type IncidentType = 
  | "Tardiness" 
  | "Misconduct" 
  | "Academic Dishonesty" 
  | "Bullying" 
  | "Vandalism" 
  | "Disruption" 
  | "Dress Code" 
  | "Other";

export type Severity = "Minor" | "Moderate" | "Severe";
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

export type UserRole = "Admin" | "Faculty Staff" | "Super Admin" | "Student";
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