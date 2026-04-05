import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Incident, Severity, Status, Student, Violation } from "../types";
import { FilePlus, AlertTriangle, Shield, Calendar, User, BookOpen, ClipboardList, Repeat, History, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import API_BASE from '../config/api';

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
  const [offenseInfo, setOffenseInfo] = useState<{
    offenseCount: number;
    previousIncidents: { case_id: number; date_reported: string; violation_name: string; category: string; case_status: string }[];
  } | null>(null);
  const [selectedViolationId, setSelectedViolationId] = useState<number | null>(null);
  const [loadingOffenseInfo, setLoadingOffenseInfo] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [formData, setFormData] = useState({
    studentId: preselectedStudentId || "",
    type: "" as string,
    severity: "Category 1 Offense" as Severity,
    date: new Date().toISOString().split('T')[0],
    description: "",
    actionTaken: "",
    status: "Pending" as Status,
    reportedBy: "",
  });

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
            severity: data[0].severity as Severity
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
      severity: (violations[0]?.severity as Severity) || "Category 1 Offense",
      date: new Date().toISOString().split('T')[0],
      description: "",
      actionTaken: "",
      status: "Pending",
      reportedBy: "",
    });
    setOffenseInfo(null);
  };

  // Fetch offense count when student and offense type are selected
  const fetchOffenseInfo = async (studentId: string, violationId?: number) => {
    if (!studentId) {
      setOffenseInfo(null);
      return;
    }
    
    setLoadingOffenseInfo(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE}/incidents/student/${studentId}/offense-count`;
      
      // If violationId is provided, get offense-specific count
      if (violationId) {
        url += `?violationId=${violationId}`;
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOffenseInfo(data);
      }
    } catch (error) {
      console.error('Error fetching offense info:', error);
    } finally {
      setLoadingOffenseInfo(false);
    }
  };

  // Handle incident type change and automatically set severity
  const handleTypeChange = (value: string) => {
    const selectedViolation = violations.find(v => v.name === value);
    setFormData({
      ...formData,
      type: value,
      severity: (selectedViolation?.severity as Severity) || "Category 1 Offense"
    });
    
    // Fetch offense-specific count if student is selected
    if (formData.studentId && selectedViolation?.id) {
      setSelectedViolationId(selectedViolation.id);
      fetchOffenseInfo(formData.studentId, selectedViolation.id);
    }
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
              <div className="relative">
                <Input
                  id="student"
                  value={studentSearchQuery}
                  onChange={(e) => {
                    setStudentSearchQuery(e.target.value);
                    setShowStudentDropdown(true);
                    if (!e.target.value) {
                      setFormData({ ...formData, studentId: "" });
                      setOffenseInfo(null);
                    }
                  }}
                  onFocus={() => setShowStudentDropdown(true)}
                  onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                  placeholder="Type student name..."
                  required
                />
                {studentSearchQuery && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setStudentSearchQuery("");
                      setFormData({ ...formData, studentId: "" });
                      setOffenseInfo(null);
                      setShowStudentDropdown(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {showStudentDropdown && studentSearchQuery && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                    {students
                      .filter(s => 
                        s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                        s.class?.toLowerCase().includes(studentSearchQuery.toLowerCase())
                      )
                      .map((student) => (
                        <div
                          key={student.id}
                          className="p-2 hover:bg-muted cursor-pointer"
                          onMouseDown={() => {
                            setFormData({ ...formData, studentId: student.id });
                            setStudentSearchQuery(student.name);
                            setShowStudentDropdown(false);
                            setSelectedViolationId(null);
                            setOffenseInfo(null);
                            // Fetch offense info if type is already selected
                            if (formData.type) {
                              const selectedV = violations.find(v => v.name === formData.type);
                              if (selectedV?.id) {
                                fetchOffenseInfo(student.id, selectedV.id);
                              }
                            }
                          }}
                        >
                          {student.name} - {student.class}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Repeat Offender Warning */}
            {loadingOffenseInfo ? (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Loading student record...</p>
              </div>
            ) : offenseInfo && offenseInfo.offenseCount > 0 ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Repeat className="h-5 w-5 text-amber-600" />
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                    {offenseInfo.offenseCount === 1 ? '1st Offense' : 
                     offenseInfo.offenseCount === 2 ? '2nd Offense' : 
                     offenseInfo.offenseCount === 3 ? '3rd Offense' : 
                     `${offenseInfo.offenseCount}th Offense`}
                  </h4>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                  This student has <strong>{offenseInfo.offenseCount}</strong> previous incident(s) of the same offense type.
                </p>
                {offenseInfo.previousIncidents.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      <History className="h-3 w-3" /> Previous incidents:
                    </p>
                    <ul className="mt-1 text-xs text-amber-600 dark:text-amber-400 space-y-1">
                      {offenseInfo.previousIncidents.slice(0, 3).map((incident: any, idx: number) => (
                        <li key={idx}>
                          {new Date(incident.date_reported).toLocaleDateString()} - {incident.case_status}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : formData.studentId && (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    First offense for this type - no previous record found
                  </p>
                </div>
              </div>
            )}
            
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
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
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
severity: (violations[0]?.severity as Severity) || "Category 1 Offense",
                  date: new Date().toISOString().split('T')[0],
                  description: "",
                  actionTaken: "",
                  status: "Pending",
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
