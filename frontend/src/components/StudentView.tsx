import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import logo from "figma:asset/6ca5c626f02129b600665afa033d23b2d70032b4.png";
import { User, Mail, GraduationCap, LogOut, AlertCircle, Clock, CheckCircle, Phone } from "lucide-react";
import { Student, Incident } from "../types";
import { format } from "date-fns";

interface StudentViewProps {
  student: Student;
  incidents: Incident[];
  onLogout: () => void;
}

export function StudentView({ student, incidents, onLogout }: StudentViewProps) {
  const studentIncidents = incidents.filter(i => i.studentId === student.id);
  const openIncidents = studentIncidents.filter(i => i.status === "Open").length;
  const resolvedIncidents = studentIncidents.filter(i => i.status === "Resolved").length;
  const underReview = studentIncidents.filter(i => i.status === "Under Review").length;
  
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ImageWithFallback 
              src={logo} 
              alt="ACTS Computer College" 
              className="h-12 w-12"
            />
            <div>
              <h1 className="text-lg">D-Manage: Student Portal</h1>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Student Profile */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h2>{student.name}</h2>
                <p className="text-muted-foreground">Grade {student.grade} - {student.class}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{student.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  <span>Class: {student.class}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Open Cases</p>
                <p className="mt-2">{openIncidents}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Under Review</p>
                <p className="mt-2">{underReview}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Resolved</p>
                <p className="mt-2">{resolvedIncidents}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Incidents List */}
        <Card className="p-6">
          <h3 className="mb-4">Your Disciplinary Records</h3>
          
          {studentIncidents.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3>No Disciplinary Records</h3>
              <p className="text-muted-foreground mt-2">
                You have a clean record. Keep up the good behavior!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {studentIncidents
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((incident) => (
                  <Card key={incident.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4>{incident.type}</h4>
                            <Badge variant={getSeverityColor(incident.severity) as any}>
                              {incident.severity}
                            </Badge>
                            <Badge variant={getStatusColor(incident.status) as any}>
                              {incident.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(incident.date), "MMMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Description:</p>
                          <p className="text-sm">{incident.description}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Action Taken:</p>
                          <p className="text-sm">{incident.actionTaken}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Reported By:</p>
                          <p className="text-sm">{incident.reportedBy}</p>
                        </div>
                      </div>
                      
                      {incident.communicationLogs && incident.communicationLogs.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-sm text-muted-foreground mb-2">Parent Notifications:</p>
                          <div className="space-y-2">
                            {incident.communicationLogs.map((log) => (
                              <div key={log.id} className="bg-muted/50 p-2 rounded text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {log.method}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(log.date), "MMM d, yyyy")}
                                  </span>
                                </div>
                                <p className="text-xs">{log.notes}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </Card>

        {/* Parent Contact Information */}
        {student.parentName && (
          <Card className="p-6">
            <h3 className="mb-4">Parent/Guardian Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{student.parentName}</span>
              </div>
              {student.parentEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{student.parentEmail}</span>
                </div>
              )}
              {student.parentPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{student.parentPhone}</span>
                </div>
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
