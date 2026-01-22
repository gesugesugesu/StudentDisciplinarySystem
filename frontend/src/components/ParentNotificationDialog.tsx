import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { CommunicationLog, Student, Incident } from "../types";
import { format } from "date-fns";
import { Phone, Mail, User, FileText, Calendar } from "lucide-react";

interface ParentNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCommunication: (log: Omit<CommunicationLog, "id">) => void;
  student: Student;
  incident: Incident;
}

const communicationMethods: CommunicationLog["method"][] = ["Email", "Phone", "In-Person", "Letter"];

export function ParentNotificationDialog({ 
  open, 
  onOpenChange, 
  onAddCommunication,
  student,
  incident,
}: ParentNotificationDialogProps) {
  const [method, setMethod] = useState<CommunicationLog["method"]>("Email");
  const [notes, setNotes] = useState("");
  const [contactedBy, setContactedBy] = useState("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const log: Omit<CommunicationLog, "id"> = {
      date: new Date().toISOString().split("T")[0],
      method,
      contactedBy,
      notes,
      parentNotified: true,
    };
    
    onAddCommunication(log);
    
    // Reset form
    setMethod("Email");
    setNotes("");
    setContactedBy("");
    onOpenChange(false);
  };
  
  const getMethodIcon = (method: CommunicationLog["method"]) => {
    switch (method) {
      case "Email": return <Mail className="h-4 w-4" />;
      case "Phone": return <Phone className="h-4 w-4" />;
      case "In-Person": return <User className="h-4 w-4" />;
      case "Letter": return <FileText className="h-4 w-4" />;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Parent Notification</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Student and Parent Information */}
          <Card className="p-4 bg-muted/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="mb-2">Student Information</h4>
                <div className="space-y-1 text-muted-foreground">
                  <p><span className="text-foreground">Name:</span> {student.name}</p>
                  <p><span className="text-foreground">Grade:</span> {student.grade} - {student.class}</p>
                  <p><span className="text-foreground">Email:</span> {student.email}</p>
                </div>
              </div>
              
              <div>
                <h4 className="mb-2">Parent/Guardian</h4>
                <div className="space-y-1 text-muted-foreground">
                  <p><span className="text-foreground">Name:</span> {student.parentName || "Not available"}</p>
                  <p><span className="text-foreground">Email:</span> {student.parentEmail || "Not available"}</p>
                  <p><span className="text-foreground">Phone:</span> {student.parentPhone || "Not available"}</p>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Incident Details */}
          <Card className="p-4">
            <h4 className="mb-2">Incident Details</h4>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Badge variant={incident.severity === "Severe" ? "destructive" : "default"}>
                  {incident.severity}
                </Badge>
                <Badge variant="outline">{incident.type}</Badge>
              </div>
              <p className="text-muted-foreground">{incident.description}</p>
              <p className="text-muted-foreground"><span className="text-foreground">Action Taken:</span> {incident.actionTaken}</p>
              <p className="text-muted-foreground"><span className="text-foreground">Date:</span> {format(new Date(incident.date), "MMMM d, yyyy")}</p>
            </div>
          </Card>
          
          {/* Communication History */}
          {incident.communicationLogs && incident.communicationLogs.length > 0 && (
            <div>
              <h4 className="mb-2">Communication History</h4>
              <div className="space-y-2">
                {incident.communicationLogs.map((log) => (
                  <Card key={log.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getMethodIcon(log.method)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>{log.method}</span>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(log.date), "MMM d, yyyy")}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{log.notes}</p>
                        <p className="text-muted-foreground">— {log.contactedBy}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* New Communication Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
            <h4>Add Communication Log</h4>
            
            <div className="space-y-2">
              <Label htmlFor="method">Communication Method</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as CommunicationLog["method"])}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {communicationMethods.map((m) => (
                    <SelectItem key={m} value={m}>
                      <div className="flex items-center gap-2">
                        {getMethodIcon(m)}
                        {m}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contacted-by">Contacted By</Label>
              <input
                id="contacted-by"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2"
                value={contactedBy}
                onChange={(e) => setContactedBy(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details of communication with parent/guardian..."
                required
                rows={4}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add Communication Log
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
