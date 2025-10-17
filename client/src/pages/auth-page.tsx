import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff, Zap } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email address"),
  passwordHash: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    color: string;
  }>({ score: 0, label: '', color: 'bg-gray-200' });

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    if (!password) {
      setPasswordStrength({ score: 0, label: '', color: 'bg-gray-200' });
      return;
    }

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Character variety checks
    if (/[a-z]/.test(password)) score += 1; // lowercase
    if (/[A-Z]/.test(password)) score += 1; // uppercase
    if (/[0-9]/.test(password)) score += 1; // numbers
    if (/[^a-zA-Z0-9]/.test(password)) score += 1; // symbols
    
    // Update strength state
    if (score <= 2) {
      setPasswordStrength({ score: 1, label: 'Weak', color: 'bg-red-500' });
    } else if (score <= 4) {
      setPasswordStrength({ score: 2, label: 'Fair', color: 'bg-yellow-500' });
    } else if (score <= 5) {
      setPasswordStrength({ score: 3, label: 'Good', color: 'bg-blue-500' });
    } else {
      setPasswordStrength({ score: 4, label: 'Strong', color: 'bg-green-500' });
    }
  };

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      passwordHash: "",
    },
  });

    const onLogin = (data: LoginForm) => {

    loginMutation.mutate(data, {
      onSuccess: () => {
        setLocation("/dashboard");
      },
    });
  };

  const onRegister = (data: RegisterForm) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        setLocation("/dashboard");
      },
    });
  };

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 flex">
      {/* Left side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {isLogin ? (
            <Card className="border border-gray-200 shadow-lg" data-testid="login-form">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-violet-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 mb-2">Welcome back</h1>
                  <p className="text-gray-600">Sign in to your fxns account</p>
                </div>

                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                      Email address
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                     {...loginForm.register("email")}
                      className="mt-2"
                      data-testid="input-email"
                                      />
                        {loginForm.formState.errors.email && (
                            <p className="text-sm text-red-600 mt-1">
                                {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...loginForm.register("password")}
                        className="pr-10"
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-600 mt-1">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" />
                      <Label htmlFor="remember" className="text-sm text-gray-600">
                        Remember me
                      </Label>
                    </div>
                    <Link href="/forgot-password">
                      <button
                        type="button"
                        className="text-sm text-primary-600 hover:text-primary-700"
                        data-testid="link-forgot-password"
                      >
                        Forgot password?
                      </button>
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Sign in
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{" "}
                    <button
                      onClick={() => setIsLogin(false)}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                      data-testid="link-signup"
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-gray-200 shadow-lg" data-testid="register-form">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-gray-900 mb-2">Create account</h1>
                  <p className="text-gray-600">Get started with fxns today</p>
                </div>

                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div>
                    <Label htmlFor="register-name" className="text-sm font-medium text-gray-700">
                      Full name
                    </Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Alex Johnson"
                      {...registerForm.register("name")}
                      className="mt-2"
                      data-testid="input-name"
                    />
                    {registerForm.formState.errors.name && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="register-email" className="text-sm font-medium text-gray-700">
                      Email address
                    </Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="you@example.com"
                      {...registerForm.register("email")}
                      className="mt-2"
                      data-testid="input-email"
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="register-password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      {...registerForm.register("passwordHash", {
                        onChange: (e) => calculatePasswordStrength(e.target.value)
                      })}
                      className="mt-2"
                      data-testid="input-password"
                    />
                    
                    {/* Password strength indicator */}
                    {registerForm.watch("passwordHash") && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Password strength:</span>
                          <span className={`text-xs font-medium ${
                            passwordStrength.score === 1 ? 'text-red-600' :
                            passwordStrength.score === 2 ? 'text-yellow-600' :
                            passwordStrength.score === 3 ? 'text-blue-600' :
                            'text-green-600'
                          }`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 flex-1 rounded-full transition-colors ${
                                level <= passwordStrength.score
                                  ? passwordStrength.color
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="mt-1 text-xs text-gray-500">
                      Must be at least 8 characters with numbers and symbols
                    </p>
                    {registerForm.formState.errors.passwordHash && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.passwordHash.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox id="terms" required />
                    <Label htmlFor="terms" className="text-sm text-gray-600">
                      I agree to the{" "}
                      <a href="#" className="text-primary-600 hover:text-primary-700">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-primary-600 hover:text-primary-700">
                        Privacy Policy
                      </a>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Create account
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{" "}
                    <button
                      onClick={() => setIsLogin(true)}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                      data-testid="link-signin"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Right side - Hero content */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-600 to-violet-600 items-center justify-center p-12">
        <div className="max-w-md text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">fxns — shortcuts that work</h2>
          <p className="text-primary-100 mb-8">
            Save time every day with our collection of powerful micro-tools designed for real-world tasks.
          </p>
          <div className="space-y-3 text-left">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xs">✓</span>
              </div>
              <span>25+ built-in tools ready to use</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xs">✓</span>
              </div>
              <span>Privacy-focused with no data tracking</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xs">✓</span>
              </div>
              <span>Create custom tools with Pro plan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
