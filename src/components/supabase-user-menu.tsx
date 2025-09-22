"use client";

import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function SupabaseUserMenu() {
  const { user } = useSupabaseAuth();
  const supabase = getSupabaseClient();

  const signOut = async () => {
    await supabase?.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer">
          <AvatarImage src={(user?.user_metadata?.avatar_url as string) || "/placeholder.png"} />
          <AvatarFallback>ME</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled>
          {(user?.user_metadata?.full_name as string) || (user?.email as string) || "Me"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
