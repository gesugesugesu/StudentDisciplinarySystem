import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Incident, IncidentType, Severity, Status, Student } from "../types";

interface AddIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddIncident: (incident: Omit<Incident, "id">) => void;
  students: Student[];
  preselectedStudentId?: string;
}

export function AddIncidentDialog({ 
  open, 
  onOpenChange, 
  onAddIncident, 
  students,
  preselectedStudentId 
}: AddIncidentDialogProps) {
  const [formData, setFormData] = useState({
    studentId: preselectedStudentId || "",
    type: "Tardiness" as IncidentType,
    severity: "Category 1 Offense" as Severity,
    date: new Date().toISOString().split('T')[0],
    description: "",
    actionTaken: "",
    status: "Open" as Status,
    reportedBy: "",
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddIncident(formData);
    onOpenChange(false);
    setFormData({
      studentId: preselectedStudentId || "",
      type: "Tardiness",
      severity: "Category 1 Offense",
      date: new Date().toISOString().split('T')[0],
      description: "",
      actionTaken: "",
      status: "Open",
      reportedBy: "",
    });
  };
  
  const incidentTypes: IncidentType[] = [
    "Tardiness",
    "Loitering",
    "Incomplete Uniform",
    "Improper Uniform",
    "Wearing Earrings (Male)",
    "Excessive Jewelry",
    "Colored Hair",
    "Tattoos",
    "Body Piercing",
    "Chewing Gum/Eating in Class",
    "Using Mobile Phone Without Permission",
    "Sleeping in Class",
    "Not Wearing ID",
    "Not Bringing School Materials",
    "Late Submission of Assignments",
    "Improper Haircut",
    "Cutting Classes",
    "Leaving School Without Permission",
    "Disrespect to Teachers/Staff/Students",
    "Cheating in Examinations/Quizzes",
    "Plagiarism",
    "Forgery",
    "Vandalism",
    "Bullying",
    "Physical Assault",
    "Possession of Dangerous Weapons",
    "Possession/Use of Illegal Drugs",
    "Possession/Use of Alcoholic Beverages",
    "Smoking Within School Premises",
    "Theft",
    "Gambling",
    "Sexual Harassment",
    "Other"
  ];

  // Mapping of incident types to their severity levels
  const incidentSeverityMap: Record<IncidentType, Severity> = {
    "Tardiness": "Category 1 Offense",
    "Loitering": "Category 1 Offense",
    "Incomplete Uniform": "Category 1 Offense",
    "Improper Uniform": "Category 1 Offense",
    "Wearing Earrings (Male)": "Category 1 Offense",
    "Excessive Jewelry": "Category 1 Offense",
    "Colored Hair": "Category 1 Offense",
    "Tattoos": "Category 1 Offense",
    "Body Piercing": "Category 1 Offense",
    "Chewing Gum/Eating in Class": "Category 1 Offense",
    "Using Mobile Phone Without Permission": "Category 1 Offense",
    "Sleeping in Class": "Category 1 Offense",
    "Not Wearing ID": "Category 1 Offense",
    "Not Bringing School Materials": "Category 1 Offense",
    "Late Submission of Assignments": "Category 1 Offense",
    "Improper Haircut": "Category 1 Offense",
    "Cutting Classes": "Category 2 Offense",
    "Leaving School Without Permission": "Category 2 Offense",
    "Disrespect to Teachers/Staff/Students": "Category 2 Offense",
    "Cheating in Examinations/Quizzes": "Category 2 Offense",
    "Plagiarism": "Category 2 Offense",
    "Forgery": "Category 2 Offense",
    "Vandalism": "Category 2 Offense",
    "Bullying": "Category 2 Offense",
    "Physical Assault": "Category 3 Offense",
    "Possession of Dangerous Weapons": "Category 3 Offense",
    "Possession/Use of Illegal Drugs": "Category 3 Offense",
    "Possession/Use of Alcoholic Beverages": "Category 3 Offense",
    "Smoking Within School Premises": "Category 3 Offense",
    "Theft": "Category 3 Offense",
    "Gambling": "Category 3 Offense",
    "Sexual Harassment": "Category 3 Offense",
    "Other": "Category 1 Offense"
  };

  // Handle incident type change and automatically set severity
  const handleTypeChange = (value: string) => {
    const selectedType = value as IncidentType;
    const autoSeverity = incidentSeverityMap[selectedType];
    setFormData({
      ...formData,
      type: selectedType,
      severity: autoSeverity
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Add New Incident</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">Student</Label>
            <Select
              value={formData.studentId}
              onValueChange={(value: string) => setFormData({ ...formData, studentId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name} - {student.class}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Incident Type</Label>
              <Select
                value={formData.type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {incidentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="severity">Category</Label>
              <Select 
                value={formData.severity}
                onValueChange={(value: string) => setFormData({ ...formData, severity: value as Severity })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Category 1 Offense">Category 1 Offense</SelectItem>
                  <SelectItem value="Category 2 Offense">Category 2 Offense</SelectItem>
                  <SelectItem value="Category 3 Offense">Category 3 Offense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: string) => setFormData({ ...formData, status: value as Status })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the incident..."
              required
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="actionTaken">Action Taken</Label>
            <Textarea
              id="actionTaken"
              value={formData.actionTaken}
              onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
              placeholder="Describe the action taken..."
              required
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reportedBy">Reported By</Label>
            <Input
              id="reportedBy"
              value={formData.reportedBy}
              onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
              placeholder="Staff member name"
              required
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Incident</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
