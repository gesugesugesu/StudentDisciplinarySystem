import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";
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
import { Search, MoreVertical, Edit, Trash2, Bell, Download } from "lucide-react";
import { Incident, Student, Severity, Status } from "../types";
import { format } from "date-fns";
import { exportToCSV, exportToPDF, exportWeeklyReport, exportMonthlyReport } from "../utils/exportUtils";
import { toast } from "sonner";

interface AllIncidentsProps {
  incidents: Incident[];
  students: Student[];
  onSelectStudent: (studentId: string) => void;
  onEditIncident: (incident: Incident) => void;
  onDeleteIncident: (incidentId: string) => void;
  onNotifyParent: (incident: Incident) => void;
}

export function AllIncidents({ 
  incidents, 
  students, 
  onSelectStudent,
  onEditIncident,
  onDeleteIncident,
  onNotifyParent,
}: AllIncidentsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Severity | "All">("All");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState<string | null>(null);
  
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
  
  const filteredIncidents = incidents.filter((incident) => {
    const student = students.find(s => s.id === incident.studentId);
    const matchesSearch = 
      student?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === "All" || incident.severity === severityFilter;
    const matchesStatus = statusFilter === "All" || incident.status === statusFilter;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });
  
  const handleDeleteClick = (incidentId: string) => {
    setIncidentToDelete(incidentId);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    if (incidentToDelete) {
      onDeleteIncident(incidentToDelete);
      setDeleteDialogOpen(false);
      setIncidentToDelete(null);
    }
  };
  
  const handleExportCSV = () => {
    exportToCSV(filteredIncidents, students);
    toast.success("Report exported to CSV");
  };
  
  const handleExportPDF = () => {
    exportToPDF(filteredIncidents, students);
    toast.success("Report exported to PDF");
  };

  const handleExportWeeklyCSV = () => {
    exportWeeklyReport(incidents, students, 'csv');
    toast.success("Weekly report exported to CSV");
  };

  const handleExportWeeklyPDF = () => {
    exportWeeklyReport(incidents, students, 'pdf');
    toast.success("Weekly report exported to PDF");
  };

  const handleExportMonthlyCSV = () => {
    exportMonthlyReport(incidents, students, 'csv');
    toast.success("Monthly report exported to CSV");
  };

  const handleExportMonthlyPDF = () => {
    exportMonthlyReport(incidents, students, 'pdf');
    toast.success("Monthly report exported to PDF");
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2>All Incidents</h2>
          <p className="text-muted-foreground">Complete record of all disciplinary incidents</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportCSV}>
                Export All as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                Export All as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportWeeklyCSV}>
                Export Weekly as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportWeeklyPDF}>
                Export Weekly as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportMonthlyCSV}>
                Export Monthly as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportMonthlyPDF}>
                Export Monthly as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student, type, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={severityFilter} onValueChange={(value: string) => setSeverityFilter(value as Severity | "All")}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Severities</SelectItem>
            <SelectItem value="Minor">Minor</SelectItem>
            <SelectItem value="Moderate">Moderate</SelectItem>
            <SelectItem value="Severe">Severe</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as Status | "All")}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="Under Review">Under Review</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No incidents found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncidents
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((incident) => {
                    const student = students.find(s => s.id === incident.studentId);
                    return (
                      <TableRow key={incident.id}>
                        <TableCell>{format(new Date(incident.date), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => onSelectStudent(incident.studentId)}
                            className="hover:underline text-left"
                          >
                            {student?.name}
                          </button>
                        </TableCell>
                        <TableCell>{incident.type}</TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(incident.severity) as any}>
                            {incident.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{incident.description}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(incident.status) as any}>
                            {incident.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{incident.reportedBy}</TableCell>
                        <TableCell>
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
                                onClick={() => handleDeleteClick(incident.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <div className="text-muted-foreground">
        Showing {filteredIncidents.length} of {incidents.length} incidents
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the incident record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}