import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { NotificationService, Notification } from '../../services/notification/notification.service';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatBadgeModule
  ],
  template: `
    <div class="notif-panel">
      <!-- Header -->
      <div class="notif-panel-header">
        <span class="notif-panel-title">Notifications</span>
        <button class="mark-all-btn" (click)="markAllAsRead()" *ngIf="unreadList.length > 0">
          Tout marquer comme lu
        </button>
      </div>

      <div class="notif-divider"></div>

      <!-- Liste -->
      <ng-container *ngIf="unreadList.length > 0; else noNotifications">
        <div class="notif-item" *ngFor="let n of unreadList" (click)="markAsRead(n)">
          <div class="notif-icon-circle" [ngClass]="getIconColor(n)">
            <mat-icon>{{ getNotificationIcon(n) }}</mat-icon>
          </div>
          <div class="notif-body">
            <p class="notif-message">{{ n.message }}</p>
            <small class="notif-time">{{ timeAgo(n.dateNotif) }}</small>
          </div>
        </div>
      </ng-container>

      <ng-template #noNotifications>
        <div class="notif-empty">
          <mat-icon>notifications_none</mat-icon>
          <p>Aucune nouvelle notification</p>
        </div>
      </ng-template>

      <div class="notif-divider"></div>

      <!-- Footer -->
      <div class="notif-footer" (click)="notificationClicked.emit(unreadList[0])">
        Voir toutes les notifications
      </div>
    </div>
  `,
  styles: [`
    .notif-panel {
      width: 360px;
      background: #fff;
      border-radius: 16px;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      overflow: hidden;
    }

    .notif-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 18px 14px;
    }
    .notif-panel-title {
      font-size: 1rem;
      font-weight: 700;
      color: #1a1a2e;
    }
    .mark-all-btn {
      background: none;
      border: none;
      color: #F5A393;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      &:hover { text-decoration: underline; }
    }

    .notif-divider {
      height: 1px;
      background: #f0f0f0;
      margin: 0;
    }

    .notif-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .notif-item:hover { background: #fdf8f7; }

    .notif-icon-circle {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .notif-icon-circle mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .notif-icon-circle.blue   { background: rgba(108,99,255,0.1); }
    .notif-icon-circle.blue mat-icon { color: #6C63FF; }
    .notif-icon-circle.orange { background: rgba(245,158,11,0.1); }
    .notif-icon-circle.orange mat-icon { color: #F59E0B; }
    .notif-icon-circle.green  { background: rgba(34,197,94,0.1); }
    .notif-icon-circle.green mat-icon { color: #22C55E; }
    .notif-icon-circle.pink   { background: rgba(245,163,147,0.12); }
    .notif-icon-circle.pink mat-icon { color: #F5A393; }

    .notif-body { flex: 1; min-width: 0; }
    .notif-message {
      margin: 0 0 3px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #222;
      line-height: 1.35;
      white-space: normal;
    }
    .notif-time {
      font-size: 0.75rem;
      color: #999;
    }

    .notif-empty {
      text-align: center;
      padding: 28px 20px;
      color: #bbb;
    }
    .notif-empty mat-icon {
      font-size: 38px;
      width: 38px;
      height: 38px;
      display: block;
      margin: 0 auto 8px;
      color: #ddd;
    }
    .notif-empty p { margin: 0; font-size: 0.83rem; }

    .notif-footer {
      text-align: center;
      padding: 13px;
      color: #999;
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: color 0.15s;
    }
    .notif-footer:hover { color: #F5A393; }
  `]
})
export class NotificationListComponent implements OnInit, OnChanges {
  @Input() notifications: Notification[] = [];
  @Input() showHeader: boolean = true;
  @Input() expandedMode: boolean = false;
  @Output() notificationRead = new EventEmitter<void>();
  @Output() notificationClicked = new EventEmitter<Notification>();

  unreadList: Notification[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.refreshUnreadList();
  }

  ngOnChanges(): void {
    this.refreshUnreadList();
  }

  private refreshUnreadList(): void {
    this.unreadList = this.notifications.filter(n => !n.vue);
  }

  markAsRead(notification: Notification): void {
    this.notificationService.markAsRead(notification.id).subscribe(() => {
      notification.vue = true;
      this.unreadList = this.unreadList.filter(n => n.id !== notification.id);
      this.notificationRead.emit();
      this.notificationClicked.emit(notification);
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.vue = true);
      this.unreadList = [];
      this.notificationRead.emit();
    });
  }

  getNotificationIcon(notification: Notification): string {
    const msg = notification.message.toLowerCase();
    if (msg.includes('annul')) return 'cancel';
    if (msg.includes('termin')) return 'check_circle';
    if (msg.includes('réservation') || msg.includes('reservation')) return 'event';
    if (msg.includes('message')) return 'chat_bubble';
    if (msg.includes('offre') || msg.includes('emploi')) return 'work';
    if (msg.includes('rappel')) return 'schedule';
    return 'notifications';
  }

  getIconColor(notification: Notification): string {
    const msg = notification.message.toLowerCase();
    if (msg.includes('réservation') || msg.includes('reservation')) return 'blue';
    if (msg.includes('message')) return 'orange';
    if (msg.includes('offre') || msg.includes('emploi') || msg.includes('termin')) return 'green';
    if (msg.includes('annul')) return 'orange';
    return 'pink';
  }

  timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins}m`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }
}