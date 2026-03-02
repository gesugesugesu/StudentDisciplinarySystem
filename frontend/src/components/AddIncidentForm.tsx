import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Incident, Severity, Status, Student, Violation } from "../types";
import { FilePlus, AlertTriangle, Shield, Calendar, User, BookOpen, ClipboardList } from "lucide-react";
import { toast } from "sonner";

interface AddIncidentFormProps {
  onAddIncident: (incident: Omit<Incident, "id">) => void;
  students: Student[];
  preselectedStudentId?: string;
}

export function AddIncidentForm({ 
  onAddIncident, 
  students,
  preselectedStudentId 
}: AddIncidentFormProps) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    studentId: preselectedStudentId || "",
    type: "" as string,
    severity: "Category 1 Offense" as Severity,
    date: new Date().toISOString().split('T')[0],
    description: "",
    actionTaken: "",
    status: "Open" as Status,
    reportedBy: "",
  });
  
  const API_BASE = 'http://localhost:5000/api';

  useEffect(() => {
    fetchIncidentTypes();
  }, []);

  const fetchIncidentTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/incidents/violations/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setViolations(data);
        // Set default type to first violation
        if (data.length > 0 && !formData.type) {
          setFormData(prev => ({
            ...prev,
            type: data[0].name,
            severity: data[0].severity
          }));
        }
      }
    } catch (error) {
      toast.error('Failed to fetch incident types');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddIncident({
      ...formData,
      type: formData.type as any,
    });
    // Reset form
    setFormData({
      studentId: preselectedStudentId || "",
      type: violations[0]?.name || "",
      severity: violations[0]?.severity || "Category 1 Offense",
      date: new Date().toISOString().split('T')[0],
      description: "",
      actionTaken: "",
      status: "Open",
      reportedBy: "",
    });
  };

  // Handle incident type change and automatically set severity
  const handleTypeChange = (value: string) => {
    const selectedViolation = violations.find(v => v.name === value);
    setFormData({
      ...formData,
      type: value,
      severity: selectedViolation?.severity || "Category 1 Offense"
    });
  };
  
  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <FilePlus className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Add New Incident</h2>
          <p className="text-muted-foreground">Document and track student disciplinary incidents</p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="p-6">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Selection */}
            <div className="space-y-2">
              <Label htmlFor="student" className="flex items-center gap-2">
                <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                Student
              </Label>
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
            
            {/* Incident Details Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Incident Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger>
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
                <Label htmlFor="severity" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Category
                </Label>
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

              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Date
                </Label>
                <Input
                  id="date"
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
                <Label htmlFor="status" className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Status
                </Label>
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
              
              <div className="space-y-2">
                <Label htmlFor="reportedBy" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Reported By
                </Label>
                <Input
                  id="reportedBy"
                  value={formData.reportedBy}
                  onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                  placeholder="Staff member name"
                  required
                />
              </div>
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-green-600 dark:text-green-400" />
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the incident in detail..."
                required
                rows={3}
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button type="submit">
                <FilePlus className="h-4 w-4 mr-2" />
                Add Incident
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setFormData({
                  studentId: preselectedStudentId || "",
                  type: violations[0]?.name || "",
                  severity: violations[0]?.severity || "Category 1 Offense",
                  date: new Date().toISOString().split('T')[0],
                  description: "",
                  actionTaken: "",
                  status: "Open",
                  reportedBy: "",
                });
              }}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
