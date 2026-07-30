import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PlaceholderImageService {

  private readonly salonPool: string[] = [
    'assets/images/placeholders/salon-coiffure-1.jpg',
    'assets/images/placeholders/salon-manucure.jpg',
    'assets/images/placeholders/salon-produits.jpg',
    'assets/images/placeholders/salon-coiffeur.jpg',
    'assets/images/placeholders/salon-brosse.jpg',
    'assets/images/placeholders/salon-produits-2.jpg',
    // existing project assets
    'assets/images/salon.jpg',
    'assets/images/salon1.jpg',
    'assets/images/ca1.webp',
    'assets/images/ca2.webp',
    'assets/images/ca3.webp',
    'assets/images/ca4.webp',
    'assets/images/ca5.webp',
  ];

  private readonly freelancePool: string[] = [
    'assets/images/placeholders/freelance-tresses.jpg',
    'assets/images/placeholders/freelance-africaine.jpg',
    'assets/images/placeholders/freelance-afro.jpg',
    'assets/images/placeholders/freelance-couleur.jpg',
    'assets/images/placeholders/freelance-coiffure.jpg',
    // existing project assets
    'assets/images/freelances1.jpeg',
    'assets/images/frelances.jpeg',
    'assets/images/ca1.webp',
    'assets/images/ca2.webp',
    'assets/images/ca3.webp',
  ];

  /** Returns a consistent placeholder for a given entity id and type. */
  getPlaceholder(entityId: number | string | null | undefined, type: 'salon' | 'freelance' = 'salon'): string {
    const pool = type === 'freelance' ? this.freelancePool : this.salonPool;
    const id   = typeof entityId === 'string' ? this.hashStr(entityId) : (entityId ?? 0);
    return pool[Math.abs(id as number) % pool.length];
  }

  /** Resolve the best available image URL for an entity, falling back to a placeholder. */
  resolveImage(
    entity: any,
    type: 'salon' | 'freelance' = 'salon',
    backendBase = 'http://localhost:8081'
  ): string {
    const fields = ['photoProfilUrl', 'imageUrl', 'photoProfil', 'photoProfile', 'profileImage', 'photo', 'image', 'url'];
    for (const f of fields) {
      const val: string | undefined = entity?.[f];
      if (val && val.trim()) {
        const resolved = this.toAbsoluteUrl(val.trim(), backendBase);
        if (resolved) return resolved;
      }
    }

    // Photo array (gallery first item) — checks photos, photosSalon, photoUrls
    const photos = entity?.photos ?? entity?.photosSalon ?? entity?.photoUrls;
    if (Array.isArray(photos) && photos.length > 0) {
      const first = photos[0]?.url ?? photos[0];
      if (typeof first === 'string' && first.trim()) {
        const resolved = this.toAbsoluteUrl(first.trim(), backendBase);
        if (resolved) return resolved;
      }
    }

    return this.getPlaceholder(entity?.id, type);
  }

  private toAbsoluteUrl(val: string, base: string): string | null {
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    if (val.startsWith('/uploads/'))  return `${base}${val}`;
    if (val.startsWith('assets/'))    return val;
    // plain filename — only treat as valid if it looks like a UUID-named file
    if (!val.includes('/') && val.match(/^[0-9a-f-]{8,}/i)) {
      return `${base}/uploads/${val}`;
    }
    return null; // reject old/corrupted names like "soleil.jpg"
  }

  private hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
}
