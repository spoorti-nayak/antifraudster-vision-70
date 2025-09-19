import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { validatePassword, getPasswordStrengthColor, type PasswordValidation } from "@/utils/passwordValidation";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showValidation?: boolean;
  id?: string;
  required?: boolean;
}

export const PasswordInput = ({
  value,
  onChange,
  placeholder = "Enter password",
  className,
  showValidation = true,
  id,
  required,
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const validation: PasswordValidation = validatePassword(value);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("pr-10", className)}
          required={required}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      
      {showValidation && value && (
        <div className="space-y-2">
          {/* Password Strength Indicator */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Strength:</span>
            <span className={cn("text-xs font-medium capitalize", getPasswordStrengthColor(validation.strength))}>
              {validation.strength}
            </span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  validation.strength === 'weak' && "w-1/3 bg-fraud",
                  validation.strength === 'medium' && "w-2/3 bg-suspicious", 
                  validation.strength === 'strong' && "w-full bg-safe"
                )}
              />
            </div>
          </div>
          
          {/* Validation Requirements */}
          <div className="space-y-1">
            {[
              { text: "At least 8 characters", valid: value.length >= 8 },
              { text: "One uppercase letter", valid: /[A-Z]/.test(value) },
              { text: "One lowercase letter", valid: /[a-z]/.test(value) },
              { text: "One number", valid: /\d/.test(value) },
              { text: "One special character", valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(value) },
            ].map((requirement, index) => (
              <div key={index} className="flex items-center space-x-2">
                {requirement.valid ? (
                  <Check className="h-3 w-3 text-safe" />
                ) : (
                  <X className="h-3 w-3 text-muted-foreground" />
                )}
                <span className={cn(
                  "text-xs",
                  requirement.valid ? "text-safe" : "text-muted-foreground"
                )}>
                  {requirement.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};