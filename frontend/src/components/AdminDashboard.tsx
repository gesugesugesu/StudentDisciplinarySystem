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
import { User, UserRole, UserStatus, Incident } from "../types";
import { toast } from "sonner";
import { AddUsersDialog } from "./AddUsersDialog";
import { ViolationManagement } from "./ViolationManagement";
import { CheckCircle, XCircle, UserCheck, UserX, Trash2, Users, Clock, RefreshCw, Eye, Pencil, ChevronLeft, ChevronRight, UserPlus, FileText, AlertTriangle, CheckSquare, XSquare } from "lucide-react";

export function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [studentRecords, setStudentRecords] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [viewIncident, setViewIncident] = useState<Incident | null>(null);
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
  const itemsPerPage = 10;

  const API_BASE = 'http://localhost:5000/api';

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
      }
    } catch (error) {
      toast.error('Failed to fetch student records');
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

  // Incident Statistics
  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter(i => i.status === 'Open').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'Resolved').length;
  const underReviewIncidents = incidents.filter(i => i.status === 'Under Review').length;

  // Student Records Statistics
  const totalStudentRecords = studentRecords.length;
  const pendingStudentRecords = studentRecords.filter(r => r.status === 'Pending').length;
  const resolvedStudentRecords = studentRecords.filter(r => r.status === 'Resolved').length;
  const dismissedStudentRecords = studentRecords.filter(r => r.status === 'Dismissed').length;

  const pendingIncidents = incidents.filter(i => i.status === 'Open');
  const recentIncidents = incidents.slice(0, 5);

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
          <p className="text-muted-foreground">Manage users and view statistics</p>
        </div>
        <Button onClick={refreshData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">All Users ({totalUsers})</TabsTrigger>
          <TabsTrigger value="incidents">Incident Reports ({totalIncidents})</TabsTrigger>
          <TabsTrigger value="records">Student Records ({totalStudentRecords})</TabsTrigger>
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
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewUser(user)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            style={{
                              backgroundColor: '#16a34a',
                              color: 'white',
                            }}
                            onClick={() => handleApproveUser(user.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectUser(user.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
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
              <Button size="sm" onClick={() => setIsAddUsersDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Add User
              </Button>
            </div>
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
            
            {/* Pagination and Info */}
            <div className="flex items-center justify-between p-4 border-t bg-muted/30">
              <span className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, allUsersSorted.length)} of {allUsersSorted.length} users
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 mx-2">
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
                  >
                    Next
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
                    <TableHead>Severity</TableHead>
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
                        <Badge variant={incident.severity === 'Major' ? 'destructive' : 'secondary'}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(incident.date).toLocaleDateString()}</TableCell>
                      <TableCell>{incident.reportedBy}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewIncident(incident)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            style={{
                              backgroundColor: '#16a34a',
                              color: 'white',
                            }}
                            onClick={() => handleApproveIncident(incident.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* All Incidents Section */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <h3 className="text-lg font-semibold">All Incidents ({totalIncidents})</h3>
            </div>
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-1/6">Student</TableHead>
                  <TableHead className="w-1/6">Violation Type</TableHead>
                  <TableHead className="w-1/8">Severity</TableHead>
                  <TableHead className="w-1/8">Status</TableHead>
                  <TableHead className="w-1/8">Date</TableHead>
                  <TableHead className="w-1/6">Reported By</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-medium truncate max-w-[150px]">
                      {incident.studentName || incident.studentId}
                    </TableCell>
                    <TableCell className="truncate max-w-[150px]">{incident.type}</TableCell>
                    <TableCell>
                      <Badge variant={incident.severity === 'Major' ? 'destructive' : 'secondary'}>
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        incident.status === 'Resolved' ? 'default' :
                        incident.status === 'Open' ? 'secondary' :
                        'outline'
                      }>
                        {incident.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(incident.date).toLocaleDateString()}</TableCell>
                    <TableCell className="truncate max-w-[120px]">{incident.reportedBy}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewIncident(incident)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Incident Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Open</p>
                  <p className="text-2xl font-bold text-yellow-600">{openIncidents}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{resolvedIncidents}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Under Review</p>
                  <p className="text-2xl font-bold text-blue-600">{underReviewIncidents}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          {/* All Student Records Section */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <h3 className="text-lg font-semibold">All Student Records ({totalStudentRecords})</h3>
            </div>
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-1/6">Student</TableHead>
                  <TableHead className="w-1/6">Violation Type</TableHead>
                  <TableHead className="w-1/8">Severity</TableHead>
                  <TableHead className="w-1/8">Status</TableHead>
                  <TableHead className="w-1/8">Date</TableHead>
                  <TableHead className="w-1/6">Reported By</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium truncate max-w-[150px]">
                      {record.studentName || record.studentId}
                    </TableCell>
                    <TableCell className="truncate max-w-[150px]">{record.type}</TableCell>
                    <TableCell>
                      <Badge variant={record.severity === 'Major' ? 'destructive' : 'secondary'}>
                        {record.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        record.status === 'Resolved' ? 'default' :
                        record.status === 'Dismissed' ? 'outline' :
                        'secondary'
                      }>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                    <TableCell className="truncate max-w-[120px]">{record.reportedBy}</TableCell>
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
          </Card>

          {/* Student Records Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Total Records</p>
                  <p className="text-2xl font-bold">{totalStudentRecords}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingStudentRecords}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{resolvedStudentRecords}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Dismissed</p>
                  <p className="text-2xl font-bold text-gray-600">{dismissedStudentRecords}</p>
                </div>
                <XCircle className="h-8 w-8 text-gray-600" />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="violations">
          <ViolationManagement />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Suspended</p>
                  <p className="text-2xl font-bold text-red-600">{suspendedCount}</p>
                </div>
                <UserX className="h-8 w-8 text-red-600" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
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

            <Card className="p-6">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                <div className="col-span-2">
                  <label className="text-sm font-medium">Created At</label>
                  <p className="text-sm text-muted-foreground">{new Date(viewUser.createdAt || '').toLocaleString()}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
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
        <DialogContent>
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Incident Dialog */}
      <Dialog open={isViewIncidentDialogOpen} onOpenChange={setIsViewIncidentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Incident Details</DialogTitle>
          </DialogHeader>
          {viewIncident && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Student Name</label>
                  <p className="text-sm text-muted-foreground">{viewIncident.studentName || viewIncident.studentId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Violation Type</label>
                  <p className="text-sm text-muted-foreground">{viewIncident.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <p className="text-sm text-muted-foreground">
                    <Badge variant={viewIncident.severity === 'Major' ? 'destructive' : 'secondary'}>
                      {viewIncident.severity}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground">
                    <Badge variant={
                      viewIncident.status === 'Resolved' ? 'default' :
                      viewIncident.status === 'Open' ? 'secondary' :
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
                <div className="col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground">{viewIncident.description || 'No description provided'}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewIncidentDialogOpen(false)}>
                  Close
                </Button>
                {viewIncident.status === 'Open' && (
                  <Button 
                    onClick={() => {
                      handleApproveIncident(viewIncident.id);
                      setIsViewIncidentDialogOpen(false);
                    }}
                    style={{ backgroundColor: '#16a34a', color: 'white' }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark as Resolved
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Student Record Dialog */}
      <Dialog open={isViewStudentRecordDialogOpen} onOpenChange={setIsViewStudentRecordDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Record Details</DialogTitle>
          </DialogHeader>
          {viewStudentRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Student Name</label>
                  <p className="text-sm text-muted-foreground">{viewStudentRecord.studentName || viewStudentRecord.studentId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Violation Type</label>
                  <p className="text-sm text-muted-foreground">{viewStudentRecord.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <p className="text-sm text-muted-foreground">
                    <Badge variant={viewStudentRecord.severity === 'Major' ? 'destructive' : 'secondary'}>
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
                <div className="col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground">{viewStudentRecord.description || 'No description provided'}</p>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewStudentRecordDialogOpen(false)}>
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
    </div>
  );
}
