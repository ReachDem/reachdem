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
    <div className="border-foreground/30 bg-card rounded-md border">
      <div className="flex flex-col">
        {members.map((member, index) => (
          <div
            key={member.id}
            className={`flex items-center justify-between p-4 ${
              index !== members.length - 1
                ? "border-foreground/30 border-b"
                : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <Avatar className="border-foreground/20 h-10 w-10 border">
                <AvatarImage
                  src={member.user?.image || ""}
                  alt={member.user?.name || member.user?.email || "User avatar"}
                />
                <AvatarFallback className="bg-transparent">
                  {member.user?.name?.charAt(0) ||
                    member.user?.email?.charAt(0) ||
                    "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {member.user?.email || member.user?.name || "Unknown User"}
              </span>
            </div>
            <span className="border-foreground/30 rounded-full border px-3 py-1 text-xs font-medium capitalize">
              {member.role === "owner" ? "Owner" : member.role}
            </span>
          </div>
        ))}

        {/* Developer Fallback for empty list / preview to match wireframe exactly */}
        {members.length === 0 && (
          <>
            <div className="border-foreground/30 flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-4">
                <Avatar className="border-foreground/20 h-10 w-10 border">
                  <AvatarFallback className="bg-transparent" />
                </Avatar>
                <span className="text-foreground text-sm font-medium">
                  latoioms@gmail.com
                </span>
              </div>
              <span className="border-foreground/30 rounded-full border px-3 py-1 text-xs font-medium">
                Owner
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Avatar className="border-foreground/20 h-10 w-10 border">
                  <AvatarFallback className="bg-transparent" />
                </Avatar>
                <span className="text-foreground text-sm font-medium">
                  latoioms@proton.com
                </span>
              </div>
              <span className="border-foreground/30 rounded-full border px-3 py-1 text-xs font-medium">
                member
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
