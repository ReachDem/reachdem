import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ChartAreaSkeleton() {
  return (
    <Card className="col-span-1 rounded-none border-t-0 border-r-0 border-l-0 md:rounded-xl md:border-t md:border-r md:border-l lg:col-span-2">
      <CardHeader className="flex items-center justify-between gap-2 border-b py-5 shadow-sm sm:flex-row md:space-y-0">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <Skeleton className="mb-2 h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="mt-4 flex h-12 gap-2 sm:mt-0">
          <div className="flex h-12 w-[160px] flex-col justify-center gap-1 border-r px-4 sm:border-l">
            <Skeleton className="mb-1 h-4 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex h-12 w-[160px] flex-col justify-center gap-1 px-4 sm:border-l">
            <Skeleton className="mb-1 h-4 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <Skeleton className="aspect-auto h-[250px] w-full" />
      </CardContent>
    </Card>
  );
}
