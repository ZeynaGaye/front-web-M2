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
    <div class="notification-list" [class.expanded-mode]="expandedMode">
      <div class="notification-header" *ngIf="showHeader">
        <h3>Notifications</h3>
        <button mat-icon-button (click)="markAllAsRead()" *ngIf="hasUnreadNotifications">
          <mat-icon>done_all</mat-icon>
        </button>
      </div>
      
      <mat-list *ngIf="notifications.length > 0; else noNotifications">
        <mat-list-item 
          *ngFor="let notification of notifications" 
          class="notification-item"
          [class.unread]="!notification.vue"
          (click)="markAsRead(notification)">
          
          <mat-icon matListItemIcon [color]="!notification.vue ? 'primary' : 'warn'">
            {{ getNotificationIcon(notification) }}
          </mat-icon>
          
          <div matListItemTitle class="notification-message">
            {{ notification.message }}
          </div>
          
          <div matListItemLine class="notification-date">
            {{ formatDate(notification.dateNotif) }}
          </div>
          
          <div matListItemMeta *ngIf="!notification.vue">
            <mat-icon class="unread-indicator" color="primary">fiber_manual_record</mat-icon>
          </div>
        </mat-list-item>
        <mat-divider></mat-divider>
      </mat-list>
      
      <ng-template #noNotifications>
        <div class="no-notifications">
          <mat-icon>notifications_none</mat-icon>
          <p>Aucune notification</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .notification-list {
      width: 100%;
      max-width: 400px;
    }
    
    .notification-list.expanded-mode {
      max-width: none;
      width: 100%;
    }
    
    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .notification-header h3 {
      margin: 0;
      font-weight: 500;
    }
    
    .notification-item {
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .notification-item:hover {
      background-color: #f5f5f5;
    }
    
    .notification-item.unread {
      background-color: #e8f4fd;
    }
    
    .notification-message {
      font-weight: 500;
      color: #333;
    }
    
    .notification-date {
      color: #666;
      font-size: 0.85em;
    }
    
    .unread-indicator {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }
    
    .no-notifications {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }
    
    .no-notifications mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }
  `]
})
export class NotificationListComponent implements OnInit, OnChanges {
  @Input() notifications: Notification[] = [];
  @Input() showHeader: boolean = true;
  @Input() expandedMode: boolean = false;
  @Output() notificationRead = new EventEmitter<void>();

  hasUnreadNotifications = false;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.checkUnreadNotifications();
  }

  ngOnChanges(): void {
    this.checkUnreadNotifications();
  }

  private checkUnreadNotifications(): void {
    this.hasUnreadNotifications = this.notifications.some(n => !n.vue);
  }

  markAsRead(notification: Notification): void {
    if (!notification.vue) {
      this.notificationService.markAsRead(notification.id).subscribe(() => {
        notification.vue = true;
        this.checkUnreadNotifications();
        this.notificationRead.emit();
      });
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.vue = true);
      this.checkUnreadNotifications();
      this.notificationRead.emit();
    });
  }

  getNotificationIcon(notification: Notification): string {
    if (notification.message.includes('annulée')) {
      return 'cancel';
    } else if (notification.message.includes('terminée')) {
      return 'check_circle';
    } else if (notification.message.includes('Nouvelle')) {
      return 'event';
    } else if (notification.message.includes('Rappel')) {
      return 'schedule';
    }
    return 'notifications';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Aujourd\'hui';
    } else if (diffDays === 2) {
      return 'Hier';
    } else if (diffDays <= 7) {
      return `Il y a ${diffDays - 1} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }
}