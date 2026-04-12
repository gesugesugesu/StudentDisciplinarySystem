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
import { ArrowLeft, User, Mail, GraduationCap, Bell, Phone, Download, Loader2, MoreVertical } from "lucide-react";
import { Student, Incident } from "../types";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { exportStudentReport, exportStudentIncidentsCSV } from "../utils/exportUtils";
import { toast } from "sonner";
import API_BASE from '../config/api';
import { useIsMobile } from "./ui/use-mobile";

interface StudentProfileProps {
  student: Student;
  incidents: Incident[];
  onBack: () => void;
  onAddIncident: () => void;
  onDeleteIncident: (incidentId: string) => void;
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
  onDeleteIncident,
   
}: StudentProfileProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fetchedStudent, setFetchedStudent] = useState<FetchedStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const isMobile = useIsMobile();

  // Fetch student profile data from API
  useEffect(() => {
    const fetchStudentProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/students/${student.id}`, {
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
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack} className="h-9 w-9 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">Student Profile</h2>
            <p className="text-muted-foreground text-sm">Loading student data...</p>
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
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack} className="h-9 w-9 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">Student Profile</h2>
            <p className="text-destructive text-sm">{error}</p>
          </div>
        </div>
        <Card className="p-6">
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
    <div className="space-y-4 p-4">
      {/* Header - Mobile responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="outline" size="icon" onClick={onBack} className="h-9 w-9 flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">Student Profile</h2>
          <p className="text-muted-foreground text-sm">View detailed disciplinary record</p>
        </div>
        {isMobile ? (
          <div className="flex items-center gap-2">
            <DropdownMenu open={showActionsMenu} onOpenChange={setShowActionsMenu}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportCSV}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAddIncident}>
                  Add Incident
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-shrink-0">
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
        )}
      </div>
      
      {/* Student Info Card - Mobile responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <div className="flex-1 min-w-0 w-full">
              <h3 className="text-lg font-semibold truncate">{displayStudent.name}</h3>
              <div className="mt-2 sm:mt-4 space-y-2">
                <div className="flex items-start gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground text-sm">
                    {fetchedStudent?.educationLevel || 'Student'}
                    {fetchedStudent?.course && ` • ${fetchedStudent.course}`}
                    {displayStudent.class && ` • ${displayStudent.class}`}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground text-sm truncate">{displayStudent.email || 'No email provided'}</span>
                </div>
                {fetchedStudent?.studentNumber && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground text-sm">Student No: {fetchedStudent.studentNumber}</span>
                  </div>
                )}
                {fetchedStudent?.contactNumber && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground text-sm">{fetchedStudent.contactNumber}</span>
                  </div>
                )}
                <div className="pt-2">
                  <Badge variant="secondary">
                    {studentIncidents.length} Total {studentIncidents.length === 1 ? "Incident" : "Incidents"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Incident History - Mobile responsive */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Incident History</h3>
        {studentIncidents.length === 0 ? (
          <Card className="p-6">
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
              <Card key={incident.id} className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-medium text-sm sm:text-base">{incident.type}</h4>
                    <Badge variant={getSeverityColor(incident.severity) as any} className="text-xs">
                      {incident.severity}
                    </Badge>
                    <Badge variant={getStatusColor(incident.status) as any} className="text-xs">
                      {incident.status}
                    </Badge>
                    {incident.communicationLogs && incident.communicationLogs.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Bell className="h-3 w-3 mr-1" />
                        Parent Notified
                      </Badge>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground text-sm">
                      {format(new Date(incident.date), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-muted-foreground text-sm">Description</p>
                    <p className="text-sm">{incident.description}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">Action Taken</p>
                    <p className="text-sm">{incident.actionTaken}</p>
                  </div>
                  
                  {incident.communicationLogs && incident.communicationLogs.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-sm">Communication History</p>
                      <div className="mt-2 space-y-2">
                        {incident.communicationLogs.map((log) => (
                          <div key={log.id} className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                              <Badge variant="outline" className="text-xs w-fit">{log.method}</Badge>
                              <span className="text-muted-foreground text-xs">
                                {format(new Date(log.date), "MMM d, yyyy")}
                              </span>
                            </div>
                            <p className="text-sm">{log.notes}</p>
                            <p className="text-muted-foreground text-xs mt-1">— {log.contactedBy}</p>
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