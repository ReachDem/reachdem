"use client"

import { useSession, signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Workspace {
    id: string
    name: string
    slug: string
    _count: { members: number; contacts: number }
}

export default function DashboardPage() {
    const { data: session, isPending } = useSession()
    const router = useRouter()
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true)

    useEffect(() => {
        if (session) {
            fetch("/api/workspaces")
                .then((res) => res.json())
                .then((data) => {
                    setWorkspaces(data.workspaces || [])
                    setIsLoadingWorkspaces(false)
                    
                    // Rediriger vers onboarding si pas de workspace
                    if (!data.workspaces || data.workspaces.length === 0) {
                        router.push("/onboarding")
                    }
                })
                .catch(() => setIsLoadingWorkspaces(false))
        }
    }, [session, router])

    const handleSignOut = async () => {
        await signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/login")
                },
            },
        })
    }

    if (isPending || isLoadingWorkspaces) {
        return (
            <div className="flex min-h-svh items-center justify-center bg-black">
                <div className="text-white">Chargement...</div>
            </div>
        )
    }

    if (!session) {
        router.push("/login")
        return null
    }

    return (
        <div className="min-h-svh bg-black text-white p-6 md:p-10">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Bonjour, {session.user.name} 👋</h1>
                        <p className="text-zinc-400">{session.user.email}</p>
                    </div>
                    <Button onClick={handleSignOut} variant="outline" className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800">
                        Déconnexion
                    </Button>
                </div>

                {/* Workspaces */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Vos espaces de travail</h2>
                        {workspaces.length < 3 && (
                            <Button 
                                onClick={() => router.push("/onboarding")}
                                className="bg-white text-black hover:bg-zinc-200"
                            >
                                + Nouveau
                            </Button>
                        )}
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                        {workspaces.map((workspace) => (
                            <Card key={workspace.id} className="bg-zinc-900 border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                                <CardHeader>
                                    <CardTitle className="text-white">{workspace.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-4 text-sm text-zinc-400">
                                        <span>{workspace._count.members} membre(s)</span>
                                        <span>{workspace._count.contacts} contact(s)</span>
                                    </div>
                                    <p className="text-xs text-zinc-600 mt-2">/{workspace.slug}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid gap-4 md:grid-cols-3 mt-8">
                    <a href="/api-docs" className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
                        <span className="text-2xl">📡</span>
                        <h3 className="font-medium mt-2">API Docs</h3>
                        <p className="text-sm text-zinc-500">Documentation des endpoints</p>
                    </a>
                </div>
            </div>
        </div>
    )
}
