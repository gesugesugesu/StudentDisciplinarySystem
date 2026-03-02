import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Incident, IncidentType, Severity, Status } from "../types";

interface EditIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditIncident: (incident: Incident) => void;
  incident: Incident;
}

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

const severities: Severity[] = ["Category 1 Offense", "Category 2 Offense", "Category 3 Offense"];

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
const statuses: Status[] = ["Open", "Under Review", "Resolved"];

export function EditIncidentDialog({
  open,
  onOpenChange,
  onEditIncident,
  incident,
}: EditIncidentDialogProps) {
  const [formData, setFormData] = useState<Incident>(incident);

  useEffect(() => {
    setFormData(incident);
  }, [incident]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEditIncident(formData);
    onOpenChange(false);
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
          <DialogTitle>Edit Incident</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Incident Type</Label>
              <Select
                value={formData.type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger id="edit-type">
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
              <Label htmlFor="edit-severity">Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(value: string) => setFormData({ ...formData, severity: value as Severity })}
              >
                <SelectTrigger id="edit-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {severities.map((severity) => (
                    <SelectItem key={severity} value={severity}>
                      {severity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: string) => setFormData({ ...formData, status: value as Status })}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-action">Action Taken</Label>
            <Textarea
              id="edit-action"
              value={formData.actionTaken}
              onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
              required
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-reported">Reported By</Label>
            <Input
              id="edit-reported"
              value={formData.reportedBy}
              onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
              required
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
