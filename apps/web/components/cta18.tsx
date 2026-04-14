import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Cta18Props {
  className?: string;
}

const Cta18 = ({ className }: Cta18Props) => {
  return (
    <section className={cn("py-12", className)}>
      <div className="w-full overflow-hidden">
        <div className="bg-muted/50 relative mx-auto flex w-full flex-col justify-between gap-6 overflow-hidden rounded-xl border md:flex-row">
          <div className="max-w-xl self-center p-6 md:p-12">
            <h2 className="text-3xl font-semibold md:text-4xl">
              Need help getting started?
            </h2>
            <p className="text-muted-foreground mt-4 md:text-lg">
              Explore our resources to learn everything about the app, or book a
              demo. We’ll personally guide you on how to use the tool!
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button>Book a demo</Button>
              <Button variant="outline">View resources</Button>
            </div>
          </div>
          <div className="relative ml-6 max-h-96 md:mt-8 md:ml-0">
            <img
              src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/block-3.svg"
              alt="placeholder"
              className="absolute -bottom-12 left-4 h-48 -translate-x-1/2 -rotate-[120deg]"
            />
            <div className="bg-muted/50 relative z-10 flex aspect-video h-full w-full flex-col justify-end overflow-hidden rounded-tl-xl border-t border-l pt-4 pr-4 backdrop-blur-md md:pt-8">
              <img
                src="/avatar-founder.png"
                alt="Founder Avatar"
                className="h-full w-full translate-y-1/8 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Cta18 };
