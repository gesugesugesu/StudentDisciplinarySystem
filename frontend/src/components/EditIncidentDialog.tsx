import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Incident, Severity, Status, Violation } from "../types";

interface EditIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditIncident: (incident: Incident) => void;
  incident: Incident;
}

export function EditIncidentDialog({
  open,
  onOpenChange,
  onEditIncident,
  incident,
}: EditIncidentDialogProps) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [sanctionTypes, setSanctionTypes] = useState<{sanction_type_id: number; sanction_name: string; category: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Incident>(incident);

  const API_BASE = 'http://localhost:5000/api';

  useEffect(() => {
    fetchViolations();
    fetchSanctionTypes();
  }, []);

  useEffect(() => {
    if (incident) {
      setFormData({
        ...incident,
        date: new Date().toISOString().split('T')[0]
      });
    }
  }, [incident]);

  const fetchViolations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/incidents/violations/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setViolations(data);
      }
    } catch (error) {
      console.error('Failed to fetch violations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSanctionTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/sanctions/types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSanctionTypes(data);
      }
    } catch (error) {
      console.error('Failed to fetch sanction types:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEditIncident(formData);
    onOpenChange(false);
  };

  // Handle incident type change and automatically set severity
  const handleTypeChange = (value: string) => {
    const selectedViolation = violations.find(v => v.name === value);
    setFormData({
      ...formData,
      type: value as any,
      severity: selectedViolation?.severity || "Category 1 Offense"
    });
  };

  // Get sanctions based on category from API
  const getSanctionsByCategory = (category: string) => {
    // Map category format: "Category 1 Offense" -> "Category 1"
    const categoryMap: Record<string, string> = {
      "Category 1 Offense": "Category 1",
      "Category 2 Offense": "Category 2",
      "Category 3 Offense": "Category 3"
    };
    
    const dbCategory = categoryMap[category] || category;
    return sanctionTypes
      .filter(s => s.category === dbCategory)
      .map(s => s.sanction_name);
  };

  if (loading) {
    return null;
  }
   
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Edit Incident</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student Display */}
          <div className="space-y-2">
            <Label htmlFor="edit-student">Student</Label>
            <Input
              id="edit-student"
              value={incident.studentName || ''}
              disabled
              className="bg-muted"
            />
          </div>
          
          {/* Incident Details Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Incident Type</Label>
              <Select
                value={formData.type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger id="edit-type">
                  <SelectValue placeholder="Select violation" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {violations.map((violation) => (
                    <SelectItem key={violation.id} value={violation.name}>
                      {violation.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-severity">Category</Label>
              <Select 
                value={formData.severity}
                onValueChange={(value: string) => setFormData({ ...formData, severity: value as Severity })}
              >
                <SelectTrigger id="edit-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Category 1 Offense">Category 1 Offense</SelectItem>
                  <SelectItem value="Category 2 Offense">Category 2 Offense</SelectItem>
                  <SelectItem value="Category 3 Offense">Category 3 Offense</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
          </div>
          
          {/* Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
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
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the incident in detail..."
              required
              rows={3}
            />
          </div>

          {/* Sanction Section - Only show when status is Resolved */}
          {formData.status === 'Resolved' && (
            <div className="space-y-2">
              <Label htmlFor="edit-sanction">Assign Sanction</Label>
              <Input
                id="edit-sanction"
                value={formData.actionTaken || ''}
                onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                placeholder="Enter sanction (e.g., Written Warning, Suspension, etc.)"
              />
              <p className="text-xs text-muted-foreground">
                Type the sanction to assign to this student
              </p>
            </div>
          )}
           
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
