import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { User, UserRole, UserStatus, Incident, GroupedStudentRecord } from "../types";
import { toast } from "sonner";
import { AddUsersDialog } from "./AddUsersDialog";
import { ViolationManagement } from "./ViolationManagement";
import { EditIncidentDialog } from "./EditIncidentDialog";
import { CheckCircle, XCircle, UserCheck, UserX, Trash2, Users, Clock, RefreshCw, Eye, Pencil, ChevronLeft, ChevronRight, UserPlus, FileText, AlertTriangle, CheckSquare, XSquare, Search, X, ArrowUpDown, Repeat } from "lucide-react";
import API_BASE from '../config/api';

export function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [studentRecords, setStudentRecords] = useState<GroupedStudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [viewIncident, setViewIncident] = useState<Incident | null>(null);
  const [editIncident, setEditIncident] = useState<Incident | null>(null);
  const [isEditIncidentDialogOpen, setIsEditIncidentDialogOpen] = useState(false);
  const [viewStudentRecord, setViewStudentRecord] = useState<Incident | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewIncidentDialogOpen, setIsViewIncidentDialogOpen] = useState(false);
  const [isViewStudentRecordDialogOpen, setIsViewStudentRecordDialogOpen] = useState(false);
  const [isAddUsersDialogOpen, setIsAddUsersDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "" as UserRole,
    status: "" as UserStatus
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [incidentsPage, setIncidentsPage] = useState(1);
  const [studentRecordsPage, setStudentRecordsPage] = useState(1);
  const itemsPerPage = 10;

  // Offense search state
  const [offenseSearchQuery, setOffenseSearchQuery] = useState('');
  const [offenseSearchResults, setOffenseSearchResults] = useState<{id: number; name: string; severity: string; description: string | null}[]>([]);
  const [selectedOffense, setSelectedOffense] = useState<{id: number; name: string; severity: string} | null>(null);
  const [studentsByOffense, setStudentsByOffense] = useState<Incident[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showOffenseSuggestions, setShowOffenseSuggestions] = useState(false);
  const [offenseSortOrder, setOffenseSortOrder] = useState<'date_desc' | 'date_asc'>('date_desc');
  const [offenseResultsPage, setOffenseResultsPage] = useState(1);
  
  // Repeat offender tracking
  const [studentOffenseCounts, setStudentOffenseCounts] = useState<Record<string, number>>({});
  const [loadingOffenseCounts, setLoadingOffenseCounts] = useState(false);
  const [studentRecordsOffenseCounts, setStudentRecordsOffenseCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchUsers();
    fetchIncidents();
    fetchStudentRecords();
  }, []);

  const refreshData = () => {
    fetchUsers();
    fetchIncidents();
    fetchStudentRecords();
  };

  const fetchStudentRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/student-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStudentRecords(data);
        
        // Compute offense counts from student records
        const counts: Record<string, number> = {};
        data.forEach((record: GroupedStudentRecord) => {
          record.violations.forEach(violation => {
            const key = `${record.studentId}-${violation.violationId}`;
            counts[key] = (counts[key] || 0) + 1;
          });
        });
        setStudentRecordsOffenseCounts(counts);
      }
    } catch (error) {
      toast.error('Failed to fetch student records');
    }
  };

  // Search offenses by name (partial match)
  const searchOffenses = async (query: string) => {
    if (!query.trim()) {
      setOffenseSearchResults([]);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/student-records/search-offenses?query=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOffenseSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching offenses:', error);
    }
  };

  // Fetch students by selected offense
  const fetchStudentsByOffense = async (offenseId: number, sortOrder: 'date_desc' | 'date_asc' = 'date_desc') => {
    setSearchLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/student-records/by-offense/${offenseId}?sort=${sortOrder}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStudentsByOffense(data);
      }
    } catch (error) {
      toast.error('Failed to fetch students by offense');
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle offense search input change
  const handleOffenseSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setOffenseSearchQuery(query);
    setSelectedOffense(null);
    setStudentsByOffense([]);
    setOffenseResultsPage(1);
    
    if (query.trim()) {
      searchOffenses(query);
      setShowOffenseSuggestions(true);
    } else {
      setOffenseSearchResults([]);
      setShowOffenseSuggestions(false);
    }
  };

  // Handle offense selection
  const handleOffenseSelect = (offense: {id: number; name: string; severity: string}) => {
    setSelectedOffense(offense);
    setOffenseSearchQuery(offense.name);
    setShowOffenseSuggestions(false);
    setOffenseSearchResults([]);
    fetchStudentsByOffense(offense.id, offenseSortOrder);
  };

  // Clear search
  const clearOffenseSearch = () => {
    setOffenseSearchQuery('');
    setSelectedOffense(null);
    setOffenseSearchResults([]);
    setStudentsByOffense([]);
    setShowOffenseSuggestions(false);
    setOffenseResultsPage(1);
  };

  // Handle sort change
  const handleOffenseSortChange = (newSortOrder: 'date_desc' | 'date_asc') => {
    setOffenseSortOrder(newSortOrder);
    if (selectedOffense) {
      fetchStudentsByOffense(selectedOffense.id, newSortOrder);
    }
  };

  // Fetch offense count for a student (offense-specific)
  const fetchStudentOffenseCount = async (studentId: string, violationId?: string): Promise<number> => {
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE}/incidents/student/${studentId}/offense-count`;
      if (violationId) {
        url += `?violationId=${violationId}`;
      }
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        return data.offenseCount || 0;
      }
    } catch (error) {
      console.error('Error fetching offense count:', error);
    }
    return 0;
  };

  // Compute offense-specific counts from loaded incidents
  const computeOffenseCounts = () => {
    const counts: Record<string, number> = {};
    
    // For each incident, count how many times this student has this specific violation
    incidents.forEach(incident => {
      if (incident.studentId && incident.violationId) {
        const key = `${incident.studentId}-${incident.violationId}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    
    setStudentOffenseCounts(counts);
    setLoadingOffenseCounts(false);
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
        // Compute offense counts after incidents are loaded
        setTimeout(() => computeOffenseCounts(), 100);
      }
    } catch (error) {
      toast.error('Failed to fetch incidents');
    }
  };

  const handleApproveIncident = async (incidentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/incidents/${incidentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Resolved' })
      });
      if (response.ok) {
        toast.success('Incident approved and resolved');
        fetchIncidents();
      } else {
        toast.error('Failed to approve incident');
      }
    } catch (error) {
      toast.error('Error approving incident');
    }
  };

  const handleRejectIncident = async (incidentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/incidents/${incidentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Open' })
      });
      if (response.ok) {
        toast.success('Incident reopened for review');
        fetchIncidents();
      } else {
        toast.error('Failed to reopen incident');
      }
    } catch (error) {
      toast.error('Error reopening incident');
    }
  };

  const handleApproveToUnderReview = async (incidentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/incidents/${incidentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Under Review' })
      });
      if (response.ok) {
        toast.success('Incident approved and now under review');
        fetchIncidents();
      } else {
        toast.error('Failed to approve incident');
      }
    } catch (error) {
      toast.error('Error approving incident');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.map((u: any) => ({
          id: u.user_id,
          name: u.full_name,
          email: u.email,
          role: u.role as UserRole,
          status: u.status as UserStatus,
          createdAt: u.created_at
        })));
      }
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved' })
      });
      if (response.ok) {
        toast.success('User approved successfully');
        fetchUsers();
      } else {
        toast.error('Failed to approve user');
      }
    } catch (error) {
      toast.error('Error approving user');
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (response.ok) {
        toast.success('User rejected');
        fetchUsers();
      } else {
        toast.error('Failed to reject user');
      }
    } catch (error) {
      toast.error('Error rejecting user');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: UserStatus) => {
    const newStatus = currentStatus === 'approved' ? 'suspended' : 'approved';
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast.success(`User ${newStatus === 'approved' ? 'activated' : 'suspended'}`);
        fetchUsers();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error('Failed to delete user');
      }
    } catch (error) {
      toast.error('Error deleting user');
    }
  };

  const handleViewUser = (user: User) => {
    setViewUser(user);
    setIsViewDialogOpen(true);
  };

  const handleViewIncident = (incident: Incident) => {
    setViewIncident(incident);
    setIsViewIncidentDialogOpen(true);
  };

  const handleEditIncidentClick = (incident: Incident) => {
    setEditIncident(incident);
    setIsEditIncidentDialogOpen(true);
  };

  const handleSaveEditIncident = async (updatedIncident: Incident) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/incidents/${updatedIncident.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: updatedIncident.type,
          severity: updatedIncident.severity,
          date: updatedIncident.date,
          description: updatedIncident.description,
          status: updatedIncident.status,
          reportedBy: updatedIncident.reportedBy,
          sanction: updatedIncident.actionTaken
        })
      });
      if (response.ok) {
        toast.success('Incident updated successfully');
        fetchIncidents();
        setIsEditIncidentDialogOpen(false);
      } else {
        toast.error('Failed to update incident');
      }
    } catch (error) {
      toast.error('Error updating incident');
    }
  };

  const handleViewStudentRecord = (record: Incident) => {
    setViewStudentRecord(record);
    setIsViewStudentRecordDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;

    try {
      const token = localStorage.getItem('token');
      
      // Update name
      if (editFormData.name !== editUser.name) {
        const nameParts = editFormData.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        await fetch(`${API_BASE}/users/${editUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ firstName, lastName })
        });
      }

      // Update role
      if (editFormData.role !== editUser.role) {
        await fetch(`${API_BASE}/users/${editUser.id}/role`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ role: editFormData.role })
        });
      }

      // Update status
      if (editFormData.status !== editUser.status) {
        await fetch(`${API_BASE}/users/${editUser.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: editFormData.status })
        });
      }

      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error('Error updating user');
    }
  };

  // Separate pending users from the main list
  const pendingUsers = users.filter(u => u.status === 'pending');
  const approvedUsers = users.filter(u => u.status === 'approved');
  const rejectedUsers = users.filter(u => u.status === 'rejected');
  const suspendedUsers = users.filter(u => u.status === 'suspended');
  
  // Combined sorted users list
  const allUsersSorted = [...pendingUsers, ...approvedUsers, ...suspendedUsers, ...rejectedUsers];

  // Pagination for all users
  const totalPages = Math.ceil(allUsersSorted.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = allUsersSorted.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to page 1 when users change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [users, totalPages, currentPage]);

  // Statistics
  const totalUsers = users.length;
  const approvedCount = approvedUsers.length;
  const suspendedCount = suspendedUsers.length;
  const pendingCount = pendingUsers.length;

  // Filter out resolved incidents for the Incident Reports tab
  const activeIncidents = incidents.filter(i => i.status !== 'Resolved');
  
  // Pagination for incidents
  const incidentsTotalPages = Math.ceil(activeIncidents.length / itemsPerPage);
  const incidentsStartIndex = (incidentsPage - 1) * itemsPerPage;
  const paginatedIncidents = activeIncidents.slice(incidentsStartIndex, incidentsStartIndex + itemsPerPage);

  // Pagination for student records
  const studentRecordsTotalPages = Math.ceil((studentRecords?.length || 0) / itemsPerPage);
  const studentRecordsStartIndex = (studentRecordsPage - 1) * itemsPerPage;
  const paginatedStudentRecords = studentRecords?.slice(studentRecordsStartIndex, studentRecordsStartIndex + itemsPerPage) || [];

  // Pagination for offense search results
  const offenseResultsTotalPages = Math.ceil(studentsByOffense.length / itemsPerPage);
  const offenseResultsStartIndex = (offenseResultsPage - 1) * itemsPerPage;
  const paginatedOffenseResults = studentsByOffense.slice(offenseResultsStartIndex, offenseResultsStartIndex + itemsPerPage);

  // Reset incidents page when incidents change
  useEffect(() => {
    if (incidentsPage > incidentsTotalPages && incidentsTotalPages > 0) {
      setIncidentsPage(1);
    }
  }, [incidents, incidentsTotalPages, incidentsPage]);

  // Reset student records page when student records change
  useEffect(() => {
    if (studentRecordsPage > studentRecordsTotalPages && studentRecordsTotalPages > 0) {
      setStudentRecordsPage(1);
    }
  }, [studentRecords, studentRecordsTotalPages, studentRecordsPage]);
  
  // Incident Statistics (only active incidents, not resolved)
  const totalIncidents = activeIncidents.length;
  const openIncidents = incidents.filter(i => i.status === 'Pending').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'Resolved').length;
  const underReviewIncidents = incidents.filter(i => i.status === 'Under Review').length;

  // Student Records Statistics (count total violations across all students)
  const totalStudentRecords = studentRecords?.reduce((sum, record) => sum + record.violations.length, 0) || 0;
  const pendingStudentRecords = studentRecords?.reduce((sum, record) => 
    sum + record.violations.filter(v => v.status === 'Pending').length, 0) || 0;
  const resolvedStudentRecords = studentRecords?.reduce((sum, record) => 
    sum + record.violations.filter(v => v.status === 'Resolved').length, 0) || 0;
  const dismissedStudentRecords = studentRecords?.reduce((sum, record) => 
    sum + record.violations.filter(v => v.status === 'Dismissed').length, 0) || 0;

  const pendingIncidents = incidents.filter(i => i.status === 'Pending');
  const recentIncidents = activeIncidents.slice(0, 5);

  const roleData = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(roleData).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count: value,
  }));

  const statusData = [
    { name: 'Approved', value: approvedCount, color: '#22c55e' },
    { name: 'Suspended', value: suspendedCount, color: '#ef4444' },
    { name: 'Pending', value: pendingCount, color: '#f59e0b' },
    { name: 'Rejected', value: rejectedUsers.length, color: '#6b7280' },
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-muted-foreground text-sm">Manage users and view statistics</p>
        </div>
        <Button onClick={refreshData} variant="outline" size="icon" className="h-10 w-10" style={{ backgroundColor: '#15803d', color: 'white' }}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="w-full overflow-x-auto flex-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="incidents">Incident Reports</TabsTrigger>
          <TabsTrigger value="records">Student Records</TabsTrigger>
          <TabsTrigger value="violations">Violation Management</TabsTrigger>
          <TabsTrigger value="stats">User Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Pending Approvals Section */}
          {pendingUsers.length > 0 && (
            <Card className="p-6 border-yellow-500 border">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-yellow-600" />
                <h3 className="text-lg font-semibold">Pending Approvals ({pendingCount})</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt || '').toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewUser(user)}
                            className="text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                            className="text-xs"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            style={{
                              backgroundColor: '#16a34a',
                              color: 'white',
                            }}
                            onClick={() => handleApproveUser(user.id)}
                            className="text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectUser(user.id)}
                            className="text-xs"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Reject</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* All Users Section */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <h3 className="text-lg font-semibold">All Users ({totalUsers})</h3>
              <Button size="sm" onClick={() => setIsAddUsersDialogOpen(true)} style={{ backgroundColor: '#15803d', color: 'white' }}>
                <UserPlus className="h-4 w-4 mr-1" />
                Add User
              </Button>
            </div>
            <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-1/4">Name</TableHead>
                  <TableHead className="w-1/4">Email</TableHead>
                  <TableHead className="w-1/5">Role</TableHead>
                  <TableHead className="w-1/5">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium truncate max-w-[200px]">{user.name}</TableCell>
                    <TableCell className="truncate max-w-[200px]">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="whitespace-nowrap">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        user.status === 'approved' ? 'default' :
                        user.status === 'suspended' ? 'destructive' :
                        user.status === 'pending' ? 'secondary' : 'outline'
                      } className="whitespace-nowrap">
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {user.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            
            {/* Pagination and Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-t bg-muted/30 gap-3">
              <span className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, allUsersSorted.length)} of {allUsersSorted.length} users
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex-shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <div className="flex items-center gap-1 mx-2 flex-shrink-0">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex-shrink-0"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          {/* Pending/Under Review Incidents Section */}
          {pendingIncidents.length > 0 && (
            <Card className="p-6 border-yellow-500 border">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h3 className="text-lg font-semibold">Pending Review ({openIncidents})</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Violation Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Previous Offenses</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingIncidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-medium">
                        {incident.studentName || incident.studentId}
                      </TableCell>
                      <TableCell>{incident.type}</TableCell>
                      <TableCell>
                        <Badge variant={incident.severity === 'Category 3 Offense' ? 'destructive' : 'secondary'}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {studentOffenseCounts[incident.studentId] > 0 ? (
                          <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                            <Repeat className="h-3 w-3 mr-1" />
                            {studentOffenseCounts[incident.studentId]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">First</span>
                        )}
                      </TableCell>
                      <TableCell>{new Date(incident.date).toLocaleDateString()}</TableCell>
                      <TableCell>{incident.reportedBy}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewIncident(incident)}
                            className="text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditIncidentClick(incident)}
                            className="text-xs"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            style={{
                              backgroundColor: '#16a34a',
                              color: 'white',
                            }}
                            onClick={() => handleApproveToUnderReview(incident.id)}
                            className="text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Approve</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* All Incidents Section (excluding resolved) */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <h3 className="text-lg font-semibold">All Incidents ({activeIncidents.length})</h3>
            </div>
            <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-1/7">Student</TableHead>
                  <TableHead className="w-1/7">Violation Type</TableHead>
                  <TableHead className="w-1/8">Category</TableHead>
                  <TableHead className="w-1/8">Status</TableHead>
                  <TableHead className="w-1/8">Previous</TableHead>
                  <TableHead className="w-1/8">Date</TableHead>
                  <TableHead className="w-1/7">Reported By</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedIncidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-medium truncate max-w-[150px]">
                      {incident.studentName || incident.studentId}
                    </TableCell>
                    <TableCell className="truncate max-w-[150px]">{incident.type}</TableCell>
                    <TableCell>
                      <Badge variant={incident.severity === 'Category 3 Offense' ? 'destructive' : 'secondary'}>
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        incident.status === 'Resolved' ? 'default' :
                        incident.status === 'Pending' ? 'secondary' :
                        incident.status === 'Under Review' ? 'outline' :
                        'outline'
                      }>
                        {incident.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {studentOffenseCounts[`${incident.studentId}-${incident.violationId}`] > 0 ? (
                        <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                          <Repeat className="h-3 w-3 mr-1" />
                          {studentOffenseCounts[`${incident.studentId}-${incident.violationId}`]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(incident.date).toLocaleDateString()}</TableCell>
                    <TableCell className="truncate max-w-[120px]">{incident.reportedBy}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewIncident(incident)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditIncidentClick(incident)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            {/* Pagination for Incidents */}
            {incidentsTotalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-t gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing {incidentsStartIndex + 1} to {Math.min(incidentsStartIndex + itemsPerPage, activeIncidents.length)} of {activeIncidents.length} incidents
                </p>
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIncidentsPage(incidentsPage - 1)}
                    disabled={incidentsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Previous</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIncidentsPage(incidentsPage + 1)}
                    disabled={incidentsPage === incidentsTotalPages}
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Incident Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Open</p>
                  <p className="text-2xl font-bold text-yellow-600">{openIncidents}</p>
                </div>
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
              </div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{resolvedIncidents}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Under Review</p>
                  <p className="text-2xl font-bold text-blue-600">{underReviewIncidents}</p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          {/* Offense Search Section */}
          <Card className="p-4 overflow-visible">
            <div className="relative">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    type="text"
                    placeholder="Search for an offense (e.g., Bullying, Cheating)..."
                    value={offenseSearchQuery}
                    onChange={handleOffenseSearchChange}
                    onFocus={() => offenseSearchQuery && setShowOffenseSuggestions(true)}
                    className="pl-10 pr-4"
                  />
                </div>
                {offenseSearchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearOffenseSearch}
                    className="px-2 self-stretch"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Offense Suggestions Dropdown */}
              {showOffenseSuggestions && offenseSearchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                  {offenseSearchResults.map((offense) => (
                    <div
                      key={offense.id}
                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => handleOffenseSelect(offense)}
                    >
                      <div className="font-medium">{offense.name}</div>
                      <div className="text-sm text-muted-foreground">
                        <Badge variant={offense.severity === 'Category 3 Offense' ? 'destructive' : offense.severity === 'Category 2 Offense' ? 'secondary' : 'outline'}>
                          {offense.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Search Results Section */}
          {selectedOffense && (
            <Card className="overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b bg-muted/30 gap-2">
                <div>
                  <h3 className="text-lg font-semibold">
                    Students with Offense: {selectedOffense.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {studentsByOffense.length} record(s) found
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOffenseSortChange(offenseSortOrder === 'date_desc' ? 'date_asc' : 'date_desc')}
                  >
                    <ArrowUpDown className="h-4 w-4 mr-1" />
                    {offenseSortOrder === 'date_desc' ? 'Newest' : 'Oldest'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearOffenseSearch}
                  >
                    <X className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                </div>
              </div>
              
              {searchLoading ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : studentsByOffense.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No records found for this offense.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-1/6">Student Name</TableHead>
                        <TableHead className="w-1/6">Student ID</TableHead>
                        <TableHead className="w-1/6">Offense Name</TableHead>
                        <TableHead className="w-1/8">Offense Category</TableHead>
                        <TableHead className="w-1/8">Date Reported</TableHead>
                        <TableHead className="w-1/8">Status</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOffenseResults.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.studentName || record.studentId}
                          </TableCell>
                          <TableCell>{record.studentId}</TableCell>
                          <TableCell>{record.type}</TableCell>
                          <TableCell>
                            <Badge variant={record.severity === 'Category 3 Offense' ? 'destructive' : record.severity === 'Category 2 Offense' ? 'secondary' : 'outline'}>
                              {record.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant={
                              record.status === 'Resolved' ? 'default' :
                              record.status === 'Under Review' ? 'secondary' :
                              record.status === 'Open' ? 'destructive' :
                              'outline'
                            }>
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewStudentRecord(record)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                  
                  {/* Pagination for Search Results */}
                  {offenseResultsTotalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-t gap-3">
                      <p className="text-sm text-muted-foreground">
                        Showing {offenseResultsStartIndex + 1} to {Math.min(offenseResultsStartIndex + itemsPerPage, studentsByOffense.length)} of {studentsByOffense.length} records
                      </p>
                      <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOffenseResultsPage(offenseResultsPage - 1)}
                          disabled={offenseResultsPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline ml-1">Previous</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOffenseResultsPage(offenseResultsPage + 1)}
                          disabled={offenseResultsPage === offenseResultsTotalPages}
                        >
                          <span className="hidden sm:inline mr-1">Next</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

          {/* All Student Records Section */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <h3 className="text-lg font-semibold">All Student Records ({totalStudentRecords})</h3>
            </div>
            <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-1/6">Student</TableHead>
                  <TableHead className="w-1/6">Violation Type</TableHead>
                  <TableHead className="w-1/8">Category</TableHead>
                  <TableHead className="w-1/8">Count</TableHead>
                  <TableHead className="w-1/8">Status</TableHead>
                  <TableHead className="w-1/8">Date</TableHead>
                  <TableHead className="w-1/6">Reported By</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudentRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No student records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStudentRecords.map((record) => (
                    record.violations.map((violation, index) => (
                      <TableRow key={`${record.studentId}-${violation.id}`}>
                        {index === 0 && (
                          <TableCell className="font-medium truncate max-w-[150px]" rowSpan={record.violations.length}>
                            {record.studentName}
                          </TableCell>
                        )}
                        <TableCell className="truncate max-w-[150px]">{violation.type}</TableCell>
                        <TableCell>
                          <Badge variant={violation.severity === 'Category 3 Offense' ? 'destructive' : 'secondary'}>
                            {violation.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {studentRecordsOffenseCounts[`${record.studentId}-${violation.violationId}`] > 1 ? (
                            <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                              <Repeat className="h-3 w-3 mr-1" />
                              {studentRecordsOffenseCounts[`${record.studentId}-${violation.violationId}`]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">1</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            violation.status === 'Resolved' ? 'default' :
                            violation.status === 'Dismissed' ? 'outline' :
                            'secondary'
                          }>
                            {violation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(violation.date).toLocaleDateString()}</TableCell>
                        <TableCell className="truncate max-w-[120px]">{violation.reportedBy}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              // Create a temporary incident object for viewing
                              const incident: Incident = {
                                id: violation.id,
                                studentId: record.studentId,
                                studentName: record.studentName,
                                type: violation.type as any,
                                violationId: violation.violationId,
                                severity: violation.severity,
                                date: violation.date,
                                description: violation.description || '',
                                actionTaken: '',
                                status: violation.status,
                                reportedBy: violation.reportedBy
                              };
                              setViewStudentRecord(incident);
                              setIsViewStudentRecordDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ))
                )}
              </TableBody>
            </Table>
            </div>
            {/* Pagination for Student Records */}
            {studentRecordsTotalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-t gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing {studentRecordsStartIndex + 1} to {Math.min(studentRecordsStartIndex + itemsPerPage, studentRecords?.length || 0)} of {studentRecords?.length || 0} records
                </p>
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStudentRecordsPage(studentRecordsPage - 1)}
                    disabled={studentRecordsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Previous</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStudentRecordsPage(studentRecordsPage + 1)}
                    disabled={studentRecordsPage === studentRecordsTotalPages}
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Student Records Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Records</p>
                  <p className="text-2xl font-bold">{totalStudentRecords}</p>
                </div>
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingStudentRecords}</p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
              </div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{resolvedStudentRecords}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Dismissed</p>
                  <p className="text-2xl font-bold text-gray-600">{dismissedStudentRecords}</p>
                </div>
                <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="violations">
          <ViolationManagement />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Users</p>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Suspended</p>
                  <p className="text-2xl font-bold text-red-600">{suspendedCount}</p>
                </div>
                <UserX className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Users by Role</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Users by Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-[500px] w-[95%] sm:w-full">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-muted-foreground">{viewUser.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{viewUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <p className="text-sm text-muted-foreground">{viewUser.role}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground">{viewUser.status || 'Pending'}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Created At</label>
                  <p className="text-sm text-muted-foreground">{new Date(viewUser.createdAt || '').toLocaleString()}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEditUser(viewUser);
                }}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[500px] w-[95%] sm:w-full">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Name</Label>
                <Input
                  id="editName"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editFormData.email}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(value: string) => setEditFormData(prev => ({ ...prev, role: value as UserRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                    <SelectItem value="Discipline Officer">Discipline Officer</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editStatus">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value: string) => setEditFormData(prev => ({ ...prev, status: value as UserStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} className="w-full sm:w-auto">
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Incident Dialog */}
      <Dialog open={isViewIncidentDialogOpen} onOpenChange={setIsViewIncidentDialogOpen}>
        <DialogContent className="max-w-[600px] w-[95%] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Incident Details</DialogTitle>
          </DialogHeader>
          {viewIncident && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Student Name</label>
                  <p className="text-sm text-muted-foreground">{viewIncident.studentName || viewIncident.studentId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Violation Type</label>
                  <p className="text-sm text-muted-foreground">{viewIncident.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm text-muted-foreground">
                    <Badge variant={viewIncident.severity === 'Category 3 Offense' ? 'destructive' : 'secondary'}>
                      {viewIncident.severity}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground">
                    <Badge variant={
                      viewIncident.status === 'Resolved' ? 'default' :
                      viewIncident.status === 'Pending' ? 'secondary' :
                      'outline'
                    }>
                      {viewIncident.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Date Reported</label>
                  <p className="text-sm text-muted-foreground">{new Date(viewIncident.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Reported By</label>
                  <p className="text-sm text-muted-foreground">{viewIncident.reportedBy}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground">{viewIncident.description || 'No description provided'}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewIncidentDialogOpen(false)} className="w-full sm:w-auto">
                  Close
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsViewIncidentDialogOpen(false);
                    handleEditIncidentClick(viewIncident);
                  }}
                  className="w-full sm:w-auto"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Student Record Dialog */}
      <Dialog open={isViewStudentRecordDialogOpen} onOpenChange={setIsViewStudentRecordDialogOpen}>
        <DialogContent className="max-w-[600px] w-[95%] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Record Details</DialogTitle>
          </DialogHeader>
          {viewStudentRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Student Name</label>
                  <p className="text-sm text-muted-foreground">{viewStudentRecord.studentName || viewStudentRecord.studentId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Violation Type</label>
                  <p className="text-sm text-muted-foreground">{viewStudentRecord.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm text-muted-foreground">
                    <Badge variant={viewStudentRecord.severity === 'Category 3 Offense' ? 'destructive' : 'secondary'}>
                      {viewStudentRecord.severity}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground">
                    <Badge variant={
                      viewStudentRecord.status === 'Resolved' ? 'default' :
                      viewStudentRecord.status === 'Dismissed' ? 'outline' :
                      'secondary'
                    }>
                      {viewStudentRecord.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Date Reported</label>
                  <p className="text-sm text-muted-foreground">{new Date(viewStudentRecord.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Reported By</label>
                  <p className="text-sm text-muted-foreground">{viewStudentRecord.reportedBy}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground">{viewStudentRecord.description || 'No description provided'}</p>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewStudentRecordDialogOpen(false)} className="w-full sm:w-auto">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <AddUsersDialog
        open={isAddUsersDialogOpen}
        onOpenChange={setIsAddUsersDialogOpen}
        onUserAdded={() => {
          fetchUsers();
        }}
      />

      {/* Edit Incident Dialog */}
      {editIncident && (
        <EditIncidentDialog
          open={isEditIncidentDialogOpen}
          onOpenChange={setIsEditIncidentDialogOpen}
          onEditIncident={handleSaveEditIncident}
          incident={editIncident}
        />
      )}
    </div>
  );
}
