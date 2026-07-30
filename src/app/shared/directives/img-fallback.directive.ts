import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: 'img[appImgFallback]',
  standalone: true
})
export class ImgFallbackDirective {
  // Neutral grey circle avatar as data URI — no external file dependency
  @Input() appImgFallback =
    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%23E2E8F0'/%3E%3Ccircle cx='60' cy='46' r='20' fill='%23CBD5E1'/%3E%3Cellipse cx='60' cy='96' rx='32' ry='24' fill='%23CBD5E1'/%3E%3C/svg%3E`;

  constructor(private el: ElementRef<HTMLImageElement>) {}

  @HostListener('error')
  onError(): void {
    const img = this.el.nativeElement;
    if (img.src !== this.appImgFallback) {
      img.src = this.appImgFallback;
    }
  }
}
