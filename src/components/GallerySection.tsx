import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Maximize2, 
  X, 
  Calendar, 
  Layers, 
  ChevronRight,
  Camera,
  Image as ImageIcon,
  Play,
  Pause,
  Sliders,
  Grid,
  Orbit,
  Trash2,
  Plus,
  Shield
} from 'lucide-react';
import { fetchPhotosApi, deletePhotoApi } from '../services/api';

export interface GalleryPhoto {
  id: string;
  url: string;
  title: string;
  category: string;
  uploadedAt: string;
}

const CURATED_DEFAULT_PHOTOS: GalleryPhoto[] = [
  {
    id: 'symp-1',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
    title: 'Inaugural Keynote & National Tech Symposium Hall',
    category: 'Symposium Highlights',
    uploadedAt: '2026-10-10T09:30:00Z'
  },
  {
    id: 'symp-2',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80',
    title: 'Coding Sprints & Flaghunt 24H Cyber CTF Arena',
    category: 'Technical Events',
    uploadedAt: '2026-10-11T14:15:00Z'
  },
  {
    id: 'symp-3',
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&auto=format&fit=crop&q=80',
    title: 'Hardware Expo & IoT Autonomous Robotics Prototype',
    category: 'Expo & Projects',
    uploadedAt: '2026-10-12T11:45:00Z'
  },
  {
    id: 'symp-4',
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&auto=format&fit=crop&q=80',
    title: 'IEEE Distinguished Faculty & Chief Guest Address',
    category: 'Guest Dignitaries',
    uploadedAt: '2026-10-12T16:00:00Z'
  },
  {
    id: 'symp-5',
    url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1200&auto=format&fit=crop&q=80',
    title: 'Innovrush Grand Finale Project Presentation & Jury Defense',
    category: 'Technical Events',
    uploadedAt: '2026-10-13T10:20:00Z'
  },
  {
    id: 'symp-6',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80',
    title: 'Grand Award Felicitation & Valedictory Ceremony',
    category: 'Symposium Highlights',
    uploadedAt: '2026-10-13T17:30:00Z'
  },
  {
    id: 'symp-7',
    url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&auto=format&fit=crop&q=80',
    title: 'Technical Panel Discussion & Emerging Tech Fireside',
    category: 'Guest Dignitaries',
    uploadedAt: '2026-10-13T14:40:00Z'
  },
  {
    id: 'symp-8',
    url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80',
    title: 'Code Genesis Live Hackathon Showdown & Mentorship',
    category: 'Technical Events',
    uploadedAt: '2026-10-14T11:00:00Z'
  }
];

const CATEGORIES = [
  'All Moments',
  'Symposium Highlights',
  'Technical Events',
  'Expo & Projects',
  'Guest Dignitaries',
  'Campus & Venue'
];

interface GallerySectionProps {
  onOpenAdmin?: (tab?: 'registrations' | 'manual' | 'status' | 'photos' | 'settings') => void;
  isAdmin?: boolean;
}

export const GallerySection: React.FC<GallerySectionProps> = ({ onOpenAdmin, isAdmin: propIsAdmin }) => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>(CURATED_DEFAULT_PHOTOS);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Moments');
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<GalleryPhoto | null>(null);
  const [isMarqueePaused, setIsMarqueePaused] = useState<boolean>(false);
  const [marqueeSpeed, setMarqueeSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [viewMode, setViewMode] = useState<'marquee' | 'grid'>('marquee');
  const [isAdminState, setIsAdminState] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('nexusverse_admin_auth') === 'true';
    } catch (e) {
      return false;
    }
  });

  const isAdmin = Boolean(propIsAdmin || isAdminState);

  const loadPhotos = async () => {
    try {
      const fetched = await fetchPhotosApi();
      if (fetched && Array.isArray(fetched) && fetched.length > 0) {
        setPhotos(fetched);
      } else if (fetched && Array.isArray(fetched) && fetched.length === 0) {
        const local = localStorage.getItem('nexusverse_gallery_photos');
        if (local !== null) {
          try {
            setPhotos(JSON.parse(local));
          } catch (e) {
            setPhotos([]);
          }
        } else {
          setPhotos(CURATED_DEFAULT_PHOTOS);
        }
      } else {
        setPhotos(CURATED_DEFAULT_PHOTOS);
      }
    } catch (e) {
      setPhotos(CURATED_DEFAULT_PHOTOS);
    }
  };

  const handleAdminDeletePhoto = async (photoId: string, photoTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) {
      alert('Only administrators can remove images from the symposium gallery.');
      return;
    }
    const confirmed = window.confirm(`Admin Action: Are you sure you want to remove "${photoTitle}" from the symposium gallery?`);
    if (!confirmed) return;

    // Optimistically remove from state & local storage
    const updated = photos.filter(p => p.id !== photoId);
    setPhotos(updated);
    try {
      localStorage.setItem('nexusverse_gallery_photos', JSON.stringify(updated));
    } catch (e) {}

    await deletePhotoApi(photoId);
    window.dispatchEvent(new CustomEvent('nexusverse_photos_updated'));
  };

  useEffect(() => {
    loadPhotos();

    // Listen to real-time update events dispatched by Admin Panel
    const handlePhotosUpdated = () => {
      loadPhotos();
    };

    // Listen to admin authentication state changes
    const handleAuthChanged = (e: any) => {
      if (e?.detail?.isAuthenticated !== undefined) {
        setIsAdminState(Boolean(e.detail.isAuthenticated));
      } else {
        try {
          setIsAdminState(sessionStorage.getItem('nexusverse_admin_auth') === 'true');
        } catch (err) {}
      }
    };

    window.addEventListener('nexusverse_photos_updated', handlePhotosUpdated);
    window.addEventListener('nexusverse_admin_auth_changed', handleAuthChanged);
    window.addEventListener('storage', handleAuthChanged);

    return () => {
      window.removeEventListener('nexusverse_photos_updated', handlePhotosUpdated);
      window.removeEventListener('nexusverse_admin_auth_changed', handleAuthChanged);
      window.removeEventListener('storage', handleAuthChanged);
    };
  }, []);

  const filteredPhotos = selectedCategory === 'All Moments'
    ? photos
    : photos.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());

  // Prepare base list
  const baseList = filteredPhotos.length > 0 ? filteredPhotos : CURATED_DEFAULT_PHOTOS;

  // Split photos into 2 alternating tracks for dual right-to-left streaming
  const track1Base = baseList.filter((_, idx) => idx % 2 === 0);
  const track2Base = baseList.filter((_, idx) => idx % 2 === 1);

  // For a seamless -50% marquee loop, each track needs to repeat exactly twice [A, A]
  // This reduces DOM elements by 50% and completely eliminates GPU memory pressure
  const getLoopItems = (items: GalleryPhoto[]) => {
    if (items.length === 0) return [];
    if (items.length < 4) return [...items, ...items, ...items, ...items];
    return [...items, ...items];
  };

  const track1 = getLoopItems(track1Base.length > 0 ? track1Base : baseList);
  const track2 = getLoopItems(track2Base.length > 0 ? track2Base : baseList);

  // Speed multiplier duration
  const durationTrack1 = marqueeSpeed === 'slow' ? '54s' : marqueeSpeed === 'fast' ? '24s' : '36s';
  const durationTrack2 = marqueeSpeed === 'slow' ? '64s' : marqueeSpeed === 'fast' ? '28s' : '44s';

  return (
    <section 
      id="gallery-section" 
      className="relative py-16 sm:py-24 px-2 sm:px-4 lg:px-8 border-b border-[#2e2b22] bg-[#07070a] overflow-hidden"
    >
      {/* 3D Ambient background lighting (High-performance radial gradients, 0% CPU blur cost) */}
      <div 
        className="absolute top-1/4 left-1/4 w-[36rem] h-[36rem] rounded-full pointer-events-none opacity-40" 
        style={{ background: 'radial-gradient(circle, rgba(212, 169, 53, 0.12) 0%, transparent 70%)' }}
        aria-hidden="true" 
      />
      <div 
        className="absolute bottom-10 right-10 w-[30rem] h-[30rem] rounded-full pointer-events-none opacity-30" 
        style={{ background: 'radial-gradient(circle, rgba(0, 98, 155, 0.15) 0%, transparent 70%)' }}
        aria-hidden="true" 
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(212, 169, 53, 0.15) 1px, transparent 1px)',
          backgroundSize: '36px 36px'
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-3 sm:px-4">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1f1b0e] border border-[#d4a935]/40 text-[#f2c14e] text-xs font-semibold tracking-wider uppercase shadow-inner">
              <Camera className="w-3.5 h-3.5" />
              <span>3D Marquee Stream &bull; Live Event Archive</span>
            </div>
            <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl font-bold text-[#ffffff] tracking-tight">
              Relive the Spirit of NexusVerse
            </h2>
            <p className="text-sm sm:text-base text-[#b9ae94] leading-relaxed">
              Continuous 3D perspective stream of past national symposium memories — national coding sprints, 
              hardware innovation expos, guest addresses, and felicitation ceremonies at NBKRIST.
            </p>
          </div>

          {/* Quick stats & Admin Mode controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isAdmin && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#131318] border border-[#2e2b22] text-xs text-[#a79f8b]">
                <ImageIcon className="w-4 h-4 text-[#f2c14e]" />
                <span>
                  <strong className="text-white font-mono">{photos.length}</strong> Moments Archived
                </span>
              </div>
            )}

            {/* Admin Gallery Management Button / Active Indicator (Only visible if admin is logged in) */}
            {isAdmin && (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1f1b0e] border border-[#d4a935]/50 text-[#f2c14e] text-xs font-semibold shadow-inner">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Mode Active</span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAdmin?.('photos')}
                  className="px-3.5 py-2 rounded-xl bg-[#f2c14e] text-[#1a1300] hover:bg-[#d4a935] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:scale-[1.02]"
                  title="Upload or Add New Image to Gallery (Admin Mode)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Image</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Controls Bar: Category Filter Pills + Marquee Speed & Pause Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-3 sm:px-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#f2c14e] text-[#1a1300] shadow-md shadow-[#f2c14e]/20 font-bold scale-[1.02]'
                      : 'bg-[#131318] border border-[#2e2b22] text-[#a79f8b] hover:text-[#f3ecd9] hover:border-[#a79f8b]/40'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* 3D Marquee Controls: Pause/Play, Speed, and Grid Switcher */}
          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-auto">
            {isAdmin && (
              <>
                {/* Pause/Play Stream Button */}
                <button
                  type="button"
                  onClick={() => setIsMarqueePaused(!isMarqueePaused)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isMarqueePaused 
                      ? 'bg-[#ff8a80]/15 border-[#ff8a80]/40 text-[#ff8a80]' 
                      : 'bg-[#131318] border-[#2e2b22] text-[#f2c14e] hover:border-[#d4a935]/50'
                  }`}
                  title={isMarqueePaused ? 'Resume Right-to-Left 3D Motion' : 'Pause 3D Motion (Hovering any image also freezes it)'}
                >
                  {isMarqueePaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isMarqueePaused ? 'Resume 3D Motion' : 'Pause Motion'}</span>
                </button>

                {/* Speed Selector */}
                <div className="flex items-center p-0.5 rounded-xl bg-[#131318] border border-[#2e2b22] text-[11px]">
                  {(['slow', 'normal', 'fast'] as const).map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setMarqueeSpeed(spd)}
                      className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                        marqueeSpeed === spd
                          ? 'bg-[#f2c14e] text-[#1a1300] shadow-sm'
                          : 'text-[#a79f8b] hover:text-white'
                      }`}
                    >
                      {spd}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* View Switcher: 3D Marquee Stream vs Grid */}
            <div className="flex items-center p-0.5 rounded-xl bg-[#131318] border border-[#2e2b22]">
              <button
                type="button"
                onClick={() => setViewMode('marquee')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewMode === 'marquee'
                    ? 'bg-[#f2c14e] text-[#1a1300]'
                    : 'text-[#a79f8b] hover:text-white'
                }`}
                title="3D Marquee Continuous Stream (Right to Left)"
              >
                <Orbit className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#f2c14e] text-[#1a1300]'
                    : 'text-[#a79f8b] hover:text-white'
                }`}
                title="3D Card Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 3D MARQUEE STREAM CONTAINER ===== */}
      {viewMode === 'marquee' ? (
        <div className="relative mt-8 sm:mt-10 perspective-3d-stage overflow-hidden py-6">
          {/* Edge Vignette Masks for seamless right-to-left emergence and exit */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 z-20 pointer-events-none bg-gradient-to-r from-[#07070a] via-[#07070a]/80 to-transparent" 
            aria-hidden="true" 
          />
          <div 
            className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 z-20 pointer-events-none bg-gradient-to-l from-[#07070a] via-[#07070a]/80 to-transparent" 
            aria-hidden="true" 
          />

          {/* Floating cyber indicator tag */}
          <div className="flex items-center justify-center gap-2 mb-4 text-[11px] font-mono text-[#a79f8b]">
            <span className="w-2 h-2 rounded-full bg-[#f2c14e] animate-ping" />
            <span>STREAMING RIGHT &rarr; LEFT &bull; HOVER ANY CARD TO FREEZE & INSPECT IN 3D</span>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {/* TRACK 1: Moving Right to Left with Isometric 3D Component Angle */}
            <div 
              className={`marquee-track-3d gap-5 sm:gap-7 px-4 ${isMarqueePaused ? 'is-paused' : ''}`}
              style={{ '--marquee-duration': durationTrack1 } as React.CSSProperties}
            >
              {track1.map((photo, idx) => (
                <div
                  key={`t1-${photo.id}-${idx}`}
                  onClick={() => setActiveLightboxPhoto(photo)}
                  className="card-3d-component w-[280px] sm:w-[340px] md:w-[380px] shrink-0 rounded-2xl bg-[#111116] border border-[#2e2b22] hover:border-[#f2c14e] overflow-hidden shadow-xl shadow-black/70 hover:shadow-2xl hover:shadow-[#d4a935]/20 transition-all duration-300 cursor-pointer group select-none"
                >
                  {/* Photo Container */}
                  <div className="relative aspect-[16/10] bg-[#050507] overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = CURATED_DEFAULT_PHOTOS[idx % CURATED_DEFAULT_PHOTOS.length].url;
                      }}
                    />

                    {/* 3D Glass Light Glare / Specular Layer */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    {/* Elevated 3D Category Badge */}
                    <div className="absolute top-3 left-3 z-10 layer-3d-depth transition-transform duration-300">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[#f2c14e] border border-[#d4a935]/40 shadow-lg">
                        {photo.category}
                      </span>
                    </div>

                    {/* 3D Expand & Admin Delete Trigger */}
                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 layer-3d-depth transition-all duration-300 flex items-center gap-1.5">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => handleAdminDeletePhoto(photo.id, photo.title, e)}
                          className="p-1.5 rounded-full bg-[#2a1315]/95 hover:bg-[#3d1a1e] border border-[#ff8a80]/70 text-[#ff8a80] hover:text-[#ffb4ab] backdrop-blur-md shadow-lg cursor-pointer transition-all hover:scale-110"
                          title="Admin: Remove this image from gallery"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="p-1.5 rounded-full bg-black/80 backdrop-blur-md text-[#f2c14e] border border-[#d4a935]/50 shadow-md">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Ambient Vignette Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111116] via-black/25 to-transparent pointer-events-none" />
                  </div>

                  {/* 3D Card Info Bar */}
                  <div className="p-4 bg-[#111116] space-y-2 border-t border-[#2e2b22]/70 layer-3d-depth transition-transform duration-300">
                    <h3 className="font-serif-title text-base sm:text-lg font-bold text-white group-hover:text-[#f2c14e] transition-colors leading-snug line-clamp-1">
                      {photo.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-[#a79f8b]">
                      <span className="flex items-center gap-1.5 text-[11px] font-mono">
                        <Calendar className="w-3 h-3 text-[#d4a935]" />
                        <span>{new Date(photo.uploadedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-[#f2c14e] group-hover:underline">
                        Open 3D Pass &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* TRACK 2: Moving Right to Left with Alternate 3D Tilt Angle for Dynamic Depth Parallax */}
            <div 
              className={`marquee-track-3d gap-5 sm:gap-7 px-4 ${isMarqueePaused ? 'is-paused' : ''}`}
              style={{ '--marquee-duration': durationTrack2 } as React.CSSProperties}
            >
              {track2.map((photo, idx) => (
                <div
                  key={`t2-${photo.id}-${idx}`}
                  onClick={() => setActiveLightboxPhoto(photo)}
                  className="card-3d-component-alt w-[280px] sm:w-[340px] md:w-[380px] shrink-0 rounded-2xl bg-[#111116] border border-[#2e2b22] hover:border-[#f2c14e] overflow-hidden shadow-xl shadow-black/70 hover:shadow-2xl hover:shadow-[#d4a935]/20 transition-all duration-300 cursor-pointer group select-none"
                >
                  {/* Photo Container */}
                  <div className="relative aspect-[16/10] bg-[#050507] overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = CURATED_DEFAULT_PHOTOS[(idx + 1) % CURATED_DEFAULT_PHOTOS.length].url;
                      }}
                    />

                    {/* Specular Glare */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3 z-10 layer-3d-depth transition-transform duration-300">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[#f2c14e] border border-[#d4a935]/40 shadow-lg">
                        {photo.category}
                      </span>
                    </div>

                    {/* Quick Expand & Admin Delete Trigger */}
                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 layer-3d-depth transition-all duration-300 flex items-center gap-1.5">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => handleAdminDeletePhoto(photo.id, photo.title, e)}
                          className="p-1.5 rounded-full bg-[#2a1315]/95 hover:bg-[#3d1a1e] border border-[#ff8a80]/70 text-[#ff8a80] hover:text-[#ffb4ab] backdrop-blur-md shadow-lg cursor-pointer transition-all hover:scale-110"
                          title="Admin: Remove this image from gallery"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="p-1.5 rounded-full bg-black/80 backdrop-blur-md text-[#f2c14e] border border-[#d4a935]/50 shadow-md">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-[#111116] via-black/25 to-transparent pointer-events-none" />
                  </div>

                  {/* Info Bar */}
                  <div className="p-4 bg-[#111116] space-y-2 border-t border-[#2e2b22]/70 layer-3d-depth transition-transform duration-300">
                    <h3 className="font-serif-title text-base sm:text-lg font-bold text-white group-hover:text-[#f2c14e] transition-colors leading-snug line-clamp-1">
                      {photo.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-[#a79f8b]">
                      <span className="flex items-center gap-1.5 text-[11px] font-mono">
                        <Calendar className="w-3 h-3 text-[#d4a935]" />
                        <span>{new Date(photo.uploadedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-[#f2c14e] group-hover:underline">
                        Open 3D Pass &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* FALLBACK: 3D CARD GRID VIEW */
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPhotos.map((photo, idx) => (
              <div
                key={`grid-${photo.id}-${idx}`}
                onClick={() => setActiveLightboxPhoto(photo)}
                className="card-3d-component rounded-2xl bg-[#111116] border border-[#2e2b22] hover:border-[#f2c14e] overflow-hidden shadow-xl hover:shadow-[0_20px_50px_rgba(212,169,53,0.2)] transition-all duration-300 cursor-pointer group flex flex-col"
              >
                <div className="relative aspect-[16/10] bg-[#050507] overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = CURATED_DEFAULT_PHOTOS[idx % CURATED_DEFAULT_PHOTOS.length].url;
                    }}
                  />
                  <div className="absolute top-3 left-3 z-10 layer-3d-depth">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[#f2c14e] border border-[#d4a935]/30">
                      {photo.category}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 layer-3d-depth transition-opacity flex items-center gap-1.5">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => handleAdminDeletePhoto(photo.id, photo.title, e)}
                        className="p-1.5 rounded-full bg-[#2a1315]/95 hover:bg-[#3d1a1e] border border-[#ff8a80]/70 text-[#ff8a80] hover:text-[#ffb4ab] backdrop-blur-md shadow-lg cursor-pointer transition-all hover:scale-110"
                        title="Admin: Remove this image from gallery"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="p-1.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                </div>

                <div className="p-4 bg-[#111116] flex-1 flex flex-col justify-between space-y-2 border-t border-[#2e2b22]/60">
                  <h3 className="font-serif-title text-base sm:text-lg font-bold text-[#ffffff] group-hover:text-[#f2c14e] transition-colors leading-snug line-clamp-2">
                    {photo.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-[#a79f8b] pt-1">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Calendar className="w-3 h-3 text-[#d4a935]" />
                      <span>{new Date(photo.uploadedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </span>
                    <span className="text-[11px] text-[#f2c14e] group-hover:translate-x-0.5 transition-transform font-medium">
                      View Fullsize &nearr;
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FULLSCREEN 3D LIGHTBOX MODAL */}
      {activeLightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200"
          onClick={() => setActiveLightboxPhoto(null)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="relative max-w-5xl w-full max-h-[92vh] flex flex-col items-center bg-[#0d0d12] border border-[#d4a935]/50 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(212,169,53,0.3)] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header Bar */}
            <div className="w-full px-5 py-3.5 border-b border-[#2e2b22] bg-[#131318] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 truncate">
                <span className="text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 shrink-0">
                  {activeLightboxPhoto.category}
                </span>
                <span className="text-sm font-bold text-white truncate">
                  {activeLightboxPhoto.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveLightboxPhoto(null)}
                className="p-1.5 rounded-lg bg-[#1e1e26] text-[#a79f8b] hover:text-white hover:bg-[#2a2a35] transition-colors cursor-pointer shrink-0"
                title="Close Lightbox (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High-res Image Preview */}
            <div className="w-full flex-1 max-h-[75vh] bg-black flex items-center justify-center p-2 sm:p-4 overflow-hidden relative">
              <img
                src={activeLightboxPhoto.url}
                alt={activeLightboxPhoto.title}
                className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
            </div>

            {/* Lightbox Caption Footer */}
            <div className="w-full px-5 py-3 border-t border-[#2e2b22] bg-[#131318] flex flex-wrap items-center justify-between gap-2 text-xs text-[#a79f8b]">
              <p className="text-xs text-[#f3ecd9] font-medium">
                {activeLightboxPhoto.title}
              </p>
              <span className="text-[11px] font-mono">
                Archived: {new Date(activeLightboxPhoto.uploadedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
