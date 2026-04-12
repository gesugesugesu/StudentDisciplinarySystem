import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Eye, EyeOff, UserPlus, Plus } from "lucide-react";
import { UserRole } from "../types";
import { toast } from "sonner";
import API_BASE from '../config/api';

interface Course {
  course_id: number;
  course_name: string;
  created_at: string;
}

interface AddUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded?: () => void;
}

export function AddUsersDialog({ open, onOpenChange, onUserAdded }: AddUsersDialogProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: "" as UserRole | "",
    contactNumber: "",
    course: "",
    yearLevel: "",
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewCourseInput, setShowNewCourseInput] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");

  // Fetch courses from database
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch(`${API_BASE}/courses`);
        if (response.ok) {
          const data = await response.json();
          setCourses(data);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };
    fetchCourses();
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const validateContactNumber = (contactNumber: string) => {
    // PH format: 11 digits starting with 09 (e.g., 09123456789)
    const phPhoneRegex = /^09\d{9}$/;
    return phPhoneRegex.test(contactNumber);
  };

  const handleContactNumberChange = (value: string) => {
    // Only allow digits, max 11 characters
    const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
    setFormData(prev => ({ ...prev, contactNumber: digitsOnly }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { email, password, confirmPassword, fullName, role, contactNumber, course, yearLevel } = formData;

    if (!email || !password || !confirmPassword || !fullName || !role) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (role === 'Student' && (!contactNumber || !yearLevel)) {
      setError("Contact number and year level are required for students");
      setLoading(false);
      return;
    }

    // Contact number validation for students
    if (role === 'Student' && contactNumber && !validateContactNumber(contactNumber)) {
      setError("Contact number must be 11 digits starting with 09 (e.g., 09123456789)");
      setLoading(false);
      return;
    }

    // Course is required for all students
    if (role === 'Student' && !course) {
      setError("Course is required for students");
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          password,
          email,
          fullName,
          role,
          ...(role === 'Student' && {
            contactNumber,
            educationLevel: 'College',
            yearLevel,
            course,
          }),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("User added successfully! The account is pending approval.");
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          fullName: "",
          role: "",
          contactNumber: "",
          course: "",
          yearLevel: "",
        });
        toast.success("User added successfully");
        if (onUserAdded) {
          onUserAdded();
        }
        setTimeout(() => {
          onOpenChange(false);
          setSuccess("");
        }, 1500);
      } else {
        setError(data.error || 'Failed to add user');
        toast.error(data.error || 'Failed to add user');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value as any }));
  };

  const handleAddNewCourse = async () => {
    if (!newCourseName.trim()) {
      setError("Please enter a course name");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_name: newCourseName.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, course: data.course.course_name }));
        setCourses(prev => [...prev, data.course]);
        setNewCourseName("");
        setShowNewCourseInput(false);
        setError("");
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add course');
      }
    } catch (err) {
      setError('Error adding course. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Add New User</DialogTitle>
          </div>
          <DialogDescription>
            Create a new user account. The account will require approval before access is granted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Enter full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value: string) => handleInputChange('role', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Discipline Officer">Discipline Officer</SelectItem>
                  <SelectItem value="Student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role === 'Student' && (
              <div className="space-y-2">
                <Label htmlFor="yearLevel">Year Level</Label>
                <Select value={formData.yearLevel} onValueChange={(value: string) => handleInputChange('yearLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {formData.role === 'Student' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => handleContactNumberChange(e.target.value)}
                  placeholder="09XXXXXXXXX (11 digits)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                {!showNewCourseInput ? (
                  <Select
                    value={formData.course}
                    onValueChange={(value: string) => {
                      if (value === 'add_new') {
                        setShowNewCourseInput(true);
                      } else {
                        handleInputChange('course', value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.course_id} value={course.course_name}>
                          {course.course_name}
                        </SelectItem>
                      ))}
                      <SelectItem value="add_new" className="text-primary">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          <span>Add New Course</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="newCourse"
                      type="text"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      placeholder="Enter new course name"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewCourseInput(false);
                        setNewCourseName("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddNewCourse}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  onMouseDown={() => setShowConfirmPassword(true)}
                  onMouseUp={() => setShowConfirmPassword(false)}
                  onMouseLeave={() => setShowConfirmPassword(false)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm">
              {success}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Adding User..." : "Add User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
