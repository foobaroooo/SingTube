import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaginationProps {
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
  isLoading?: boolean;
  className?: string;
}

export const Pagination = ({ 
  currentPage, 
  hasNextPage,
  hasPrevPage,
  onPrevious, 
  onNext,
  isLoading = false,
  className = "" 
}: PaginationProps) => {
  const { t } = useTranslation();
  console.log('Pagination render:', { currentPage, hasNextPage, hasPrevPage, isLoading });
  
  // Show pagination if we have next page or we're not on page 1
  if (!hasNextPage && currentPage === 1) {
    console.log('Pagination hidden: no next page and on page 1');
    return null;
  }

  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      {/* Previous Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={!hasPrevPage || isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
        {t('app.pagination.previous')}
      </Button>

      {/* Current Page Info */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('app.pagination.page')}</span>
        <div className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm font-medium">
          {currentPage}
        </div>
      </div>

      {/* Next Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!hasNextPage || isLoading}
        className="flex items-center gap-2"
      >
        {t('app.pagination.next')}
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
};