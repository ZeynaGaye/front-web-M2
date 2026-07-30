import {
  Component, OnInit, OnChanges, OnDestroy, Input, Output, EventEmitter,
  inject, ChangeDetectorRef, ChangeDetectionStrategy
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService, Notification } from '../../services/notification/notification.service';

const MAX_VISIBLE = 6;

@Component({
  selector: 'app-notification-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="np">

      <!-- ─── HEADER ─── -->
      <div class="np__head">
        <div class="np__head-left">
          <span class="np__bell-wrap">
            <mat-icon class="np__bell-ico">notifications</mat-icon>
          </span>
          <span class="np__title">Notifications</span>
          <span class="np__badge" *ngIf="unreadList.length">{{ unreadList.length }}</span>
        </div>
        <button class="np__readall" *ngIf="unreadList.length" (click)="markAllAsRead()">
          Tout lire
        </button>
      </div>

      <!-- ─── LIST ─── -->
      <div class="np__body">
        <ng-container *ngIf="visibleItems.length; else empty">
          <div class="np__item"
               *ngFor="let n of visibleItems; let i = index"
               [class.np__item--leaving]="leavingId === n.id"
               [style.--delay]="(i * 55) + 'ms'"
               (click)="onItemClick(n)">

            <!-- type strip -->
            <span class="np__strip" [ngClass]="getStripClass(n)"></span>

            <!-- icon -->
            <div class="np__ico" [ngClass]="getStripClass(n)">
              <mat-icon>{{ getIcon(n) }}</mat-icon>
            </div>

            <!-- text -->
            <div class="np__text">
              <p class="np__msg">{{ n.message }}</p>
              <span class="np__when">{{ timeAgo(n.dateNotif) }}</span>
            </div>

            <!-- chevron -->
            <mat-icon class="np__chevron">chevron_right</mat-icon>
          </div>

          <!-- overflow hint -->
          <div class="np__more" *ngIf="unreadList.length > MAX_VISIBLE">
            +{{ unreadList.length - MAX_VISIBLE }} autres
          </div>
        </ng-container>

        <ng-template #empty>
          <div class="np__empty">
            <div class="np__empty-ring">
              <mat-icon>notifications_none</mat-icon>
            </div>
            <p class="np__empty-title">Tout est à jour</p>
            <p class="np__empty-sub">Aucune nouvelle notification</p>
          </div>
        </ng-template>
      </div>

      <!-- ─── FOOTER ─── -->
      <div class="np__foot" *ngIf="unreadList.length">
        <button class="np__foot-btn" (click)="viewAll()">
          Voir toutes les notifications
          <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>

    </div>
  `,
  styles: [`
    /* ── fix mat-menu overflow ── */
    ::ng-deep .mat-mdc-menu-panel {
      max-width: 460px !important;
      overflow: hidden !important;
      border-radius: 18px !important;
      box-shadow: 0 8px 32px -4px rgba(0,0,0,.18) !important;
    }
    ::ng-deep .mat-mdc-menu-content { padding: 0 !important; }

    :host { display: block; }

    /* ═══ PANEL ═══════════════════════════════ */
    .np {
      width: 420px;
      background: #fff;
      border-radius: 18px;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      overflow: hidden;
      animation: npIn .32s cubic-bezier(.16,1,.3,1) both;
    }

    @keyframes npIn {
      from { opacity: 0; transform: translateY(-12px) scale(.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ═══ HEADER ══════════════════════════════ */
    .np__head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
    }
    .np__head-left { display: flex; align-items: center; gap: 8px; }

    .np__bell-wrap {
      width: 30px; height: 30px; border-radius: 9px;
      background: rgba(212,115,90,.10);
      display: flex; align-items: center; justify-content: center;
    }
    .np__bell-ico {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      color: #D4735A;
    }
    .np__title {
      font-size: .82rem; font-weight: 700; color: #111; letter-spacing: -.02em;
    }
    .np__badge {
      background: #D4735A; color: #fff;
      font-size: .62rem; font-weight: 700; letter-spacing: .01em;
      border-radius: 99px; padding: 1px 7px; line-height: 1.8;
      animation: badgePop .3s cubic-bezier(.34,1.56,.64,1) both;
    }
    @keyframes badgePop {
      from { transform: scale(0); } to { transform: scale(1); }
    }

    .np__readall {
      background: none; border: none; cursor: pointer; font-family: inherit;
      font-size: .73rem; font-weight: 600; color: #D4735A;
      padding: 5px 10px; border-radius: 8px;
      transition: background .14s;
    }
    .np__readall:hover { background: rgba(212,115,90,.08); }
    .np__readall:active { background: rgba(212,115,90,.15); }

    /* ═══ BODY ════════════════════════════════ */
    .np__body { overflow: hidden; }

    /* ═══ ITEM ════════════════════════════════ */
    .np__item {
      position: relative;
      display: flex; align-items: center; gap: 12px;
      padding: 13px 16px 13px 22px;
      border-bottom: 1px solid #f4f4f4;
      cursor: pointer;
      transition: background .15s ease;
      animation: itemIn .38s cubic-bezier(.16,1,.3,1) var(--delay, 0ms) both;
    }
    .np__item:last-child { border-bottom: none; }
    .np__item:hover { background: #fafafa; }
    .np__item:hover .np__ico { transform: scale(1.08) rotate(-3deg); }
    .np__item:hover .np__chevron { transform: translateX(3px); opacity: 1; }
    .np__item:active { background: #f5f4f2; transform: scale(.994); }
    .np__item--leaving {
      animation: itemOut .22s cubic-bezier(.4,0,1,1) forwards !important;
    }

    @keyframes itemIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes itemOut {
      to { opacity: 0; transform: translateX(-24px); max-height: 0; padding: 0; }
    }

    /* left strip */
    .np__strip {
      position: absolute; left: 0; top: 12px; bottom: 12px;
      width: 3.5px; border-radius: 0 3px 3px 0;
    }
    .np__strip.coral   { background: #D4735A; }
    .np__strip.success { background: #22c55e; }
    .np__strip.warn    { background: #f59e0b; }
    .np__strip.slate   { background: #6E8492; }
    .np__strip.purple  { background: #8b5cf6; }

    /* icon */
    .np__ico {
      flex-shrink: 0;
      width: 36px; height: 36px; border-radius: 11px;
      display: flex; align-items: center; justify-content: center;
      transition: transform .22s cubic-bezier(.34,1.56,.64,1);
    }
    .np__ico mat-icon {
      font-size: 17px !important; width: 17px !important; height: 17px !important;
    }
    .np__ico.coral   { background: rgba(212,115,90,.10); }
    .np__ico.coral mat-icon   { color: #D4735A; }
    .np__ico.success { background: rgba(34,197,94,.10); }
    .np__ico.success mat-icon { color: #16a34a; }
    .np__ico.warn    { background: rgba(245,158,11,.10); }
    .np__ico.warn mat-icon    { color: #d97706; }
    .np__ico.slate   { background: rgba(110,132,146,.10); }
    .np__ico.slate mat-icon   { color: #6E8492; }
    .np__ico.purple  { background: rgba(139,92,246,.10); }
    .np__ico.purple mat-icon  { color: #7c3aed; }

    /* text */
    .np__text { flex: 1; min-width: 0; }
    .np__msg {
      margin: 0 0 3px;
      font-size: .795rem; font-weight: 600; color: #111; line-height: 1.4;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .np__when { font-size: .68rem; color: #aaa; font-weight: 500; }

    /* chevron */
    .np__chevron {
      flex-shrink: 0;
      font-size: 17px !important; width: 17px !important; height: 17px !important;
      color: #ccc; opacity: 0;
      transition: transform .18s ease, opacity .18s ease;
    }

    /* overflow hint */
    .np__more {
      text-align: center; font-size: .72rem; color: #bbb;
      padding: 8px; border-top: 1px solid #f4f4f4;
    }

    /* ═══ EMPTY ═══════════════════════════════ */
    .np__empty {
      display: flex; flex-direction: column; align-items: center;
      padding: 40px 20px 36px;
      animation: npIn .3s cubic-bezier(.16,1,.3,1) both;
    }
    .np__empty-ring {
      width: 56px; height: 56px; border-radius: 50%;
      background: #f5f5f5;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 14px;
    }
    .np__empty-ring mat-icon {
      font-size: 26px !important; width: 26px !important; height: 26px !important;
      color: #ddd;
    }
    .np__empty-title { margin: 0 0 4px; font-size: .84rem; font-weight: 700; color: #888; }
    .np__empty-sub   { margin: 0; font-size: .73rem; color: #bbb; }

    /* ═══ FOOTER ══════════════════════════════ */
    .np__foot {
      border-top: 1px solid #f0f0f0;
      background: #fafafa;
    }
    .np__foot-btn {
      display: flex; align-items: center; justify-content: center; gap: 4px;
      width: 100%; padding: 12px 16px;
      background: none; border: none; cursor: pointer; font-family: inherit;
      font-size: .78rem; font-weight: 600; color: #D4735A;
      transition: background .14s, gap .18s;
    }
    .np__foot-btn mat-icon {
      font-size: 15px !important; width: 15px !important; height: 15px !important;
      transition: transform .18s cubic-bezier(.34,1.56,.64,1);
    }
    .np__foot-btn:hover { background: rgba(212,115,90,.05); gap: 8px; }
    .np__foot-btn:hover mat-icon { transform: translateX(3px); }
    .np__foot-btn:active { background: rgba(212,115,90,.1); }
  `]
})
export class NotificationListComponent implements OnInit, OnChanges, OnDestroy {
  @Input() notifications: Notification[] = [];
  @Input() userRole: string = '';
  @Output() notificationRead  = new EventEmitter<void>();
  @Output() notificationClicked = new EventEmitter<Notification>();

  unreadList: Notification[] = [];
  visibleItems: Notification[] = [];
  leavingId: number | null = null;
  MAX_VISIBLE = MAX_VISIBLE;

  private notifService = inject(NotificationService);
  private router        = inject(Router);
  private cdr           = inject(ChangeDetectorRef);
  private liveSub?: Subscription;

  ngOnInit(): void {
    this.refresh();
    // Écouter les notifications temps réel et les prépendre à la liste
    this.liveSub = this.notifService.liveNotification$.subscribe((dto: any) => {
      const live: Notification = {
        id: dto.id,
        message: dto.message,
        vue: false,
        dateNotif: dto.dateNotif ?? new Date().toISOString(),
        reservation: dto.reservation ? {
          id: dto.reservation.id,
          dateReservation: dto.reservation.dateReservation,
          serviceSalon: dto.reservation.serviceName ? { nom: dto.reservation.serviceName } : undefined
        } : null as any
      };
      this.notifications = [live, ...this.notifications];
      this.refresh();
      this.cdr.markForCheck();
    });
  }

  ngOnChanges(): void { this.refresh(); }

  ngOnDestroy(): void { this.liveSub?.unsubscribe(); }

  private refresh(): void {
    this.unreadList   = this.notifications.filter(n => !n.vue);
    this.visibleItems = this.unreadList.slice(0, MAX_VISIBLE);
  }

  onItemClick(n: Notification): void {
    this.leavingId = n.id;
    this.cdr.markForCheck();

    setTimeout(() => {
      this.notifService.markAsRead(n.id).subscribe(() => {
        n.vue = true;
        this.leavingId = null;
        this.refresh();
        this.cdr.markForCheck();
        this.notificationRead.emit();
        this.notificationClicked.emit(n);
        this.navigateTo(n);
      });
    }, 200); // wait for leave animation
  }

  markAllAsRead(): void {
    this.notifService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => (n.vue = true));
      this.refresh();
      this.cdr.markForCheck();
      this.notificationRead.emit();
    });
  }

  viewAll(): void {
    this.notificationClicked.emit(undefined as any);
  }

  private navigateTo(n: Notification): void {
    const msg = n.message.toLowerCase();
    if (msg.includes('offre') && !msg.includes('réservation')) {
      this.router.navigate(['/freelance/opportunites-emploi']);
    } else if (msg.includes('candidature')) {
      this.router.navigate(['/employeur/home']);
    } else if (n.reservation?.id || msg.includes('réservation') || msg.includes('reservation') || msg.includes('rappel') || msg.includes('rdv')) {
      // Navigate based on role
      const role = this.userRole?.toLowerCase();
      if (role === 'client')    this.router.navigate(['/client/dashboard']);
      else if (role === 'freelance') this.router.navigate(['/freelance/home']);
      else if (role === 'employeur') this.router.navigate(['/employeur/home']);
    }
  }

  getIcon(n: Notification): string {
    const msg = n.message.toLowerCase();
    if (msg.includes('annul'))                               return 'cancel';
    if (msg.includes('termin'))                              return 'check_circle';
    if (msg.includes('rappel') || msg.includes('rdv'))       return 'schedule';
    if (msg.includes('réservation') || msg.includes('reservation')) return 'event';
    if (msg.includes('offre'))                               return 'work_outline';
    if (msg.includes('candidature') && msg.includes('accepté')) return 'thumb_up';
    if (msg.includes('candidature') && msg.includes('refusé'))  return 'thumb_down';
    if (msg.includes('candidature'))                         return 'assignment_ind';
    return 'circle_notifications';
  }

  getStripClass(n: Notification): string {
    const msg = n.message.toLowerCase();
    if (msg.includes('annul'))          return 'warn';
    if (msg.includes('termin') || msg.includes('accepté')) return 'success';
    if (msg.includes('refusé'))         return 'warn';
    if (msg.includes('offre'))          return 'purple';
    if (msg.includes('candidature'))    return 'slate';
    return 'coral';
  }

  timeAgo(raw: string): string {
    const diff = Date.now() - new Date(raw).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1)  return "À l'instant";
    if (m < 60) return `Il y a ${m}m`;
    if (h < 24) return `Il y a ${h}h`;
    if (d === 1) return 'Hier';
    if (d < 7)  return `Il y a ${d}j`;
    return new Date(raw).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}
