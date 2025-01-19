'use client'
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
export default function ConvexProviders({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
    <ClerkProvider>
        <ConvexProviderWithClerk useAuth={useAuth} client={convex}>
{children}
        </ConvexProviderWithClerk>
    </ClerkProvider>
    );
  }