import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Badge } from "./ui/badge";
import { Violation, Severity } from "../types";
import { Plus, Pencil, Trash2, RefreshCw, AlertTriangle, BookOpen, FileText, XCircle } from "lucide-react";
import { toast } from "sonner";

// Handbook-based category mapping
const category1Offenses = [
  "No ID","Distracting Behavior","Unauthorized Posting","Improper Uniform","Pornographic Materials",
  "Accessing Pornographic Content","Grooming Violation","Inappropriate Attire","Skipping Drills","ID Tampering"
];

const category2Offenses = [
  "Bullying", "Fighting","Alcohol Possession/Use","Gambling","Cheating","Plagiarism","Document Falsification",
  "ID/Permit Lending", "Provoking fights","Disrespect to authority","Dishonesty to authority","Defiance to authority",
  "Vandalism", "Unauthorized activities", "Computer tampering", "Unauthorized recruitment","Public indecency",
  "Smoking on campus","Profanity or indecent conduct","Unauthorized school representation"
];

const category3Offenses = [
  "Exam Misrepresentation", "Assault on Faculty","Theft/Attempted Theft","Assault on Student",,
  "Hazing Participation", "Presence at hazing","Hazing leadership liability","Off-campus misconduct",
  "Moral turpitude", "Illegal organization membership", "Illegal Drugs possession/use", "Weapon possession/use"
];

function getAutoCategory(violationName: string): Severity {
  const name = violationName.trim();
  if (category1Offenses.some(o => o.toLowerCase() === name.toLowerCase())) {
    return "Category 1 Offense";
  }
  if (category2Offenses.some(o => o.toLowerCase() === name.toLowerCase())) {
    return "Category 2 Offense";
  }
  if (category3Offenses.some(o => o.toLowerCase() === name.toLowerCase())) {
    return "Category 3 Offense";
  }
  return "Category 1 Offense"; // Default to Category 1
}

export function ViolationManagement() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    severity: "Category 1 Offense" as Severity,
    description: "",
  });

  const API_BASE = 'http://localhost:5000/api';

  useEffect(() => {
    fetchIncidentTypes();
  }, []);

  const fetchIncidentTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/incidents/violations/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setViolations(data);
      }
    } catch (error) {
      toast.error('Failed to fetch incident types');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (violation?: Violation) => {
    if (violation) {
      setIsEditMode(true);
      setSelectedViolation(violation);
      setFormData({
        name: violation.name,
        severity: violation.severity,
        description: violation.description || "",
      });
    } else {
      setIsEditMode(false);
      setSelectedViolation(null);
      setFormData({
        name: "",
        severity: "Category 1 Offense",
        description: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    // Auto-categorize based on handbook when in add mode
    if (!isEditMode && name) {
      const autoCategory = getAutoCategory(name);
      setFormData({ ...formData, name, severity: autoCategory });
    } else {
      setFormData({ ...formData, name });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedViolation(null);
    setIsEditMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = isEditMode && selectedViolation?.id
        ? `${API_BASE}/violations/${selectedViolation.id}`
        : `${API_BASE}/violations`;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(isEditMode ? 'Incident type updated successfully' : 'Incident type created successfully');
        handleCloseDialog();
        fetchIncidentTypes();
      } else {
        toast.error('Failed to save incident type');
      }
    } catch (error) {
      toast.error('Error saving incident type');
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/violations/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Incident type deleted successfully');
        fetchIncidentTypes();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete incident type');
      }
    } catch (error) {
      toast.error('Error deleting incident type');
    } finally {
      setDeleteId(null);
    }
  };



  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Violation Management</h2>
            <p className="text-muted-foreground">Manage incident types based on school handbook</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchIncidentTypes}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Incident Type
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex gap-3">
        <Card className="p-3 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Types</p>
              <p className="text-xl font-bold">{violations.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cat 1</p>
              <p className="text-xl font-bold">{violations.filter(v => v.severity === 'Category 1 Offense').length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cat 2</p>
              <p className="text-xl font-bold">{violations.filter(v => v.severity === 'Category 2 Offense').length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cat 3</p>
              <p className="text-xl font-bold">{violations.filter(v => v.severity === 'Category 3 Offense').length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Violations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Incident Types</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map((violation) => (
                <TableRow key={violation.id}>
                  <TableCell className="font-medium">{violation.name}</TableCell>
                  <TableCell>
                    <Badge variant={violation.severity === 'Category 1 Offense' ? 'secondary' : 'destructive'}>
                      {violation.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{violation.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(violation)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(violation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {violations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No incident types found. Click "Add Incident Type" to create one.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Incident Type' : 'Add New Incident Type'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Tardiness"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="severity">Category</Label>
              <Select
                value={formData.severity}
                onValueChange={(value: string) => setFormData({ ...formData, severity: value as Severity })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Category 1 Offense">Category 1 Offense</SelectItem>
                  <SelectItem value="Category 2 Offense">Category 2 Offense</SelectItem>
                  <SelectItem value="Category 3 Offense">Category 3 Offense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open: boolean) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Delete Incident Type
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this incident type? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

