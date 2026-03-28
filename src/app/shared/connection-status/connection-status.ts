import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { SocketService } from '../../services/socket';

@Component({
  selector: 'os-connection-status',
  imports: [],
  templateUrl: './connection-status.html',
  styleUrl: './connection-status.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionStatus {
  private readonly socketService = inject(SocketService);

  readonly connectionStatus = this.socketService.connectionStatus;
  readonly isConnected = this.socketService.isConnected;
  readonly isPolling = this.socketService.isPolling;
}
