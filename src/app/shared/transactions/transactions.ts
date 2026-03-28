import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { TransactionService, TransactionRange } from '../../services/transaction';

@Component({
  selector: 'os-transactions',
  imports: [CurrencyPipe],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Transactions implements OnInit {
  readonly txService = inject(TransactionService);

  readonly rangeOptions: { label: string; value: TransactionRange }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'this_week' },
    { label: 'All', value: 'all' },
  ];

  ngOnInit(): void {
    this.txService.loadTransactions();
  }

  setRange(range: TransactionRange): void {
    this.txService.setFilter({ range });
  }
}
