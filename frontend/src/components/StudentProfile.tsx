import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { ArrowLeft, User, Mail, GraduationCap, MoreVertical, Edit, Trash2, Bell, Phone, Download, Loader2 } from "lucide-react";
import { Student, Incident } from "../types";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { exportStudentReport, exportStudentIncidentsCSV } from "../utils/exportUtils";
import { toast } from "sonner";

interface StudentProfileProps {
  student: Student;
  incidents: Incident[];
  onBack: () => void;
  onAddIncident: () => void;
  onEditIncident: (incident: Incident) => void;
  onDeleteIncident: (incidentId: string) => void;
  onNotifyParent: (incident: Incident) => void;
}

interface FetchedStudent extends Student {
  studentNumber?: string;
  firstName?: string;
  lastName?: string;
  yearLevel?: number;
  educationLevel?: string;
  contactNumber?: string;
  course?: string;
}

export function StudentProfile({ 
  student, 
  incidents, 
  onBack, 
  onAddIncident,
  onEditIncident,
  onDeleteIncident,
  onNotifyParent,
}: StudentProfileProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fetchedStudent, setFetchedStudent] = useState<FetchedStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch student profile data from API
  useEffect(() => {
    const fetchStudentProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/students/${student.id}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Student not found');
          }
          throw new Error('Failed to fetch student profile');
        }
        
        const data = await response.json();
        setFetchedStudent(data);
      } catch (err) {
        console.error('Error fetching student profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load student profile');
        // Fallback to prop data
        setFetchedStudent(student);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentProfile();
  }, [student.id]);

  // Use fetched data if available, otherwise fall back to prop
  const displayStudent = fetchedStudent || student;
  const studentIncidents = incidents.filter(i => i.studentId === displayStudent.id);
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Severe": return "destructive";
      case "Moderate": return "default";
      default: return "secondary";
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "destructive";
      case "Under Review": return "default";
      default: return "secondary";
    }
  };
  
  const handleExportPDF = () => {
    exportStudentReport(displayStudent, studentIncidents);
    toast.success("Student report exported to PDF");
  };

  const handleExportCSV = () => {
    exportStudentIncidentsCSV(displayStudent, studentIncidents);
    toast.success("Student incidents exported to CSV");
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2>Student Profile</h2>
            <p className="text-muted-foreground">Loading student data...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Show error state with fallback
  if (error && !fetchedStudent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2>Student Profile</h2>
            <p className="text-destructive">{error}</p>
          </div>
        </div>
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground">Unable to load student profile.</p>
            <Button onClick={onBack} className="mt-4" variant="outline">
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2>Student Profile</h2>
          <p className="text-muted-foreground">View detailed disciplinary record</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleExportCSV}>
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={onAddIncident}>Add Incident</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2">
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1">
              <h3>{displayStudent.name}</h3>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {fetchedStudent?.educationLevel || 'Student'}
                    {fetchedStudent?.course && ` • ${fetchedStudent.course}`}
                    {displayStudent.class && ` • ${displayStudent.class}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{displayStudent.email || 'No email provided'}</span>
                </div>
                {fetchedStudent?.studentNumber && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Student No: {fetchedStudent.studentNumber}</span>
                  </div>
                )}
                {fetchedStudent?.contactNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{fetchedStudent.contactNumber}</span>
                  </div>
                )}
                <div>
                  <Badge variant="secondary">
                    {studentIncidents.length} Total {studentIncidents.length === 1 ? "Incident" : "Incidents"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <h4 className="mb-3">Parent/Guardian Contact</h4>
          <div className="space-y-2">
            <p>{displayStudent.parentName || "Not available"}</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{displayStudent.parentEmail || "Not available"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{displayStudent.parentPhone || "Not available"}</span>
            </div>
          </div>
        </Card>
      </div>
      
      <div>
        <h3 className="mb-4">Incident History</h3>
        {studentIncidents.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <p className="text-muted-foreground">No incidents recorded for this student.</p>
              <Button onClick={onAddIncident} className="mt-4" variant="outline">
                Add First Incident
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {studentIncidents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((incident) => (
              <Card key={incident.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h4>{incident.type}</h4>
                    <Badge variant={getSeverityColor(incident.severity) as any}>
                      {incident.severity}
                    </Badge>
                    <Badge variant={getStatusColor(incident.status) as any}>
                      {incident.status}
                    </Badge>
                    {incident.communicationLogs && incident.communicationLogs.length > 0 && (
                      <Badge variant="outline">
                        <Bell className="h-3 w-3 mr-1" />
                        Parent Notified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {format(new Date(incident.date), "MMM d, yyyy")}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditIncident(incident)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onNotifyParent(incident)}>
                          <Bell className="h-4 w-4 mr-2" />
                          Notify Parent
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirmId(incident.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-muted-foreground">Description</p>
                    <p>{incident.description}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Action Taken</p>
                    <p>{incident.actionTaken}</p>
                  </div>
                  
                  {incident.communicationLogs && incident.communicationLogs.length > 0 && (
                    <div>
                      <p className="text-muted-foreground">Communication History</p>
                      <div className="mt-2 space-y-2">
                        {incident.communicationLogs.map((log) => (
                          <div key={log.id} className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline">{log.method}</Badge>
                              <span className="text-muted-foreground">
                                {format(new Date(log.date), "MMM d, yyyy")}
                              </span>
                            </div>
                            <p>{log.notes}</p>
                            <p className="text-muted-foreground mt-1">— {log.contactedBy}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Reported by: {incident.reportedBy}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open: boolean) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the incident record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  onDeleteIncident(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}