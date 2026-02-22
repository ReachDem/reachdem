import { prisma } from "@reachdem/database";

export function getSlugFromString(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

export async function generateUniqueOrganizationSlug(name: string): Promise<string> {
    const baseSlug = getSlugFromString(name) || "workspace";
    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const existingInfo = await prisma.organization.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!existingInfo) {
            return slug;
        }

        counter++;
        slug = `${baseSlug}-${counter}`;
    }
}
