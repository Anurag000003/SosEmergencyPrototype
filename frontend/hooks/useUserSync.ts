import { useUser } from "@/components/AuthProvider";
import { useEffect } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { useUserStore } from "@/store/userStore";
import { User } from "@supabase/supabase-js";

export const useUserSync = () => {
  const { user } = useUser();
  const setIsAdmin = useUserStore((state) => state.setIsAdmin);
  const authSupabase = useSupabase();

  useEffect(() => {
    if (!user) return;
    syncUser(user as User);
  }, [user]);

  const syncUser = async (u: User) => {
    const { data, error: selectError } = await authSupabase
      .from("users")
      .select("user_id, is_admin")
      .eq("user_id", u.id)
      .single();

    if (data) {
      setIsAdmin(data.is_admin ?? false);
      return;
    }

    // Only insert if the row doesn't exist
    if (selectError && selectError.code === 'PGRST116') {
      const { data: newUser, error: insertError } = await authSupabase
        .from("users")
        .insert({
          user_id: u.id,
          email: u.email,
          first_name: u.user_metadata?.first_name || '',
          last_name: u.user_metadata?.last_name || '',
          avatar_url: u.user_metadata?.avatar_url || '',
        })
        .select("is_admin")
        .single();
        
      if (insertError) {
        console.error("Error creating user profile:", insertError);
      }

      setIsAdmin(newUser?.is_admin ?? false);
    }
  };
};
