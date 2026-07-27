import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import * as pdfjsLib from 'pdfjs-dist';
import { format } from 'date-fns';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
  MessageSquare,
  Edit2,
  Trash2,
  FileText,
  Download,
  ExternalLink,
  Copy,
  Check,
  SmilePlus,
  Reply,
  Play,
  Pause,
  Video,
  FileCode,
  FileArchive,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Eye,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUserSettings } from '../../context/UserSettingsContext';

const formatBytes = (bytes: number, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const VoicePlayer: React.FC<{ url: string; isSender?: boolean }> = ({ url, isSender }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2];

  const cycleSpeed = () => {
    const nextIdx = (SPEED_OPTIONS.indexOf(playbackSpeed) + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.playbackRate = playbackSpeed;

    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.onloadedmetadata = () => {
      updateDuration();
      if (!isFinite(audio.duration)) {
        audio.currentTime = 1e101;
        audio.ontimeupdate = () => {
          audio.ontimeupdate = null;
          audio.currentTime = 0;
          updateDuration();
        };
      }
    };

    audio.ondurationchange = updateDuration;

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime || 0);
      if (!duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`flex items-center gap-2.5 p-2.5 rounded-2xl shadow-xs my-1 min-w-[240px] max-w-xs select-none ${
        isSender
          ? 'bg-indigo-700/80 border border-indigo-500/50 text-white'
          : 'bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
      }`}
    >
      <button
        onClick={togglePlay}
        className={`p-2.5 rounded-full transition-transform active:scale-95 flex-shrink-0 ${
          isSender
            ? 'bg-white text-indigo-700 hover:bg-indigo-50'
            : 'bg-indigo-600 text-white hover:bg-indigo-500'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between text-[11px] font-mono font-semibold opacity-90">
          <span>Voice</span>
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        {/* Animated Waveform indicator */}
        <div className="flex items-center gap-0.5 h-4 overflow-hidden">
          {[40, 70, 30, 90, 50, 80, 40, 100, 60, 40, 80, 50, 30, 70, 40].map((h, i) => (
            <span
              key={i}
              style={{ height: `${h}%` }}
              className={`w-1 rounded-full transition-all ${
                isPlaying ? 'animate-pulse' : 'opacity-50'
              } ${isSender ? 'bg-indigo-200' : 'bg-indigo-500'}`}
            />
          ))}
        </div>
      </div>

      {/* Speed controller button */}
      <button
        onClick={cycleSpeed}
        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all active:scale-95 flex-shrink-0 ${
          isSender
            ? 'bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-400/40 shadow-xs'
            : 'bg-slate-200 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 hover:bg-slate-300 dark:hover:bg-slate-600'
        }`}
        title="Playback Speed (0.5x, 1x, 1.25x, 1.5x, 2x)"
      >
        {playbackSpeed}x
      </button>
    </div>
  );
};

interface ImageLightboxModalProps {
  images: { url: string; name: string }[];
  initialIndex: number;
  onClose: () => void;
}

const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number | null>(null);

  const currentImg = images[currentIndex] || images[0];

  const resetTransforms = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleNext = () => {
    resetTransforms();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    resetTransforms();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.3, 4.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.3, 0.5));
  const handleRotateLeft = () => setRotation((prev) => (prev - 90) % 360);
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1 && rotation === 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchStartDistRef.current = getTouchDistance(e.touches);
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = getTouchDistance(e.touches);
      const factor = dist / touchStartDistRef.current;
      setScale((prev) => Math.min(Math.max(prev * factor, 0.5), 4.5));
      touchStartDistRef.current = dist;
    } else if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    setIsDragging(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === '=' || e.key === '+') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === 'r' || e.key === 'R') handleRotateRight();
      if (e.key === '0') resetTransforms();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, currentIndex]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col justify-between p-3 md:p-6 animate-in fade-in duration-200 select-none overflow-hidden"
      onClick={onClose}
    >
      {/* Top Header Controls Bar */}
      <div
        className="flex items-center justify-between w-full z-10 px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="truncate font-medium text-xs md:text-sm max-w-xs md:max-w-md">
            {currentImg.name}
          </span>
          {images.length > 1 && (
            <span className="text-[10px] px-2 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 rounded-full font-mono font-bold">
              {currentIndex + 1} of {images.length}
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-full font-mono hidden sm:inline-block">
            {Math.round(scale * 100)}% {rotation !== 0 && `• ${rotation}°`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <a
            href={currentImg.url}
            download={currentImg.name}
            target="_blank"
            rel="noreferrer"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors"
            title="Download Image"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-xl transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Image Canvas with Floating Next/Prev Arrow Buttons */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing relative my-2"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Image Button */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 md:left-6 z-20 p-3 bg-slate-900/75 hover:bg-indigo-600 text-white rounded-full transition-all backdrop-blur-md shadow-2xl active:scale-95 border border-slate-700/60"
            title="Previous Image (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <img
          key={currentImg.url}
          src={currentImg.url}
          alt={currentImg.name}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="max-h-[75vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl pointer-events-auto"
        />

        {/* Next Image Button */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 md:right-6 z-20 p-3 bg-slate-900/75 hover:bg-indigo-600 text-white rounded-full transition-all backdrop-blur-md shadow-2xl active:scale-95 border border-slate-700/60"
            title="Next Image (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Floating Control Dock */}
      <div
        className="self-center z-10 px-4 py-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl text-white shadow-2xl flex items-center gap-1 md:gap-2 animate-in slide-in-from-bottom-2 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="font-mono text-xs text-slate-400 px-1 font-semibold min-w-[42px] text-center">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <span className="w-[1px] h-4 bg-slate-800 mx-1" />

        <button
          onClick={handleRotateLeft}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
          title="Rotate Left (90°)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={handleRotateRight}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
          title="Rotate Right (90° / R)"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <span className="w-[1px] h-4 bg-slate-800 mx-1" />

        <button
          onClick={resetTransforms}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
          title="Reset View / Fit Screen (0)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface PdfPreviewModalProps {
  url: string;
  name: string;
  onClose: () => void;
}

const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ url, name, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    setIsLoading(true);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const loadingTask = pdfjsLib.getDocument(url);
    loadingTask.promise
      .then((doc) => {
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNumber(1);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error loading PDF document:', err);
        setIsLoading(false);
      });
  }, [url]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setPageNumber((prev) => Math.max(prev - 1, 1));
      }
      if (e.key === '=' || e.key === '+') {
        setScale((prev) => Math.min(prev + 0.2, 3.0));
      }
      if (e.key === '-') {
        setScale((prev) => Math.max(prev - 0.2, 0.5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    pdfDoc.getPage(pageNumber).then((page: any) => {
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      const renderContext = {
        canvasContext: context,
        transform: transform,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      renderTask.promise.catch(() => {
        // Suppress cancelled rendering promise warnings
      });
    });
  }, [pdfDoc, pageNumber, scale, rotation]);

  const handleNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages));
  const handlePrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);
  const handleResetZoom = () => {
    setScale(1.2);
    setRotation(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/94 backdrop-blur-md flex flex-col justify-between p-3 md:p-6 animate-in fade-in duration-200 select-none overflow-hidden"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="flex items-center justify-between w-full z-10 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl text-white shadow-2xl mb-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
            <FileText className="w-4 h-4" />
          </div>
          <span className="truncate font-semibold text-xs md:text-sm max-w-xs md:max-w-md">{name}</span>
          {numPages > 0 && (
            <span className="text-[10px] px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full font-mono font-bold">
              Page {pageNumber} of {numPages}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={url}
            download={name}
            target="_blank"
            rel="noreferrer"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-xl transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Canvas View Box */}
      <div
        className="flex-1 w-full flex items-center justify-center overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 relative my-2"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Rendering PDF Document...</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`shadow-2xl rounded-xl border border-slate-800/80 transition-all ${
            isLoading ? 'hidden' : 'block'
          }`}
        />
      </div>

      {/* Floating Control Toolbar */}
      <div
        className="self-center z-10 px-4 py-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl text-white shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handlePrevPage}
          disabled={pageNumber <= 1}
          className="p-2 hover:bg-slate-800 disabled:opacity-40 rounded-xl text-slate-300 hover:text-white transition-colors"
          title="Previous Page (←)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="font-mono text-xs text-slate-300 px-2 font-bold min-w-[50px] text-center">
          {pageNumber} / {numPages || 1}
        </span>

        <button
          onClick={handleNextPage}
          disabled={pageNumber >= numPages}
          className="p-2 hover:bg-slate-800 disabled:opacity-40 rounded-xl text-slate-300 hover:text-white transition-colors"
          title="Next Page (→)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span className="w-[1px] h-4 bg-slate-800 mx-1" />

        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="font-mono text-xs text-slate-400 px-1 font-semibold min-w-[42px] text-center">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <span className="w-[1px] h-4 bg-slate-800 mx-1" />

        <button
          onClick={handleRotateRight}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
          title="Rotate Right (90°)"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <button
          onClick={handleResetZoom}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
          title="Reset Zoom & Rotation"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface VideoLightboxModalProps {
  url: string;
  name: string;
  onClose: () => void;
}

const VideoLightboxModal: React.FC<VideoLightboxModalProps> = ({ url, name, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
  };

  const cycleSpeed = () => {
    const nextIdx = (SPEED_OPTIONS.indexOf(speed) + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIdx];
    setSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/94 backdrop-blur-md flex flex-col justify-between p-3 md:p-6 animate-in fade-in duration-200 select-none overflow-hidden"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="flex items-center justify-between w-full z-10 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl text-white shadow-2xl mb-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Video className="w-4 h-4" />
          </div>
          <span className="truncate font-semibold text-xs md:text-sm max-w-xs md:max-w-md">{name}</span>
          <span className="text-[10px] px-2.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-full font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <a
            href={url}
            download={name}
            target="_blank"
            rel="noreferrer"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors"
            title="Download Video"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-xl transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Video Canvas */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative my-2"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={videoRef}
          src={url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
          className="max-h-[72vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl cursor-pointer"
        />
      </div>

      {/* Bottom Custom Video Control Dock */}
      <div
        className="self-center z-10 w-full max-w-2xl px-4 py-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl text-white shadow-2xl flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seekbar */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-800 accent-indigo-500 rounded-lg cursor-pointer"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-transform active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <span className="font-mono text-xs text-slate-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed Toggle */}
            <button
              onClick={cycleSpeed}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-mono text-xs font-bold rounded-xl transition-colors border border-slate-700"
              title="Change Speed"
            >
              {speed}x
            </button>

            {/* Volume control */}
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user?: { username: string };
}

interface Message {
  id: string;
  channelId: string;
  senderId?: string;
  content: string;
  formatting?: string;
  createdAt: string;
  editedAt?: string;
  isDeleted?: boolean;
  parentId?: string;
  parent?: {
    id: string;
    content: string;
    sender?: {
      id?: string;
      username: string;
      avatarUrl?: string;
    };
  };
  sender?: {
    id: string;
    username: string;
    avatarUrl: string;
  };
  attachments?: Attachment[];
  reactions?: Reaction[];
  _count?: { replies: number };
}

interface MessageListProps {
  messages: Message[];
  activeTypingUsernames: string[];
  onOpenThread: (message: Message) => void;
  onReplyMessage?: (message: Message) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

// Helper to convert @username mentions to markdown badge links
const processMentions = (text: string) => {
  return text.replace(/@([a-zA-Z0-9_-]+)/g, '`@$1`');
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  activeTypingUsernames,
  onOpenThread,
  onReplyMessage,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
}) => {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [lightboxGallery, setLightboxGallery] = useState<{
    images: { url: string; name: string }[];
    index: number;
  } | null>(null);
  const [previewPdf, setPreviewPdf] = useState<{ url: string; name: string } | null>(null);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const EMOJI_OPTIONS = ['👍', '❤️', '🚀', '🎉', '🔥', '👀', '💡'];
  const timePattern = settings.timeFormat === '24-hour' ? 'HH:mm' : 'h:mm a';

  // Auto-scroll to bottom on message list update if autoScrollOnMessage setting is enabled
  useEffect(() => {
    if (settings.autoScrollOnMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, activeTypingUsernames.length, settings.autoScrollOnMessage]);

  const handleStartEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = (msgId: string) => {
    if (editContent.trim()) {
      onEditMessage(msgId, editContent);
    }
    setEditingId(null);
  };

  const copyCodeToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const scrollToMessage = (targetId: string) => {
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(targetId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50 dark:bg-slate-950 font-sans">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2 select-none">
          <MessageSquare className="w-12 h-12 stroke-[1.5] text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No messages in this channel yet</p>
          <p className="text-xs text-slate-500">Be the first to start the conversation!</p>
        </div>
      ) : (
        messages.map((msg, idx) => {
          const isSender = msg.senderId === user?.id;
          const isBot = msg.sender?.username?.startsWith('bot_');
          const isEditing = editingId === msg.id;
          const isPickerActive = activeReactionPickerMessageId === msg.id;
          const popoverVerticalClass = idx < 2 ? 'top-full mt-2' : 'bottom-full mb-2';

          // Group reactions by emoji
          const reactionCounts: Record<string, { count: number; userIds: string[]; hasReacted: boolean }> = {};
          (msg.reactions || []).forEach((r) => {
            if (!reactionCounts[r.emoji]) {
              reactionCounts[r.emoji] = { count: 0, userIds: [], hasReacted: false };
            }
            reactionCounts[r.emoji].count++;
            reactionCounts[r.emoji].userIds.push(r.userId);
            if (r.userId === user?.id) {
              reactionCounts[r.emoji].hasReacted = true;
            }
          });

          return (
            <div
              id={`msg-${msg.id}`}
              key={msg.id}
              className={`group relative flex gap-3 items-start max-w-[85%] md:max-w-[78%] transition-all duration-300 rounded-2xl p-1 ${
                isPickerActive ? 'z-40' : 'z-0'
              } ${
                highlightedMessageId === msg.id ? 'ring-2 ring-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20' : ''
              } ${isSender ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Sender Avatar */}
              <img
                src={
                  msg.sender?.avatarUrl ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender?.username || 'user'}`
                }
                alt={msg.sender?.username || 'User'}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover bg-slate-200 dark:bg-slate-800 flex-shrink-0 mt-0.5 shadow-sm"
              />

              <div className={`flex flex-col min-w-0 ${isSender ? 'items-end' : 'items-start'}`}>
                {/* Header info */}
                <div className={`flex items-center gap-2 mb-1 text-xs select-none ${isSender ? 'flex-row-reverse' : ''}`}>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {isSender ? 'You' : msg.sender?.username || 'Deleted User'}
                  </span>
                  {isBot && (
                    <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold rounded uppercase tracking-wider border border-indigo-200 dark:border-indigo-500/20">
                      BOT
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {format(new Date(msg.createdAt), timePattern)}
                  </span>
                  {msg.editedAt && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">(edited)</span>
                  )}
                </div>

                {/* Message Bubble Container */}
                <div
                  className={`relative p-3.5 rounded-2xl shadow-sm text-sm ${
                    isSender
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-tl-none'
                  }`}
                >
                  {/* Telegram Quoted Reply Card */}
                  {msg.parent && (
                    <div
                      onClick={() => scrollToMessage(msg.parent!.id)}
                      className={`mb-2 p-2 rounded-xl cursor-pointer border-l-4 text-xs select-none transition-all ${
                        isSender
                          ? 'bg-indigo-700/60 border-indigo-300 text-indigo-100 hover:bg-indigo-700'
                          : 'bg-slate-100 dark:bg-slate-800/80 border-indigo-500 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-[11px] text-indigo-300 dark:text-indigo-400 mb-0.5 flex items-center gap-1">
                        <Reply className="w-3 h-3 inline" />
                        <span>{msg.parent.sender?.username || 'User'}</span>
                      </div>
                      <div className="truncate text-xs opacity-90 italic">
                        {msg.parent.content}
                      </div>
                    </div>
                  )}
                  {isEditing ? (
                    <div className="space-y-2 min-w-[220px]">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(msg.id)}
                          className="px-3 py-1 bg-white text-indigo-600 font-semibold rounded text-xs hover:bg-slate-100"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-indigo-700 text-white rounded text-xs hover:bg-indigo-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`leading-relaxed prose max-w-none text-sm ${
                      isSender ? 'prose-invert text-white' : 'dark:prose-invert text-slate-900 dark:text-slate-100'
                    }`}>
                      <ReactMarkdown
                        components={{
                          a({ href, children }) {
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={
                                  isSender
                                    ? 'text-cyan-200 font-semibold underline hover:text-white transition-colors inline-flex items-center gap-0.5'
                                    : 'text-indigo-600 dark:text-indigo-400 font-semibold underline hover:text-indigo-500 transition-colors inline-flex items-center gap-0.5'
                                }
                              >
                                {children}
                                <ExternalLink className="w-3 h-3 inline ml-0.5" />
                              </a>
                            );
                          },
                          code({ inline, className, children }: any) {
                            const codeString = String(children).replace(/\n$/, '');
                            const match = /language-(\w+)/.exec(className || '');
                            const isMention = codeString.startsWith('@');

                            if (isMention) {
                              return (
                                <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 font-bold text-xs border border-indigo-500/30 inline-flex items-center gap-0.5">
                                  {codeString}
                                </span>
                              );
                            }

                            if (!inline || codeString.includes('\n')) {
                              return (
                                <div className="my-2 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs shadow-lg text-left">
                                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                                    <span className="uppercase font-bold text-amber-400">{match ? match[1] : 'code'}</span>
                                    <button
                                      onClick={() => copyCodeToClipboard(codeString, `${msg.id}-${codeString.substring(0, 8)}`)}
                                      className="hover:text-white flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition-colors"
                                    >
                                      {copiedCodeId === `${msg.id}-${codeString.substring(0, 8)}` ? (
                                        <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Copied!</span>
                                      ) : (
                                        <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</span>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="p-3.5 overflow-x-auto text-emerald-400 font-mono leading-relaxed bg-slate-950/90">
                                    <code>{codeString}</code>
                                  </pre>
                                </div>
                              );
                            }

                            return (
                              <code className="px-1.5 py-0.5 rounded-md bg-slate-800 text-amber-300 font-mono text-xs border border-slate-700/80">
                                {children}
                              </code>
                            );
                          },
                          blockquote({ children }) {
                            return (
                              <blockquote className="border-l-4 border-indigo-400 dark:border-indigo-500 pl-3 my-2 italic text-slate-700 dark:text-slate-300">
                                {children}
                              </blockquote>
                            );
                          },
                        }}
                      >
                        {processMentions(msg.content)}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Rich Attachments (Voice Notes, Photos, Videos, Documents) */}
                  {msg.attachments && msg.attachments.length > 0 && (() => {
                    const imgAtts = msg.attachments.filter((a) => a.mimeType?.startsWith('image/'));
                    const otherAtts = msg.attachments.filter((a) => !a.mimeType?.startsWith('image/'));
                    const galleryImages = imgAtts.map((a) => ({ url: a.fileUrl, name: a.fileName }));

                    return (
                      <div className="mt-2.5 space-y-2 max-w-full overflow-hidden">
                        {/* Telegram-style Image Grid */}
                        {imgAtts.length > 0 && (
                          <div className="my-1.5 max-w-xs md:max-w-md select-none">
                            {imgAtts.length === 1 ? (
                              <div
                                onClick={() => setLightboxGallery({ images: galleryImages, index: 0 })}
                                className="group/img relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md cursor-pointer"
                              >
                                <img
                                  src={imgAtts[0].fileUrl}
                                  alt={imgAtts[0].fileName}
                                  className="max-h-72 w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white gap-2">
                                  <ZoomIn className="w-5 h-5" />
                                  <span className="text-xs font-semibold">View Photo</span>
                                </div>
                              </div>
                            ) : imgAtts.length === 2 ? (
                              <div className="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden shadow-md">
                                {imgAtts.map((att, i) => (
                                  <div
                                    key={att.id}
                                    onClick={() => setLightboxGallery({ images: galleryImages, index: i })}
                                    className="group/img relative overflow-hidden h-44 cursor-pointer bg-slate-800"
                                  >
                                    <img
                                      src={att.fileUrl}
                                      alt={att.fileName}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white gap-1">
                                      <ZoomIn className="w-4 h-4" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : imgAtts.length === 3 ? (
                              <div className="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden shadow-md">
                                <div
                                  onClick={() => setLightboxGallery({ images: galleryImages, index: 0 })}
                                  className="group/img relative overflow-hidden h-52 cursor-pointer bg-slate-800"
                                >
                                  <img
                                    src={imgAtts[0].fileUrl}
                                    alt={imgAtts[0].fileName}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5 h-52">
                                  {imgAtts.slice(1, 3).map((att, i) => (
                                    <div
                                      key={att.id}
                                      onClick={() => setLightboxGallery({ images: galleryImages, index: i + 1 })}
                                      className="group/img relative flex-1 overflow-hidden cursor-pointer bg-slate-800"
                                    >
                                      <img
                                        src={att.fileUrl}
                                        alt={att.fileName}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              /* 4+ Photos Telegram Grid */
                              <div className="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden shadow-md">
                                {imgAtts.slice(0, 4).map((att, i) => {
                                  const isFourth = i === 3 && imgAtts.length > 4;
                                  const extraCount = imgAtts.length - 4;

                                  return (
                                    <div
                                      key={att.id}
                                      onClick={() => setLightboxGallery({ images: galleryImages, index: i })}
                                      className="group/img relative overflow-hidden h-36 cursor-pointer bg-slate-800"
                                    >
                                      <img
                                        src={att.fileUrl}
                                        alt={att.fileName}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                                      />
                                      {isFourth ? (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white font-bold text-lg">
                                          +{extraCount + 1}
                                        </div>
                                      ) : (
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                          <ZoomIn className="w-4 h-4" />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Non-image attachments (Audio, Video, Files) */}
                        {otherAtts.map((att) => {
                          const isVid = att.mimeType?.startsWith('video/');
                          const isAud = att.mimeType?.startsWith('audio/');
                          const isPdf = att.mimeType?.includes('pdf') || att.fileName.endsWith('.pdf');
                          const isCode = att.mimeType?.includes('json') || att.mimeType?.includes('javascript') || att.fileName.endsWith('.js') || att.fileName.endsWith('.ts');
                          const isZip = att.mimeType?.includes('zip') || att.mimeType?.includes('tar') || att.fileName.endsWith('.zip');

                          if (isAud) {
                            return <VoicePlayer key={att.id} url={att.fileUrl} isSender={isSender} />;
                          }

                          if (isVid) {
                            return (
                              <div
                                key={att.id}
                                onClick={() => setPreviewVideo({ url: att.fileUrl, name: att.fileName })}
                                className="group/vid relative my-1 overflow-hidden rounded-2xl border border-slate-700/50 shadow-md cursor-pointer bg-black max-w-xs md:max-w-md"
                              >
                                <video
                                  src={att.fileUrl}
                                  className="max-h-72 w-full object-cover rounded-2xl"
                                />
                                <div className="absolute inset-0 bg-black/40 group-hover/vid:bg-black/20 transition-colors flex items-center justify-center text-white gap-2">
                                  <div className="p-3 bg-indigo-600/90 rounded-full shadow-lg group-hover/vid:scale-110 transition-transform">
                                    <Play className="w-6 h-6 ml-0.5" />
                                  </div>
                                </div>
                                <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 bg-black/60 backdrop-blur-xs rounded-xl text-white text-[11px] font-semibold truncate">
                                  {att.fileName}
                                </div>
                              </div>
                            );
                          }

                          if (isPdf) {
                            return (
                              <div
                                key={att.id}
                                onClick={() => setPreviewPdf({ url: att.fileUrl, name: att.fileName })}
                                className={`flex items-center gap-3 p-3 rounded-2xl border my-1 transition-all cursor-pointer hover:scale-[1.01] ${
                                  isSender
                                    ? 'bg-rose-900/40 hover:bg-rose-900/60 border-rose-500/40 text-white'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-rose-400'
                                }`}
                              >
                                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl flex-shrink-0 border border-rose-500/30">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate">{att.fileName}</p>
                                  <p className="text-[10px] opacity-70 font-mono">
                                    {formatBytes(att.fileSize)} • Click to Preview PDF
                                  </p>
                                </div>
                                <Eye className="w-4 h-4 flex-shrink-0 opacity-70 hover:opacity-100" />
                              </div>
                            );
                          }

                          // Document & Generic File Card
                          return (
                            <a
                              key={att.id}
                              href={att.fileUrl}
                              download={att.fileName}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-3 p-3 rounded-2xl border my-1 transition-all hover:scale-[1.01] ${
                                isSender
                                  ? 'bg-indigo-700/60 hover:bg-indigo-700/80 border-indigo-500/50 text-white'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-400'
                              }`}
                            >
                              <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 flex-shrink-0">
                                {isCode ? <FileCode className="w-5 h-5" /> : isZip ? <FileArchive className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{att.fileName}</p>
                                <p className="text-[10px] opacity-70 font-mono">{formatBytes(att.fileSize)}</p>
                              </div>
                              <Download className="w-4 h-4 flex-shrink-0 opacity-70 hover:opacity-100" />
                            </a>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Full Reaction Picker Popover */}
                  {activeReactionPickerMessageId === msg.id && (
                    <>
                      {/* Transparent backdrop to dismiss reaction picker when clicking outside */}
                      <div
                        className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20"
                        onClick={() => setActiveReactionPickerMessageId(null)}
                      />
                      <div className={`absolute z-50 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 ${
                        isSender ? 'right-0' : 'left-0'
                      } ${popoverVerticalClass}`}>
                        <EmojiPicker
                          theme={Theme.AUTO}
                          onEmojiClick={(emojiData) => {
                            onToggleReaction(msg.id, emojiData.emoji);
                            setActiveReactionPickerMessageId(null);
                          }}
                          lazyLoadEmojis={true}
                          searchPlaceHolder="Search all reaction emojis..."
                          width={window.innerWidth < 480 ? 280 : 320}
                          height={340}
                        />
                      </div>
                    </>
                  )}

                  {/* Action Toolbar on Hover */}
                  <div
                    className={`absolute hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-lg z-10 -top-4 ${
                      isSender ? 'right-0' : 'left-0'
                    }`}
                  >
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => onToggleReaction(msg.id, emoji)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-sm transition-transform active:scale-125 text-slate-800 dark:text-slate-200"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      onClick={() => setActiveReactionPickerMessageId(activeReactionPickerMessageId === msg.id ? null : msg.id)}
                      title="More reactions (All internet emojis)..."
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-500 transition-colors"
                    >
                      <SmilePlus className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 my-auto mx-0.5" />
                    {onReplyMessage && (
                      <button
                        onClick={() => onReplyMessage(msg)}
                        title="Reply to specific message (Telegram style)"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onOpenThread(msg)}
                      title="Reply in thread"
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    {isSender && (
                      <>
                        <button
                          onClick={() => handleStartEdit(msg)}
                          title="Edit message"
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteMessage(msg.id)}
                          title="Delete message"
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Reactions */}
                {Object.keys(reactionCounts).length > 0 && (
                  <div className={`flex flex-wrap gap-1.5 mt-1.5 ${isSender ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(reactionCounts).map(([emoji, data]) => (
                      <button
                        key={emoji}
                        onClick={() => onToggleReaction(msg.id, emoji)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border ${
                          data.hasReacted
                            ? 'bg-indigo-100 dark:bg-indigo-600/30 border-indigo-300 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="font-semibold text-[11px]">{data.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Thread Replies Button */}
                {msg._count && msg._count.replies > 0 && (
                  <button
                    onClick={() => onOpenThread(msg)}
                    className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{msg._count.replies} {msg._count.replies === 1 ? 'reply' : 'replies'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Typing indicator */}
      {activeTypingUsernames.length > 0 && (
        <div className="text-xs text-slate-500 dark:text-slate-400 italic flex items-center gap-2 pt-2 px-2 select-none">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
          <span>{activeTypingUsernames.join(', ')} {activeTypingUsernames.length === 1 ? 'is' : 'are'} typing...</span>
        </div>
      )}

      {/* Anchor element for auto-scrolling to bottom */}
      <div ref={messagesEndRef} />

      {/* Interactive Image Lightbox Modal with Gallery Navigation */}
      {lightboxGallery && (
        <ImageLightboxModal
          images={lightboxGallery.images}
          initialIndex={lightboxGallery.index}
          onClose={() => setLightboxGallery(null)}
        />
      )}

      {/* PDF Document Preview Modal */}
      {previewPdf && (
        <PdfPreviewModal
          url={previewPdf.url}
          name={previewPdf.name}
          onClose={() => setPreviewPdf(null)}
        />
      )}

      {/* Video Player Lightbox Modal */}
      {previewVideo && (
        <VideoLightboxModal
          url={previewVideo.url}
          name={previewVideo.name}
          onClose={() => setPreviewVideo(null)}
        />
      )}
    </div>
  );
};
