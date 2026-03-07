"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const nameFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom est requis.")
    .max(32, "Un maximum de 32 caractères est autorisé."),
});

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis."),
    newPassword: z
      .string()
      .min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères."),
    confirmPassword: z
      .string()
      .min(1, "La confirmation du mot de passe est requise."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Les nouveaux mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

type NameFormValues = z.infer<typeof nameFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export function ProfileForm() {
  const { data: session, isPending: isSessionLoading } = useSession();
  const user = session?.user;

  const nameForm = useForm<NameFormValues>({
    resolver: zodResolver(nameFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    nameForm.reset({ name: user?.name ?? "" });
  }, [nameForm, user?.name]);

  const watchedName = nameForm.watch("name");
  const watchedCurrentPassword = passwordForm.watch("currentPassword");
  const watchedNewPassword = passwordForm.watch("newPassword");
  const watchedConfirmPassword = passwordForm.watch("confirmPassword");

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
  const handleAvatarSelect = (e: ChangeEvent<HTMLInputElement>) => {
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
  const handleSaveName = nameForm.handleSubmit(async (values) => {
    try {
      await authClient.updateUser({
        name: values.name,
      });
      toast.success("Nom mis à jour avec succès.");
      nameForm.reset({ name: values.name });
    } catch {
      toast.error("Erreur lors de la mise à jour du nom.");
    }
  });

  // Handle Password Update
  const handleSavePassword = passwordForm.handleSubmit(async (values) => {
    try {
      const res = await authClient.changePassword({
        newPassword: values.newPassword,
        currentPassword: values.currentPassword,
        revokeOtherSessions: true,
      });

      if (res.error) {
        toast.error(res.error.message || "Erreur de mot de passe");
      } else {
        toast.success("Mot de passe mis à jour avec succès.");
        passwordForm.reset();
      }
    } catch {
      toast.error("Erreur lors de la mise à jour du mot de passe.");
    }
  });

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
            {user?.image && (
              <AvatarImage src={user.image} alt={user?.name || ""} />
            )}
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
          <form onSubmit={handleSaveName} className="max-w-md">
            <Input
              placeholder="Votre nom complet"
              {...nameForm.register("name")}
              maxLength={32}
            />
            {nameForm.formState.errors.name && (
              <p className="mt-2 text-sm text-red-500">
                {nameForm.formState.errors.name.message}
              </p>
            )}
          </form>
        </SettingsCardContent>
        <SettingsCardFooter>
          <p>Un maximum de 32 caractères est autorisé.</p>
          <Button
            type="button"
            onClick={handleSaveName}
            disabled={
              nameForm.formState.isSubmitting ||
              watchedName === (user?.name ?? "") ||
              !watchedName?.trim()
            }
          >
            {nameForm.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
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
          <form onSubmit={handleSavePassword} className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Mot de passe actuel</Label>
              <Input
                id="current"
                type="password"
                {...passwordForm.register("currentPassword")}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-red-500">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">Nouveau mot de passe</Label>
              <Input
                id="new"
                type="password"
                {...passwordForm.register("newPassword")}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-red-500">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input
                id="confirm"
                type="password"
                {...passwordForm.register("confirmPassword")}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
          </form>
        </SettingsCardContent>
        <SettingsCardFooter>
          <p>
            Utilisez un mot de passe fort comprenant des lettres, des chiffres
            et des symboles.
          </p>
          <Button
            type="button"
            onClick={handleSavePassword}
            disabled={
              passwordForm.formState.isSubmitting ||
              !watchedCurrentPassword ||
              !watchedNewPassword ||
              !watchedConfirmPassword
            }
          >
            {passwordForm.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Mettre à jour
          </Button>
        </SettingsCardFooter>
      </SettingsCard>
    </div>
  );
}
