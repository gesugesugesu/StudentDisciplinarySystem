import { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Dashboard } from "./components/Dashboard";
import { StudentList } from "./components/StudentList";
import { StudentProfile } from "./components/StudentProfile";
import { AllIncidents } from "./components/AllIncidents";
import { AddIncidentDialog } from "./components/AddIncidentDialog";
import { AddIncidentForm } from "./components/AddIncidentForm";
import { EditIncidentDialog } from "./components/EditIncidentDialog";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { StudentView } from "./components/StudentView";
import { AdminDashboard } from "./components/AdminDashboard";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
// Removed mock data import
import { Incident, CommunicationLog, UserRole, Student } from "./types";
import { LogOut, Menu, User } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./components/ui/alert-dialog";
import logo from "./assets/6ca5c626f02129b600665afa033d23b2d70032b4.png";
import API_BASE from './config/api';

// Extended student type with additional database fields
interface FetchedStudent extends Student {
  studentNumber?: string;
  firstName?: string;
  lastName?: string;
  yearLevel?: number;
  educationLevel?: string;
  course?: string;
  contactNumber?: string;
}

export default function App() {
  const [dbStudents, setDbStudents] = useState<Student[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Authentication state
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.role || null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isStudentViewOpen, setIsStudentViewOpen] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [currentStudent, setCurrentStudent] = useState<FetchedStudent | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Check for valid token on mount and restore session
  useEffect(() => {
    const restoreSession = async () => {
      // Check if this is first visit - clear session on first load
      const hasVisitedBefore = sessionStorage.getItem('hasVisitedBefore');
      
      if (!hasVisitedBefore) {
        sessionStorage.setItem('hasVisitedBefore', 'true');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoading(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      // If no token or user, show login
      if (!token || !userStr) {
        setIsLoading(false);
        return;
      }
      
      try {
        const user = JSON.parse(userStr);
        
        // Verify token with backend
        const response = await fetch(`${API_BASE}/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          // Token is valid, restore session
          if (user.role === 'Student') {
            // Restore student view
            const emailToQuery = user.email?.trim().toLowerCase();
            const studentResponse = await fetch(`${API_BASE}/students/email/${encodeURIComponent(emailToQuery)}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (studentResponse.ok) {
              const studentData = await studentResponse.json();
              setCurrentStudent(studentData);
              setCurrentStudentId(studentData.id);
              setIsStudentViewOpen(true);
              fetchIncidents();
            } else {
              // Student record not found, clear session
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          } else if (user.role === 'Super Admin' || user.role === 'Discipline Officer') {
            // Restore admin/faculty session
            setCurrentUserRole(user.role);
            setIsAdminLoggedIn(true);
            fetchStudents();
            fetchIncidents();
          } else {
            // Invalid role, clear session
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } else {
          // Token invalid, clear localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      
      setIsLoading(false);
    };
    
    restoreSession();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/students`, {
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

  const fetchIncidents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/incidents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIncidents(data);
      }
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    }
  };

  // No auto-login - always start at login form

  const handleAdminLogin = (user: any) => {
    if (user.role === 'Student') {
      // For students, fetch their student record from the database
      const fetchStudentData = async (retryCount = 0) => {
        try {
          const token = localStorage.getItem('token');
          // Try with the email from login response
          const emailToQuery = user.email?.trim().toLowerCase();
          console.log('Fetching student data for email:', emailToQuery);

          const response = await fetch(`${API_BASE}/students/email/${encodeURIComponent(emailToQuery)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          console.log('Response status:', response.status);

          if (response.ok) {
            const studentData = await response.json();
            console.log('Student data found:', studentData);
            setCurrentStudent(studentData);
            setCurrentStudentId(studentData.id);
            setIsStudentViewOpen(true);
            fetchIncidents(); // Fetch incidents for student view
            toast.success(`Welcome, ${studentData.name}`);
          } else if (retryCount < 2) {
            // Retry up to 2 times with delay to allow backend to create student record
            console.log(`Student record not found, retrying in 1 second (attempt ${retryCount + 1})`);
            setTimeout(() => fetchStudentData(retryCount + 1), 1000);
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Student not found after retries:', errorData);
            toast.error('Student record not found. Please contact administrator.');
            // Redirect to login or show error state
            handleStudentLogout();
          }
        } catch (error) {
          console.error('Error fetching student data:', error);
          if (retryCount < 2) {
            console.log(`Error fetching student data, retrying in 1 second (attempt ${retryCount + 1})`);
            setTimeout(() => fetchStudentData(retryCount + 1), 1000);
          } else {
            toast.error('Unable to load student data. Please try logging in again.');
            handleStudentLogout();
          }
        }
      };

      fetchStudentData();
    } else {
      // For admin/faculty staff, show admin dashboard
      setCurrentUserRole(user.role);
      setIsAdminLoggedIn(true);
      fetchStudents(); // Fetch database students for all admin users
      fetchIncidents(); // Fetch incidents from database
      toast.success("Logged in successfully");
    }
  };
  
  const handleAdminLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAdminLoggedIn(false);
    setCurrentUserRole(null);
    setSelectedStudentId(null);
    setActiveTab("dashboard");
    toast.success("Logged out successfully");
  };

  const handleStudentLogout = () => {
    setIsStudentViewOpen(false);
    setCurrentStudentId(null);
    setCurrentStudent(null);
    toast.success("Returned to main page");
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Password changed successfully");
        setIsChangePasswordOpen(false);
      } else {
        toast.error(data.error || "Failed to change password");
      }
    } catch (error) {
      toast.error("Error changing password");
    }
  };
  
  const handleAddIncident = async (newIncident: Omit<Incident, "id">) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newIncident)
      });
      
      if (response.ok) {
        const savedIncident = await response.json();
        setIncidents([...incidents, savedIncident]);
        toast.success('Incident added successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add incident');
      }
    } catch (error) {
      toast.error('Error adding incident');
    }
  };
  
  const handleEditIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateIncident = (updatedIncident: Incident) => {
    setIncidents(incidents.map(inc => 
      inc.id === updatedIncident.id ? updatedIncident : inc
    ));
    fetchIncidents();
    toast.success("Incident updated successfully");
  };
  
  const handleDeleteIncident = (incidentId: string) => {
    setIncidents(incidents.filter(inc => inc.id !== incidentId));
    fetchIncidents();
    toast.success("Incident deleted successfully");
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
  
  const selectedStudent: Student | null = selectedStudentId
    ? dbStudents.find((s: Student) => s.id === selectedStudentId) || null
    : null;
  
  // Show loading while restoring session
  if (isLoading) {
    return (
      <>
        <Toaster />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Restoring session...</p>
          </div>
        </div>
      </>
    );
  }
  
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
              <img 
                src={logo} 
                alt="ACTS Computer College" 
                className="h-12 w-12"
              />
              <div>
                <h1 className="text-2xl font-bold">D-Manage: Computerized Student Disciplinary Management</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Mobile: Burger menu button with overlay dropdown */}
              <div className="relative lg:hidden" ref={mobileMenuRef}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                {/* Mobile dropdown - properly aligned, no overflow */}
                {isMobileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-card border rounded-xl shadow-xl p-2 z-50 max-w-[90vw] box-border" style={{ right: '10px' }}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full text-left"
                      onClick={() => {
                        setIsChangePasswordOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full text-left mt-1">
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[90vw] max-w-md">
                        <AlertDialogHeader className="text-center sm:text-left">
                          <AlertDialogTitle className="text-xl">Confirm Logout</AlertDialogTitle>
                          <AlertDialogDescription className="text-base">
                            Are you sure you want to log out of your account? You will need to log in again to access the admin dashboard.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                          <AlertDialogCancel className="sm:min-w-[100px]">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleAdminLogout} className="sm:min-w-[100px]">
                            Logout
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
              
              {/* Desktop: Always visible buttons */}
              <div className="hidden lg:flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsChangePasswordOpen(true)}
                >
                  <User className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[90vw] max-w-md">
                    <AlertDialogHeader className="text-center sm:text-left">
                      <AlertDialogTitle className="text-xl">Confirm Logout</AlertDialogTitle>
                      <AlertDialogDescription className="text-base">
                        Are you sure you want to log out of your account? You will need to log in again to access the admin dashboard.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                      <AlertDialogCancel className="sm:min-w-[100px]">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleAdminLogout} className="sm:min-w-[100px]">
                        Logout
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
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
                onDeleteIncident={handleDeleteIncident}
              />
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="students">Students</TabsTrigger>
                  <TabsTrigger value="incidents">All Incidents</TabsTrigger>
                  <TabsTrigger value="add-incident">Add Incident</TabsTrigger>
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
                    onDeleteIncident={handleDeleteIncident}
                  />
                </TabsContent>

                <TabsContent value="add-incident">
                  <AddIncidentForm
                    onAddIncident={handleAddIncident}
                    students={dbStudents}
                  />
                </TabsContent>
              </Tabs>
            )
          } />
          <Route path="/admin" element={
            currentUserRole === 'Super Admin' ? <AdminDashboard /> : <Navigate to="/" replace />
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

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
        onSave={handleChangePassword}
      />
    </div>
  );
}
