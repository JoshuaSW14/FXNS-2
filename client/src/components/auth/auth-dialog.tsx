import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff } from "lucide-react";

type Mode = "login" | "register";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email address"),
  passwordHash: z.string().min(8, "Password must be at least 8 characters"),
});

export function AuthDialog({
  open,
  mode,
  onOpenChange,
  onSuccessRoute = "/dashboard",
}: {
  open: boolean;
  mode: Mode;
  onOpenChange: (open: boolean) => void;
  onSuccessRoute?: string;
}) {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // If user becomes logged in while dialog is open, close and route
  useEffect(() => {
    if (open && user) {
      onOpenChange(false);
      setLocation(onSuccessRoute);
    }
  }, [user, open, onOpenChange, onSuccessRoute, setLocation]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", passwordHash: "" },
  });

  const onLogin = (data: z.infer<typeof loginSchema>) =>
    loginMutation.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        setLocation(onSuccessRoute);
      },
    });

  const onRegister = (data: z.infer<typeof registerSchema>) =>
    registerMutation.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        setLocation(onSuccessRoute);
      },
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Sign in" : "Create account"}</DialogTitle>
          <DialogDescription>
            {mode === "login" ? "Welcome back — sign in to your fxns account." : "Get started with fxns today."}
          </DialogDescription>
        </DialogHeader>

        {mode === "login" ? (
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
            <div>
              <Label htmlFor="login-email">Email address</Label>
              <Input id="login-email" type="email" {...loginForm.register("email")} />
              {loginForm.formState.errors.email && (
                <p className="text-sm text-red-600">{loginForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  {...loginForm.register("password")}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember">Remember me</Label>
              </div>
              <button type="button" className="text-sm text-primary-600 hover:underline">
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Sign in
            </Button>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
            <div>
              <Label htmlFor="register-name">Full name</Label>
              <Input id="register-name" type="text" {...registerForm.register("name")} />
              {registerForm.formState.errors.name && (
                <p className="text-sm text-red-600">{registerForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="register-email">Email address</Label>
              <Input id="register-email" type="email" {...registerForm.register("email")} />
              {registerForm.formState.errors.email && (
                <p className="text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="register-password">Password</Label>
              <Input id="register-password" type="password" {...registerForm.register("passwordHash")} />
              {registerForm.formState.errors.passwordHash && (
                <p className="text-sm text-red-600">{registerForm.formState.errors.passwordHash.message}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Must be at least 8 characters with numbers and symbols
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="terms" required />
              <Label htmlFor="terms" className="text-sm">
                I agree to the Terms of Service and Privacy Policy
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
              {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create account
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
