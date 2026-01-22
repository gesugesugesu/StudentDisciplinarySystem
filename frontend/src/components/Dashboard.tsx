import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu";
import { AlertCircle, Clock, CheckCircle, TrendingUp, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Incident, Student } from "../types";
import { exportToCSV, exportToPDF } from "../utils/exportUtils";
import { toast } from "sonner";

interface DashboardProps {
  incidents: Incident[];
  students: Student[];
}

export function Dashboard({ incidents, students }: DashboardProps) {
  const openIncidents = incidents.filter(i => i.status === "Open").length;
  const underReview = incidents.filter(i => i.status === "Under Review").length;
  const resolved = incidents.filter(i => i.status === "Resolved").length;
  
  const severeIncidents = incidents.filter(i => i.severity === "Severe").length;
  
  // Incidents by type
  const typeData = incidents.reduce((acc, incident) => {
    acc[incident.type] = (acc[incident.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const chartData = Object.entries(typeData).map(([name, value]) => ({
    name,
    count: value,
  }));
  
  // Incidents by severity
  const severityData = [
    { name: "Minor", value: incidents.filter(i => i.severity === "Minor").length, color: "#74c69d" },
    { name: "Moderate", value: incidents.filter(i => i.severity === "Moderate").length, color: "#40916c" },
    { name: "Severe", value: incidents.filter(i => i.severity === "Severe").length, color: "#1b4332" },
  ];
  
  const handleExportCSV = () => {
    exportToCSV(incidents, students);
    toast.success("Report exported to CSV");
  };

  const handleExportPDF = () => {
    exportToPDF(incidents, students);
    toast.success("Report exported to PDF");
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>Dashboard Overview</h2>
          <p className="text-muted-foreground">Student disciplinary record statistics</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Total Students</p>
              <p className="mt-2">{students.length}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Open Cases</p>
              <p className="mt-2">{openIncidents}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Under Review</p>
              <p className="mt-2">{underReview}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Resolved</p>
              <p className="mt-2">{resolved}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="mb-4">Incidents by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#1b4332" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        
        <Card className="p-6">
          <h3 className="mb-4">Incidents by Severity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      
      <Card className="p-6">
        <h3 className="mb-4">Recent Incidents</h3>
        <div className="space-y-3">
          {incidents.slice(0, 5).map((incident) => {
            const student = students.find(s => s.id === incident.studentId);
            return (
              <div key={incident.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p>{student?.name}</p>
                    <Badge variant={incident.severity === "Severe" ? "destructive" : incident.severity === "Moderate" ? "default" : "secondary"}>
                      {incident.severity}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">{incident.type} - {incident.description}</p>
                </div>
                <Badge variant={incident.status === "Open" ? "destructive" : incident.status === "Under Review" ? "default" : "secondary"}>
                  {incident.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}