import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import logo from "figma:asset/6ca5c626f02129b600665afa033d23b2d70032b4.png";
import { ShieldCheck, User } from "lucide-react";

interface AdminLoginProps {
  onLogin: () => void;
  onStudentViewClick: () => void;
}

export function AdminLogin({ onLogin, onStudentViewClick }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = () => {
    setError("");
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    
    // Simple authentication - in production, use proper authentication
    if (isRegistering) {
      // For demo, just accept any registration
      onLogin();
    } else {
      // For demo login: admin@acts.edu / admin123
      if (email === "admin@acts.edu" && password === "admin123") {
        onLogin();
      } else {
        setError("Invalid credentials. Demo: admin@acts.edu / admin123");
      }
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
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="youremail@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            {!isRegistering && (
              <p className="text-sm text-muted-foreground">
              </p>
            )}
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full">
            {isRegistering ? "Register" : "Login"}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
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
