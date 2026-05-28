import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectionsService, BankConnection } from '../../core/services/connections.service';
import { PlaidService } from '../../core/services/plaid.service';

@Component({
  selector: 'app-connections',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './connections.html',
  styleUrl: './connections.scss',
})
export class Connections implements OnInit {
  connections: BankConnection[] = [];
  isLoading = false;

  constructor(
    private connectionsService: ConnectionsService,
    private plaidService: PlaidService
  ) {}

  ngOnInit() {
    this.loadConnections();
  }

  loadConnections() {
    this.isLoading = true;
    this.connectionsService.getConnections().subscribe((data) => {
      this.connections = data;
      this.isLoading = false;
    });
  }

  connectBank() {
    this.plaidService.openLink(() => {
      // Refresh list on success
      this.loadConnections();
    });
  }

  deleteConnection(id: string) {
    if (confirm('Are you sure you want to disconnect this bank account? All synced transactions will be kept but no new ones will be synced.')) {
      this.connectionsService.deleteConnection(id).subscribe(() => {
        this.loadConnections();
      });
    }
  }
}
