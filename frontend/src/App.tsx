import { useState } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
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
import { Register } from "./components/Register";
import { StudentEmailDialog } from "./components/StudentEmailDialog";
import { StudentView } from "./components/StudentView";
import { AdminDashboard } from "./components/AdminDashboard";
import { AddUsersDialog } from "./components/AddUsersDialog";
// Removed mock data import
import { Incident, CommunicationLog, UserRole, Student } from "./types";
import { Plus, LogOut, UserPlus } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import logo from "figma:asset/6ca5c626f02129b600665afa033d23b2d70032b4.png";

export default function App() {
  const [dbStudents, setDbStudents] = useState<Student[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [isAddUsersDialogOpen, setIsAddUsersDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [isStudentViewOpen, setIsStudentViewOpen] = useState(false);
  const [isStudentEmailDialogOpen, setIsStudentEmailDialogOpen] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDbStudents(data);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const handleAdminLogin = (user: any) => {
    if (user.role === 'Student') {
      // For students, find their student record and show student view
      let student = dbStudents.find((s: Student) => s.email.toLowerCase() === user.email.toLowerCase());

      // If not found in mock data, create a temporary student object from user data
      if (!student) {
        // Fetch student data from API or create from user info
        // For now, create a basic student object
        student = {
          id: `student-${user.id}`,
          name: user.fullName,
          email: user.email,
          grade: 1, // Default
          class: 'Unknown', // Default
          parentName: undefined,
          parentEmail: undefined,
          parentPhone: undefined
        };
      }

      if (student) {
        setCurrentStudent(student);
        setCurrentStudentId(student.id);
        setIsStudentViewOpen(true);
        toast.success(`Welcome, ${student.name}`);
      } else {
        toast.error("Student record not found. Please contact administrator.");
      }
    } else {
      // For admin/faculty staff, show admin dashboard
      setCurrentUserRole(user.role);
      setIsAdminLoggedIn(true);
      fetchStudents(); // Fetch database students for all admin users
      toast.success("Logged in successfully");
    }
  };
  
  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setCurrentUserRole(null);
    setSelectedStudentId(null);
    setActiveTab("dashboard");
    toast.success("Logged out successfully");
  };
  
  const handleStudentEmailSubmit = (email: string) => {
    const student = dbStudents.find((s: Student) => s.email.toLowerCase() === email.toLowerCase());
    if (student) {
      setCurrentStudent(student);
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
    setCurrentStudent(null);
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
    ? dbStudents.find((s: Student) => s.id === selectedStudentId)
    : null;
  
  // Show student view if student is viewing their records
  if (isStudentViewOpen && currentStudent) {
    return (
      <>
        <Toaster />
        <StudentView
          student={currentStudent}
          incidents={incidents}
          onLogout={handleStudentLogout}
        />
      </>
    );
  }
  
  // Show auth routes if not logged in
  if (!isAdminLoggedIn) {
    return (
      <>
        <Toaster />
        <Routes>
          <Route path="/login" element={<Login onLogin={handleAdminLogin} />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
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
                <h1 className="text-2xl font-bold">D-Manage: Computerized Student Disciplinary Management</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button onClick={handleAddIncidentClick}>
                <Plus className="h-4 w-4 mr-2" />
                Add Incident
              </Button>
              {currentUserRole === 'Super Admin' && (
                <Button variant="outline" onClick={() => setIsAddUsersDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Users
                </Button>
              )}
              <Button variant="outline" onClick={handleAdminLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={
            selectedStudent ? (
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
                  <Dashboard incidents={incidents} students={dbStudents} />
                </TabsContent>

                <TabsContent value="students">
                  <StudentList
                    students={dbStudents}
                    incidents={incidents}
                    onSelectStudent={handleSelectStudent}
                  />
                </TabsContent>

                <TabsContent value="incidents">
                  <AllIncidents
                    incidents={incidents}
                    students={dbStudents}
                    onSelectStudent={handleSelectStudent}
                    onEditIncident={handleEditIncident}
                    onDeleteIncident={handleDeleteIncident}
                    onNotifyParent={handleNotifyParent}
                  />
                </TabsContent>
              </Tabs>
            )
          } />
          <Route path="/admin" element={
            currentUserRole === 'Super Admin' || currentUserRole === 'Discipline Officer' ? <AdminDashboard /> : <Navigate to="/" replace />
          } />
        </Routes>
      </main>
      
      <AddIncidentDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddIncident={handleAddIncident}
        students={dbStudents}
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
          student={dbStudents.find((s: Student) => s.id === selectedIncident.studentId)!}
          incident={selectedIncident}
        />
      )}
      
      <AddUsersDialog
        open={isAddUsersDialogOpen}
        onOpenChange={setIsAddUsersDialogOpen}
        onUserAdded={() => {
          // Refresh data if needed
        }}
      />
    </div>
  );
}
