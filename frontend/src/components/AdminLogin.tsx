import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import logo from "figma:asset/6ca5c626f02129b600665afa033d23b2d70032b4.png";
import { ShieldCheck, User } from "lucide-react";

interface AdminLoginProps {
  onLogin: () => void;
  onStudentViewClick: () => void;
}

export function AdminLogin({ onLogin, onStudentViewClick }: AdminLoginProps) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    department: "",
    role: ""
  });
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        // Registration
        const { username, email, password, fullName, department, role } = formData;
        if (!username || !email || !password || !fullName || !department || !role) {
          setError("Please fill in all fields");
          return;
        }

        const response = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            password,
            email,
            fullName,
            department,
            role
          }),
        });

        const data = await response.json();

        if (response.ok) {
          alert('Registration successful! You can now login.');
          setIsRegistering(false);
          setFormData({
            username: "",
            email: "",
            password: "",
            fullName: "",
            department: "",
            role: ""
          });
        } else {
          setError(data.error || 'Registration failed');
        }
      } else {
        // Login
        const { email, password } = formData;
        if (!email || !password) {
          setError("Please fill in all fields");
          return;
        }

        const response = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: email, // Using email as username for login
            password,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          onLogin();
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4 relative">
      {/* Student View Button */}
      <Button
        onClick={onStudentViewClick}
        variant="outline"
        className="absolute top-4 right-4 bg-white"
      >
        <User className="h-4 w-4 mr-2" />
        Student View
      </Button>

      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
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
            <h2>{isRegistering ? "Administrator Registration" : "Administrator Login"}</h2>
          </div>

          <div className="space-y-4">
            {isRegistering && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>

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
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    type="text"
                    placeholder="Enter department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value: string) => setFormData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Discipline Officer">Discipline Officer</SelectItem>
                      <SelectItem value="Guidance Counselor">Guidance Counselor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Username or Email</Label>
              <Input
                id="email"
                type="text"
                placeholder="Enter username or email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

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
                  username: "",
                  email: "",
                  password: "",
                  fullName: "",
                  department: "",
                  role: ""
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
