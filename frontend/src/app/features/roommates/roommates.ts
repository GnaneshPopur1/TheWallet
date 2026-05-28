import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoommateService, GroupData, SharedExpense } from '../../core/services/roommate.service';

@Component({
  selector: 'app-roommates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roommates.html',
  styleUrl: './roommates.scss',
})
export class Roommates implements OnInit {
  groupData: GroupData | null = null;
  expenses: SharedExpense[] = [];
  isLoading = false;

  // New Expense form
  showAddExpenseModal = false;
  newExpenseAmount: number | null = null;
  newExpenseDescription = '';
  isAddingExpense = false;

  constructor(private roommateService: RoommateService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.roommateService.getGroupData().subscribe(data => {
      this.groupData = data;
      
      this.roommateService.getRecentExpenses().subscribe(expenses => {
        this.expenses = expenses;
        this.isLoading = false;
      });
    });
  }

  openAddExpense() {
    this.showAddExpenseModal = true;
  }

  closeAddExpense() {
    this.showAddExpenseModal = false;
    this.newExpenseAmount = null;
    this.newExpenseDescription = '';
  }

  submitExpense() {
    if (!this.newExpenseAmount || !this.newExpenseDescription) return;
    this.isAddingExpense = true;

    this.roommateService.addExpense(this.newExpenseAmount, this.newExpenseDescription).subscribe(() => {
      this.isAddingExpense = false;
      this.closeAddExpense();
      this.loadData();
    });
  }

  settleUp(splitId: string) {
    if (confirm('Are you sure you want to mark this split as settled?')) {
      this.roommateService.settleSplit(splitId).subscribe(() => {
        this.loadData();
      });
    }
  }
}
