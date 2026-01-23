import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Dashboard } from "./components/Dashboard";
import { StudentList } from "./components/StudentList";
import { StudentProfile } from "./components/StudentProfile";
import { AllIncidents } from "./components/AllIncidents";
import { AddIncidentDialog } from "./components/AddIncidentDialog";
import { EditIncidentDialog } from "./components/EditIncidentDialog";
import { ParentNotificationDialog } from "./components/ParentNotificationDialog";
import { Login } from "./components/Login";
import { StudentEmailDialog } from "./components/StudentEmailDialog";
import { StudentView } from "./components/StudentView";
import { students as initialStudents, incidents as initialIncidents } from "./data/mockData";
import { Incident, CommunicationLog } from "./types";
import { Plus, LogOut } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import logo from "figma:asset/6ca5c626f02129b600665afa033d23b2d70032b4.png";

export default function App() {
  const [students] = useState(initialStudents);
  const [incidents, setIncidents] = useState(initialIncidents);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isStudentViewOpen, setIsStudentViewOpen] = useState(false);
  const [isStudentEmailDialogOpen, setIsStudentEmailDialogOpen] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  
  const handleAdminLogin = (user: any) => {
    if (user.role === 'Student') {
      // For students, find their student record and show student view
      const student = students.find(s => s.email.toLowerCase() === user.email.toLowerCase());
      if (student) {
        setCurrentStudentId(student.id);
        setIsStudentViewOpen(true);
        toast.success(`Welcome, ${student.name}`);
      } else {
        toast.error("Student record not found. Please contact administrator.");
      }
    } else {
      // For admin/faculty staff, show admin dashboard
      setIsAdminLoggedIn(true);
      toast.success("Logged in successfully");
    }
  };
  
  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setSelectedStudentId(null);
    setActiveTab("dashboard");
    toast.success("Logged out successfully");
  };
  
  const handleStudentEmailSubmit = (email: string) => {
    const student = students.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (student) {
      setCurrentStudentId(student.id);
      setIsStudentViewOpen(true);
      setIsStudentEmailDialogOpen(false);
      toast.success(`Welcome, ${student.name}`);
    } else {
      toast.error("Student email not found");
    }
  };
  
  const handleStudentLogout = () => {
    setIsStudentViewOpen(false);
    setCurrentStudentId(null);
    toast.success("Returned to main page");
  };
  
  const handleAddIncident = (newIncident: Omit<Incident, "id">) => {
    const incident: Incident = {
      ...newIncident,
      id: `inc-${Date.now()}`,
    };
    setIncidents([...incidents, incident]);
    toast.success("Incident added successfully");
  };
  
  const handleEditIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateIncident = (updatedIncident: Incident) => {
    setIncidents(incidents.map(inc => 
      inc.id === updatedIncident.id ? updatedIncident : inc
    ));
    toast.success("Incident updated successfully");
  };
  
  const handleDeleteIncident = (incidentId: string) => {
    setIncidents(incidents.filter(inc => inc.id !== incidentId));
    toast.success("Incident deleted successfully");
  };
  
  const handleNotifyParent = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsNotifyDialogOpen(true);
  };
  
  const handleAddCommunication = (log: Omit<CommunicationLog, "id">) => {
    if (!selectedIncident) return;
    
    const newLog: CommunicationLog = {
      ...log,
      id: `comm-${Date.now()}`,
    };
    
    const updatedIncident: Incident = {
      ...selectedIncident,
      communicationLogs: [
        ...(selectedIncident.communicationLogs || []),
        newLog,
      ],
    };
    
    setIncidents(incidents.map(inc => 
      inc.id === selectedIncident.id ? updatedIncident : inc
    ));
    
    toast.success("Communication log added successfully");
  };
  
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab("students");
  };
  
  const handleBackToList = () => {
    setSelectedStudentId(null);
  };
  
  const handleAddIncidentClick = () => {
    setIsAddDialogOpen(true);
  };
  
  const selectedStudent = selectedStudentId 
    ? students.find(s => s.id === selectedStudentId) 
    : null;
  
  // Show student view if student is viewing their records
  if (isStudentViewOpen && currentStudentId) {
    const student = students.find(s => s.id === currentStudentId);
    if (!student) {
      handleStudentLogout();
      return null;
    }
    
    return (
      <>
        <Toaster />
        <StudentView 
          student={student} 
          incidents={incidents} 
          onLogout={handleStudentLogout}
        />
      </>
    );
  }
  
  // Show admin login if not logged in
  if (!isAdminLoggedIn) {
    return (
      <>
        <Toaster />
        <Login onLogin={handleAdminLogin} />
        <StudentEmailDialog
          open={isStudentEmailDialogOpen}
          onOpenChange={setIsStudentEmailDialogOpen}
          onSubmit={handleStudentEmailSubmit}
        />
      </>
    );
  }
  
  // Admin view
  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ImageWithFallback 
                src={logo} 
                alt="ACTS Computer College" 
                className="h-12 w-12"
              />
              <div>
                <h1>D-Manage: Automated Student Disciplinary Management</h1>
                <p className="text-muted-foreground">ACTS Computer College - Administrator</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button onClick={handleAddIncidentClick}>
                <Plus className="h-4 w-4 mr-2" />
                Add Incident
              </Button>
              <Button variant="outline" onClick={handleAdminLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {selectedStudent ? (
          <StudentProfile
            student={selectedStudent}
            incidents={incidents}
            onBack={handleBackToList}
            onAddIncident={() => setIsAddDialogOpen(true)}
            onEditIncident={handleEditIncident}
            onDeleteIncident={handleDeleteIncident}
            onNotifyParent={handleNotifyParent}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="incidents">All Incidents</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard">
              <Dashboard incidents={incidents} students={students} />
            </TabsContent>
            
            <TabsContent value="students">
              <StudentList 
                students={students} 
                incidents={incidents}
                onSelectStudent={handleSelectStudent}
              />
            </TabsContent>
            
            <TabsContent value="incidents">
              <AllIncidents 
                incidents={incidents} 
                students={students}
                onSelectStudent={handleSelectStudent}
                onEditIncident={handleEditIncident}
                onDeleteIncident={handleDeleteIncident}
                onNotifyParent={handleNotifyParent}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>
      
      <AddIncidentDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddIncident={handleAddIncident}
        students={students}
        preselectedStudentId={selectedStudentId || undefined}
      />
      
      {isEditDialogOpen && selectedIncident && (
        <EditIncidentDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onEditIncident={handleUpdateIncident}
          incident={selectedIncident}
        />
      )}
      
      {isNotifyDialogOpen && selectedIncident && (
        <ParentNotificationDialog
          open={isNotifyDialogOpen}
          onOpenChange={setIsNotifyDialogOpen}
          onAddCommunication={handleAddCommunication}
          student={students.find(s => s.id === selectedIncident.studentId)!}
          incident={selectedIncident}
        />
      )}
    </div>
  );
}
