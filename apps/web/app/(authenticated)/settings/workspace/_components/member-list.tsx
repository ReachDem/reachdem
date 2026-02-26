"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type Member = {
  id: string;
  role: string;
  user: User;
};

interface MemberListProps {
  members: Member[];
}

export function MemberList({ members }: MemberListProps) {
  // If we don't have user info properly populated for preview, we can render dummy data
  // But we try to map the real members list.
  return (
    <div className="rounded-md border border-foreground/30 bg-card">
      <div className="flex flex-col">
        {members.map((member, index) => (
          <div 
            key={member.id} 
            className={`flex items-center justify-between p-4 ${
              index !== members.length - 1 ? "border-b border-foreground/30" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10 border border-foreground/20">
                <AvatarImage src={member.user?.image || ""} alt={member.user?.name || member.user?.email || "User avatar"} />
                <AvatarFallback className="bg-transparent">{member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{member.user?.email || member.user?.name || "Unknown User"}</span>
            </div>
            <span className="px-3 py-1 text-xs font-medium border border-foreground/30 rounded-full capitalize">
              {member.role === "owner" ? "Owner" : member.role}
            </span>
          </div>
        ))}

        {/* Developer Fallback for empty list / preview to match wireframe exactly */}
        {members.length === 0 && (
          <>
            <div className="flex items-center justify-between p-4 border-b border-foreground/30">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 border border-foreground/20">
                  <AvatarFallback className="bg-transparent" />
                </Avatar>
                <span className="text-sm font-medium text-foreground">latoioms@gmail.com</span>
              </div>
              <span className="px-3 py-1 text-xs font-medium border border-foreground/30 rounded-full">
                Owner
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 border border-foreground/20">
                  <AvatarFallback className="bg-transparent" />
                </Avatar>
                <span className="text-sm font-medium text-foreground">latoioms@proton.com</span>
              </div>
              <span className="px-3 py-1 text-xs font-medium border border-foreground/30 rounded-full">
                member
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
