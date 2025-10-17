import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import { passwordResetSchema, type PasswordResetData } from "@shared/schema";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  // Get token from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast({
        title: "Invalid Link",
        description: "No reset token found in the URL.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const form = useForm<PasswordResetData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      token: "",
      newPassword: "",
    },
  });

  // Update form token when token state changes
  useEffect(() => {
    if (token) {
      form.setValue('token', token);
    }
  }, [token, form]);

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: PasswordResetData) => {
      const res = await apiRequest("POST", "/api/reset-password", data);
      return await res.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast({
        title: "Success!",
        description: "Your password has been reset successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PasswordResetData) => {
    resetPasswordMutation.mutate(data);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Password Reset Successfully
            </CardTitle>
            <CardDescription>
              Your password has been updated. You can now log in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-gray-200 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Reset Your Password
          </CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                New Password
              </Label>
              <div className="relative mt-2">
                <Input 
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  {...form.register("newPassword")}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.newPassword && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.newPassword.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Password must contain at least 8 characters with uppercase, lowercase, and numbers.
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={resetPasswordMutation.isPending || !token}
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button asChild variant="ghost" className="text-sm">
              <Link href="/auth">Back to Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
