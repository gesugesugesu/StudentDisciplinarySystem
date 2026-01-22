import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import logo from "figma:asset/6ca5c626f02129b600665afa033d23b2d70032b4.png";
import { ShieldCheck, UserCheck } from "lucide-react";

interface MainEntryProps {
  onAdminClick: () => void;
  onStudentClick: () => void;
}

export function MainEntry({ onAdminClick, onStudentClick }: MainEntryProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
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
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-4">Choose Your Portal</h2>
          </div>

          <div className="space-y-4">
            <Button onClick={onAdminClick} className="w-full" size="lg">
              <ShieldCheck className="h-5 w-5 mr-2" />
              Faculty Portal
            </Button>

            <Button onClick={onStudentClick} variant="outline" className="w-full" size="lg">
              <UserCheck className="h-5 w-5 mr-2" />
              Student Portal
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}