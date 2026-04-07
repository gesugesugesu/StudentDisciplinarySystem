import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { AlertCircle, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Incident, Student } from "../types";

interface DashboardProps {
  incidents: Incident[];
  students: Student[];
}

export function Dashboard({ incidents, students }: DashboardProps) {
  const openIncidents = incidents.filter(i => i.status === "Pending").length;
  const underReview = incidents.filter(i => i.status === "Under Review").length;
  const resolved = incidents.filter(i => i.status === "Resolved").length;
  
  const severeIncidents = incidents.filter(i => i.severity === "Category 3 Offense").length;
  
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
    { name: "Category 1", value: incidents.filter(i => i.severity === "Category 1 Offense").length, color: "#74c69d" },
    { name: "Category 2", value: incidents.filter(i => i.severity === "Category 2 Offense").length, color: "#40916c" },
    { name: "Category 3", value: incidents.filter(i => i.severity === "Category 3 Offense").length, color: "#1b4332" },
  ];
  

  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>Dashboard Overview</h2>
          <p className="text-muted-foreground">Student disciplinary record statistics</p>
        </div>
        

      </div>
      
      <div className="flex gap-1">
        <Card className="flex-1 p-2 flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Students</p>
            <p className="text-sm font-semibold">{students.length}</p>
          </div>
        </Card>
        
        <Card className="flex-1 p-2 flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
            <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-sm font-semibold">{openIncidents}</p>
          </div>
        </Card>
        
        <Card className="flex-1 p-2 flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Review</p>
            <p className="text-sm font-semibold">{underReview}</p>
          </div>
        </Card>
        
        <Card className="flex-1 p-2 flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Severe</p>
            <p className="text-sm font-semibold">{severeIncidents}</p>
          </div>
        </Card>
        
        <Card className="flex-1 p-2 flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Resolved</p>
            <p className="text-sm font-semibold">{resolved}</p>
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
                    <Badge variant={incident.severity === "Category 3 Offense" ? "destructive" : incident.severity === "Category 2 Offense" ? "default" : "secondary"}>
                      {incident.severity}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">{incident.type} - {incident.description}</p>
                </div>
                <Badge variant={incident.status === "Pending" ? "destructive" : incident.status === "Under Review" ? "default" : "secondary"}>
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