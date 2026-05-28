import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiptService, ScanResult } from '../../core/services/receipt.service';

@Component({
  selector: 'app-receipts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './receipts.html',
  styleUrl: './receipts.scss',
})
export class Receipts {
  isScanning = false;
  scanResult: ScanResult | null = null;
  selectedFileName = '';

  constructor(private receiptService: ReceiptService) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name;
      this.scanFile(file);
    }
  }

  scanFile(file: File) {
    this.isScanning = true;
    this.scanResult = null;
    
    this.receiptService.scanReceipt(file).subscribe(result => {
      this.isScanning = false;
      if (result) {
        this.scanResult = result;
      }
    });
  }

  resetScan() {
    this.scanResult = null;
    this.selectedFileName = '';
  }
}
