"use client";

import { useState, useRef } from "react";
import { authClient, useSession } from "@reachdem/auth/client";
import { toast } from "sonner";
import { Loader2, Camera, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings-card";
import { AvatarCropperDialog } from "@/components/avatar-cropper-dialog";

export function ProfileForm() {
  const { data: session, isPending: isSessionLoading } = useSession();
  const user = session?.user;

  // Form states
  const [name, setName] = useState(user?.name || "");
  const [isSavingName, setIsSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Avatar states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [avatarImageSrc, setAvatarImageSrc] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  if (isSessionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Handle Avatar Selection
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setAvatarImageSrc(imageUrl);
      setIsAvatarDialogOpen(true);
    }
  };

  // Handle Avatar Crop & Upload
  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploadingAvatar(true);
    setIsAvatarDialogOpen(false);

    try {
      const formData = new FormData();
      formData.append("file", croppedBlob, "avatar.jpg");
      formData.append("type", "user");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Erreur lors de l'upload");
      }

      const data = await res.json();

      // Update the user session in better-auth
      await authClient.updateUser({
        image: data.url,
      });

      toast.success("Avatar mis à jour avec succès.");
    } catch (error) {
      toast.error("Échec de la mise à jour de l'avatar.");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Name Update
  const handleSaveName = async () => {
    if (!name.trim()) return;

    setIsSavingName(true);
    try {
      await authClient.updateUser({
        name,
      });
      toast.success("Nom mis à jour avec succès.");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du nom.");
    } finally {
      setIsSavingName(false);
    }
  };

  // Handle Password Update
  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await authClient.changePassword({
        newPassword,
        currentPassword,
        revokeOtherSessions: true,
      });

      if (res.error) {
        toast.error(res.error.message || "Erreur de mot de passe");
      } else {
        toast.success("Mot de passe mis à jour avec succès.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du mot de passe.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";
  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Récent";

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Mon Profil</h2>
        <p className="text-muted-foreground mt-1">
          Gérez vos informations personnelles et préférences de compte.
        </p>
      </div>

      {/* AVATAR SETTINGS */}
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Avatar</SettingsCardTitle>
          <SettingsCardDescription>
            C'est l'image qui sera affichée sur votre profil public et dans vos
            projets.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="flex items-center gap-6 pt-6">
          <Avatar className="h-20 w-20 border shadow-sm">
            <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-2xl font-semibold text-white">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h4 className="font-medium">Télécharger un nouvel avatar</h4>
            <p className="text-muted-foreground text-sm">
              Une image carrée est recommandée (max 5 Mo).
            </p>
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleAvatarSelect}
            />
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              Sélectionner une image
            </Button>
          </div>
        </SettingsCardContent>
        {isUploadingAvatar && (
          <SettingsCardFooter>
            <span className="text-muted-foreground animate-pulse">
              Envoi en cours vers nos serveurs...
            </span>
          </SettingsCardFooter>
        )}
      </SettingsCard>

      <AvatarCropperDialog
        open={isAvatarDialogOpen}
        onOpenChange={setIsAvatarDialogOpen}
        imageSrc={avatarImageSrc}
        onCropComplete={handleCropComplete}
      />

      {/* NAME SETTINGS */}
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Nom complet</SettingsCardTitle>
          <SettingsCardDescription>
            Saisissez le nom sous lequel vous souhaitez être reconnu.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="pt-6">
          <div className="max-w-md">
            <Input
              placeholder="Votre nom complet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
            />
          </div>
        </SettingsCardContent>
        <SettingsCardFooter>
          <p>Un maximum de 32 caractères est autorisé.</p>
          <Button
            onClick={handleSaveName}
            disabled={isSavingName || name === user?.name || !name.trim()}
          >
            {isSavingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </SettingsCardFooter>
      </SettingsCard>

      {/* EMAIL AND LOGIN INFO (Read Only) */}
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Adresse e-mail</SettingsCardTitle>
          <SettingsCardDescription>
            C'est l'adresse email utilisée pour vous connecter à ReachDem.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="pt-6">
          <div className="max-w-md space-y-4">
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                value={user?.email || ""}
                disabled
                className="bg-muted/50 pl-9"
              />
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Membre depuis le : </span>
              <span className="font-medium">{formattedDate}</span>
            </div>
          </div>
        </SettingsCardContent>
        <SettingsCardFooter>
          <p>
            L'adresse e-mail de votre compte ne peut pas être modifiée
            directement pour des raisons de sécurité.
          </p>
        </SettingsCardFooter>
      </SettingsCard>

      {/* PASSWORD SETTINGS */}
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Mot de passe</SettingsCardTitle>
          <SettingsCardDescription>
            Mettez à jour le mot de passe associé à votre compte.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="pt-6">
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Mot de passe actuel</Label>
              <Input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">Nouveau mot de passe</Label>
              <Input
                id="new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        </SettingsCardContent>
        <SettingsCardFooter>
          <p>
            Utilisez un mot de passe fort comprenant des lettres, des chiffres
            et des symboles.
          </p>
          <Button
            onClick={handleSavePassword}
            disabled={
              isSavingPassword ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
          >
            {isSavingPassword && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Mettre à jour
          </Button>
        </SettingsCardFooter>
      </SettingsCard>
    </div>
  );
}
