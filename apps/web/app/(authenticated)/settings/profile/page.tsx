import { Metadata } from "next";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Profile Settings - ReachDem",
  description: "Manage your profile preferences.",
};

export default function ProfilePage() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <ProfileForm />
    </div>
  );
}
