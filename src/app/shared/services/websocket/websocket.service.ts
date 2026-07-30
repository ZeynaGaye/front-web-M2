import { Injectable, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private client: Client | null = null;
  private notificationSubject = new Subject<any>();
  private connected = false;
  private isBrowser: boolean;

  public notification$ = this.notificationSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  connect(userId: string, token: string): void {
    if (!this.isBrowser || this.connected) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8081/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        this.connected = true;
        // S'abonner aux notifications de cet utilisateur
        this.client!.subscribe(
          `/user/${userId}/queue/notifications`,
          (message: IMessage) => {
            try {
              const notification = JSON.parse(message.body);
              this.notificationSubject.next(notification);
            } catch (e) {
              console.error('Erreur parsing notification WS:', e);
            }
          }
        );
      },
      onDisconnect: () => {
        this.connected = false;
      },
      onStompError: (frame) => {
        console.error('Erreur STOMP:', frame);
      }
    });

    this.client.activate();
  }

  disconnect(): void {
    if (this.client && this.connected) {
      this.client.deactivate();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
