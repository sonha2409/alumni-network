"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface LightboxImage {
  url: string;
  alt: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

export function ImageLightbox({
  images,
  initialIndex,
  open,
  onClose,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const current = images[currentIndex];
  const hasMultiple = images.length > 1;

  function goNext() {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }

  function goPrev() {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[90vw] overflow-hidden border-none bg-black/90 p-0 sm:rounded-lg">
        <div className="relative flex h-full items-center justify-center">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Navigation arrows */}
          {hasMultiple && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                aria-label="Previous image"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5 8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
              <button
                onClick={goNext}
                className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                aria-label="Next image"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Image */}
          {current && (
            <img
              src={current.url}
              alt={current.alt}
              className="max-h-[85vh] max-w-[85vw] object-contain"
            />
          )}

          {/* Counter */}
          {hasMultiple && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
