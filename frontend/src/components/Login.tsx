import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import logo from "figma:asset/6ca5c626f02129b600665afa033d23b2d70032b4.png";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";

interface LoginProps {
  onLogin: (user: any) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: "",
    studentId: "",
    contactNumber: "",
    course: "",
    yearLevel: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const validateStudentId = (studentId: string) => {
    const studentIdRegex = /^\d{5}$/;
    return studentIdRegex.test(studentId);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        // Registration
        const { email, password, confirmPassword, fullName, role, studentId, contactNumber, course, yearLevel } = formData;

        // Basic required fields validation
        if (!email || !password || !confirmPassword || !fullName || !role) {
          setError("Please fill in all required fields");
          setLoading(false);
          return;
        }

        // Email validation
        if (!validateEmail(email)) {
          setError("Please enter a valid email address");
          setLoading(false);
          return;
        }

        // Password validation
        if (!validatePassword(password)) {
          setError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number");
          setLoading(false);
          return;
        }

        // Confirm password validation
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        // Student-specific validation
        if (role === "Student") {
          if (!studentId || !contactNumber || !course || !yearLevel) {
            setError("Please fill in all student-specific fields");
            setLoading(false);
            return;
          }

          if (!validateStudentId(studentId)) {
            setError("Student ID must be exactly 5 digits");
            setLoading(false);
            return;
          }
        }

        const response = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            password,
            email,
            fullName,
            role,
            ...(role === "Student" && {
              studentId,
              contactNumber,
              course,
              yearLevel
            })
          }),
        });

        const data = await response.json();

        if (response.ok) {
          alert('Registration successful! You can now login.');
          setIsRegistering(false);
          setFormData({
            email: "",
            password: "",
            confirmPassword: "",
            fullName: "",
            role: "",
            studentId: "",
            contactNumber: "",
            course: "",
            yearLevel: ""
          });
        } else {
          setError(data.error || 'Registration failed');
        }
      } else {
        // Login
        const { email, password } = formData;
        if (!email || !password) {
          setError("Please fill in email and password");
          setLoading(false);
          return;
        }

        if (!validateEmail(email)) {
          setError("Please enter a valid email address");
          setLoading(false);
          return;
        }

        const response = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          onLogin(data.user);
        } else {
          setError(data.error || 'Login failed');
        }
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">

      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center">
          <ImageWithFallback
            src={logo}
            alt="ACTS Computer College"
            className="h-32 w-32 mb-4"
          />
          <h1 className="text-center mb-2">D-Manage: Automated Student Disciplinary Management</h1>
          <p className="text-muted-foreground text-center">ACTS Computer College</p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <h2>{isRegistering ? "Registration" : "Login"}</h2>
          </div>

          <div className="space-y-4">
            {isRegistering && (
              <>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>


                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value: string) => setFormData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Faculty Staff">Faculty Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.role === "Student" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="studentId">Student ID Number</Label>
                      <Input
                        id="studentId"
                        type="text"
                        placeholder="Enter student ID"
                        value={formData.studentId}
                        onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be exactly 5 digits (e.g., 12345)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input
                        id="contactNumber"
                        type="tel"
                        placeholder="Enter contact number"
                        value={formData.contactNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="course">Course</Label>
                      <Input
                        id="course"
                        type="text"
                        placeholder="Enter course"
                        value={formData.course}
                        onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="yearLevel">Year Level</Label>
                      <Select value={formData.yearLevel} onValueChange={(value: string) => setFormData(prev => ({ ...prev, yearLevel: value }))}>
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
                  </>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Username or Email</Label>
              <Input
                id="email"
                type="text"
                placeholder="Enter email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="flex">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
                  className="flex-1"
                />
                <button
                  type="button"
                  className="ml-2 p-2 flex items-center justify-center"
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
              {isRegistering && (
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters with uppercase, lowercase, and number
                </p>
              )}
            </div>

            {isRegistering && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="flex">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    className="ml-2 p-2 flex items-center justify-center"
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
            )}

          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full" disabled={loading}>
            {loading ? "Processing..." : (isRegistering ? "Register" : "Login")}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
                setFormData({
                  email: "",
                  password: "",
                  confirmPassword: "",
                  fullName: "",
                  role: "",
                  studentId: "",
                  contactNumber: "",
                  course: "",
                  yearLevel: ""
                });
              }}
              className="text-sm"
            >
              {isRegistering
                ? "Already have an account? Login"
                : "Don't have an account? Register"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
