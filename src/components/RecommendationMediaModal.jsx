import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Film } from 'lucide-react';

export function RecommendationMediaModal({ recommendation, onClose }) {
  const videoRef = useRef(null);

  function handleClose() {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
    }
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="no-scrollbar max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{recommendation.name || 'Recommendation media'}</DialogTitle>
          <DialogDescription className="sr-only">
            Current thumbnail and video for recommendation {recommendation.name}
          </DialogDescription>
        </DialogHeader>

        {recommendation.videoUrl ? (
          <video
            ref={videoRef}
            src={recommendation.videoUrl}
            poster={recommendation.imageUrl || undefined}
            controls
            autoPlay
            className="aspect-video w-full rounded-lg border bg-black object-contain"
          />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground">
            <Film className="mb-2 size-7 opacity-60" />
            <span className="text-sm">No video available</span>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
