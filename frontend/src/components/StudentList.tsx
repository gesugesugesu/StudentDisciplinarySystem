import { useState } from "react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Search, User } from "lucide-react";
import { Student, Incident } from "../types";

interface StudentListProps {
  students: Student[];
  incidents: Incident[];
  onSelectStudent: (studentId: string) => void;
}

export function StudentList({ students, incidents, onSelectStudent }: StudentListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const getIncidentCount = (studentId: string) => {
    return incidents.filter(i => i.studentId === studentId).length;
  };
  
  const getOpenIncidentCount = (studentId: string) => {
    return incidents.filter(i => i.studentId === studentId && i.status === "Open").length;
  };
  
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div>
        <h2>Students</h2>
        <p className="text-muted-foreground">View and manage student disciplinary records</p>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students by name, class, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => {
          const incidentCount = getIncidentCount(student.id);
          const openCount = getOpenIncidentCount(student.id);
          
          return (
            <Card 
              key={student.id} 
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onSelectStudent(student.id)}
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="truncate">{student.name}</h4>
                  <p className="text-muted-foreground">
                    Grade {student.grade} • {student.class}
                  </p>
                  <p className="text-muted-foreground truncate">{student.email}</p>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary">
                      {incidentCount} {incidentCount === 1 ? "incident" : "incidents"}
                    </Badge>
                    {openCount > 0 && (
                      <Badge variant="destructive">
                        {openCount} open
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      
      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No students found matching your search.</p>
        </div>
      )}
    </div>
  );
}
