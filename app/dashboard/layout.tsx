"use client"
import Headers from "@/components/Headers"
import Sidebar from "@/components/Sidebar";
import NavigationProvider from "@/lib/NavigationProvider";
import { Authenticated } from "convex/react"
import { useState } from "react";
export default function DashboardLayout({
    children,
}:{
    children:React.ReactNode
}){
    
    return <NavigationProvider> 
        <div className="flex min-h-screen">
        <Authenticated>
         <Sidebar/>
        </Authenticated>
        <div className="flex-1 ">
            <Headers/>
         <main>{children}</main>  
        </div>
    </div>
    </NavigationProvider>
}