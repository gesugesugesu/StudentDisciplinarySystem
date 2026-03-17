import { useState, useEffect } from "react";
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
import { Search, MoreVertical, Edit, Trash2, Bell, Download, ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { Incident, Student, Severity, Status } from "../types";
import { format } from "date-fns";
import { exportToCSV, exportToPDF, exportWeeklyReport, exportMonthlyReport } from "../utils/exportUtils";
import { toast } from "sonner";

// Local interface for grouped incidents
interface GroupedIncident {
  studentId: string;
  studentName: string;
  incidents: Incident[];
}

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Repeat offender tracking
  const [studentOffenseCounts, setStudentOffenseCounts] = useState<Record<string, number>>({});
  const [groupedIncidents, setGroupedIncidents] = useState<GroupedIncident[]>([]);
  
  // Compute offense counts and group incidents by student when incidents change
  useEffect(() => {
    // Compute offense counts
    const counts: Record<string, number> = {};
    incidents.forEach(incident => {
      const key = `${incident.studentId}-${incident.violationId}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    setStudentOffenseCounts(counts);
    
    // Group incidents by student
    const grouped: Record<string, { studentId: string; studentName: string; incidents: Incident[] }> = {};
    incidents.forEach(incident => {
      const student = students.find(s => s.id === incident.studentId);
      const studentName = student?.name || 'Unknown';
      const key = incident.studentId;
      
      if (!grouped[key]) {
        grouped[key] = {
          studentId: incident.studentId,
          studentName: studentName,
          incidents: []
        };
      }
      grouped[key].incidents.push(incident);
    });
    
    // Convert to array and sort by student name
    const groupedArray = Object.values(grouped).sort((a, b) => 
      a.studentName.localeCompare(b.studentName)
    );
    
    // Sort incidents within each student by date (newest first)
    groupedArray.forEach(group => {
      group.incidents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    
    setGroupedIncidents(groupedArray);
  }, [incidents, students]);
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Category 3 Offense": return "destructive";
      case "Category 2 Offense": return "default";
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
  
  // Filter grouped incidents based on search term, severity and status
  const filteredGroupedIncidents: GroupedIncident[] = groupedIncidents
    .map(group => {
      const filteredIncidents = group.incidents.filter((incident: Incident) => {
        const matchesSeverity = severityFilter === "All" || incident.severity === severityFilter;
        const matchesStatus = statusFilter === "All" || incident.status === statusFilter;
        return matchesSeverity && matchesStatus;
      });
      return { ...group, incidents: filteredIncidents };
    })
    .filter(group => {
      // Filter by search term
      const matchesSearch = !searchTerm || 
        group.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.incidents.some((i: Incident) => 
          i.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchesSearch && group.incidents.length > 0;
    });
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, severityFilter, statusFilter]);
  
  // Pagination - count total incidents across all filtered groups
  const totalFilteredIncidents = filteredGroupedIncidents.reduce((sum, group) => sum + group.incidents.length, 0);
  const totalPages = Math.ceil(totalFilteredIncidents / itemsPerPage);
  
  // Paginate - get incidents from filtered groups
  const paginatedGroups = (() => {
    const result: typeof groupedIncidents = [];
    let count = 0;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    for (const group of filteredGroupedIncidents) {
      if (count >= endIndex) break;
      
      const groupStartIndex = count;
      const groupEndIndex = count + group.incidents.length;
      
      if (groupEndIndex > startIndex) {
        const sliceStart = Math.max(0, startIndex - groupStartIndex);
        const sliceEnd = Math.min(group.incidents.length, endIndex - groupStartIndex);
        result.push({
          ...group,
          incidents: group.incidents.slice(sliceStart, sliceEnd)
        });
      }
      count = groupEndIndex;
    }
    return result;
  })();
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
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
  
  // Get all filtered incidents as flat array for export
  const allFilteredIncidents = filteredGroupedIncidents.flatMap(group => group.incidents);
  
  const handleExportCSV = () => {
    exportToCSV(allFilteredIncidents, students);
    toast.success("Report exported to CSV");
  };
  
  const handleExportPDF = () => {
    exportToPDF(allFilteredIncidents, students);
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
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            <SelectItem value="Category 1 Offense">Category 1 Offense</SelectItem>
            <SelectItem value="Category 2 Offense">Category 2 Offense</SelectItem>
            <SelectItem value="Category 3 Offense">Category 3 Offense</SelectItem>
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
                <TableHead>Category</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No incidents found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGroups
                  .map((group: GroupedIncident) => 
                    group.incidents.map((incident: Incident, index: number) => (
                      <TableRow key={incident.id}>
                        {index === 0 && (
                          <TableCell rowSpan={group.incidents.length}>
                            <button
                              onClick={() => onSelectStudent(group.studentId)}
                              className="hover:underline text-left"
                            >
                              {group.studentName}
                            </button>
                          </TableCell>
                        )}
                        <TableCell>{format(new Date(incident.date), "MMM d, yyyy")}</TableCell>
                        <TableCell>{incident.type}</TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(incident.severity) as any}>
                            {incident.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {studentOffenseCounts[`${incident.studentId}-${incident.violationId}`] > 1 ? (
                            <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                              <Repeat className="h-3 w-3 mr-1" />
                              {studentOffenseCounts[`${incident.studentId}-${incident.violationId}`]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">1</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{incident.description}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(incident.status) as any}>
                            {incident.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{incident.reportedBy}</TableCell>
                      </TableRow>
                    ))
                  )
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalFilteredIncidents)} of {totalFilteredIncidents} incidents
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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