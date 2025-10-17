import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { AuthDialog } from "./auth-dialog";

type Mode = "login" | "register";
type Ctx = {
  openLogin: () => void;
  openRegister: () => void;
  close: () => void;
};
const AuthDialogCtx = createContext<Ctx | null>(null);

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("login");

  const value = useMemo<Ctx>(
    () => ({
      openLogin: () => {
        setMode("login");
        setOpen(true);
      },
      openRegister: () => {
        setMode("register");
        setOpen(true);
      },
      close: () => setOpen(false),
    }),
    []
  );

  return (
    <AuthDialogCtx.Provider value={value}>
      {children}
      <AuthDialog open={open} mode={mode} onOpenChange={setOpen} />
    </AuthDialogCtx.Provider>
  );
}

export function useAuthDialog() {
  const ctx = useContext(AuthDialogCtx);
  if (!ctx) throw new Error("useAuthDialog must be used within <AuthDialogProvider>");
  return ctx;
}
