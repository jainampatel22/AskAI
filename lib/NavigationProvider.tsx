'use client'
import { createContext, useState } from "react";
interface NavigateContextType{
    isMobileNavOpen:boolean;
    setIsMobileNavOpen:(open:boolean)=>void
    closeMobileNav:()=>void
}
export const NavigateContext = createContext<NavigateContextType >({
    isMobileNavOpen:false,
    setIsMobileNavOpen:()=>{},
    closeMobileNav:()=>{}

}
    
)
export default function NavigationProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
    const closeMobileNav = ()=> setIsMobileNavOpen(false)
  return (
<NavigateContext value={{isMobileNavOpen,setIsMobileNavOpen,closeMobileNav}}>{children}</NavigateContext>
  );
}
