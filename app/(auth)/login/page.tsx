"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as any, // eslint-disable-line
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        toast.success("Welcome back!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-luxury-black flex">
      {/* Left panel - Brand */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0d0d0d] items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#D4AF37]/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#D4AF37]/3 blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/HT_White.png" alt="House of Tailors" className="object-contain w-full h-20 mx-auto mb-8" />
            <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
              Enterprise-grade tailoring management platform for luxury fashion houses.
            </p>
          </motion.div>

        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/HT_White.png" alt="House of Tailors" className="object-contain w-full h-20" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@houseoftailors.com"
                {...register("email")}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password")}
                  className={errors.password ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="gold"
              className="w-full"
              loading={loading}
              size="lg"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#D4AF37] hover:underline font-medium">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
